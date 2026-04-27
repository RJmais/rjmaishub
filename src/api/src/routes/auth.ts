import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { rateLimit, clientIp } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import {
  hashPassword,
  verifyPassword,
  randomToken,
  hashToken,
} from "../lib/crypto";
import {
  createSession,
  revokeSession,
  revokeUserSessions,
  buildSessionCookie,
  clearSessionCookie,
  sessionCookieName,
} from "../lib/session";
import { logAudit } from "../lib/audit";
import { verifyTurnstileToken } from "../lib/turnstile";
import { sendEmail, emailTemplates } from "../lib/email";
import {
  generateTotpSecret,
  buildTotpUri,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
} from "../lib/totp";

/* ─────────────── schemas ─────────────── */
const signupSchema = z.object({
  email: z.string().email().toLowerCase().max(254),
  password: z.string().min(12).max(128),
  name: z.string().min(2).max(120),
  phone: z.string().max(40).optional(),
  consents: z.object({
    privacy: z.literal(true),
    terms: z.literal(true),
    aiChat: z.boolean().default(false),
    marketing: z.boolean().default(false),
  }),
  turnstileToken: z.string().min(10),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  turnstileToken: z.string().min(10),
});

const login2faSchema = z.object({
  tempToken: z.string().min(10),
  code: z.string().regex(/^\d{6}$|^[A-F0-9]{4}-[A-F0-9]{4}$/i),
});

const forgotSchema = z.object({
  email: z.string().email().toLowerCase(),
  turnstileToken: z.string().min(10),
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(12).max(128),
});

const enable2faSchema = z.object({});
const confirm2faSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
const disable2faSchema = z.object({
  password: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

const ts = () => Math.floor(Date.now() / 1000);

export const auth = new Hono<{ Bindings: Env; Variables: { user: any; userId: string } }>()

  /* ─────── POST /signup ─────── */
  .post("/signup", zValidator("json", signupSchema), async (c) => {
    const ip = clientIp(c);
    const ua = c.req.header("User-Agent") ?? "";
    const ok = await rateLimit(c, `signup:${ip}`, 3, 3600);
    if (!ok) return c.json({ error: "rate_limited" }, 429);

    const body = c.req.valid("json");

    const turnstileOk = await verifyTurnstileToken(
      body.turnstileToken,
      c.env.TURNSTILE_SECRET,
      ip
    );
    if (!turnstileOk) {
      await logAudit(c.env, { action: "auth.signup.turnstile_failed", ip, userAgent: ua });
      return c.json({ error: "verification_failed" }, 400);
    }

    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
      .bind(body.email)
      .first();
    if (existing) {
      // Mensagem genérica anti-enumeração
      return c.json({ status: "ok", message: "Cadastro recebido. Verifique seu email." });
    }

    const userId = randomToken(16);
    const passwordHash = await hashPassword(body.password);
    const now = ts();

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO users (id, email, email_verified, name, password_hash, tier, status, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?, 'cliente', 'active', ?, ?)`
      ).bind(userId, body.email, body.name, passwordHash, now, now),
      c.env.DB.prepare(
        `INSERT INTO user_profiles (user_id, phone, language, timezone, marketing_opt_in, updated_at)
         VALUES (?, ?, 'pt-BR', 'America/Sao_Paulo', ?, ?)`
      ).bind(userId, body.phone ?? null, body.consents.marketing ? 1 : 0, now),
      // 4 consentimentos
      c.env.DB.prepare(
        `INSERT INTO user_consents (id, user_id, policy_version, granted_at, ip, user_agent, category, status)
         VALUES (?, ?, 'priv-2026-04', ?, ?, ?, 'privacy', 'granted')`
      ).bind(randomToken(16), userId, now, ip, ua),
      c.env.DB.prepare(
        `INSERT INTO user_consents (id, user_id, policy_version, granted_at, ip, user_agent, category, status)
         VALUES (?, ?, 'terms-2026-04', ?, ?, ?, 'terms', 'granted')`
      ).bind(randomToken(16), userId, now, ip, ua),
      c.env.DB.prepare(
        `INSERT INTO user_consents (id, user_id, policy_version, granted_at, ip, user_agent, category, status)
         VALUES (?, ?, 'ai-chat-2026-04', ?, ?, ?, 'ai_chat', ?)`
      ).bind(
        randomToken(16),
        userId,
        now,
        ip,
        ua,
        body.consents.aiChat ? "granted" : "revoked"
      ),
      c.env.DB.prepare(
        `INSERT INTO user_consents (id, user_id, policy_version, granted_at, ip, user_agent, category, status)
         VALUES (?, ?, 'marketing-2026-04', ?, ?, ?, 'marketing', ?)`
      ).bind(
        randomToken(16),
        userId,
        now,
        ip,
        ua,
        body.consents.marketing ? "granted" : "revoked"
      ),
    ]);

    // Email verify token
    const verifyToken = randomToken(32);
    const verifyTokenHash = await hashToken(verifyToken);
    await c.env.DB.prepare(
      `INSERT INTO email_verify_tokens (id, user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(randomToken(16), userId, verifyTokenHash, now + 24 * 3600, now)
      .run();

    const verifyLink = `${c.env.APP_URL}/verificar-email/${verifyToken}`;
    await sendEmail(c.env.RESEND_API_KEY, {
      to: body.email,
      subject: "Confirme seu email no RJ+ Hub",
      html: emailTemplates.verifyEmail(body.name, verifyLink),
    });

    await logAudit(c.env, {
      userId,
      action: "auth.signup.success",
      ip,
      userAgent: ua,
      meta: { aiChat: body.consents.aiChat, marketing: body.consents.marketing },
    });

    return c.json({ status: "ok", message: "Cadastro recebido. Verifique seu email." });
  })

  /* ─────── POST /verify-email/:token ─────── */
  .post("/verify-email/:token", async (c) => {
    const token = c.req.param("token");
    if (!token) return c.json({ error: "invalid_token" }, 400);
    const tokenHash = await hashToken(token);
    const row = await c.env.DB.prepare(
      `SELECT user_id, expires_at, used_at FROM email_verify_tokens WHERE token_hash = ?`
    )
      .bind(tokenHash)
      .first<{ user_id: string; expires_at: number; used_at: number | null }>();
    if (!row || row.used_at || row.expires_at < ts()) {
      return c.json({ error: "invalid_token" }, 400);
    }
    const now = ts();
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?`).bind(
        now,
        row.user_id
      ),
      c.env.DB.prepare(`UPDATE email_verify_tokens SET used_at = ? WHERE token_hash = ?`).bind(
        now,
        tokenHash
      ),
    ]);
    await logAudit(c.env, { userId: row.user_id, action: "auth.email_verified" });
    return c.json({ status: "ok" });
  })

  /* ─────── POST /login ─────── */
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const ip = clientIp(c);
    const ua = c.req.header("User-Agent") ?? "";
    const ok = await rateLimit(c, `login:${ip}`, 5, 60);
    if (!ok) return c.json({ error: "rate_limited" }, 429);

    const body = c.req.valid("json");

    const turnstileOk = await verifyTurnstileToken(
      body.turnstileToken,
      c.env.TURNSTILE_SECRET,
      ip
    );
    if (!turnstileOk) return c.json({ error: "verification_failed" }, 400);

    const user = await c.env.DB.prepare(
      `SELECT id, email, name, password_hash, totp_secret, status, tier
         FROM users WHERE email = ? LIMIT 1`
    )
      .bind(body.email)
      .first<{
        id: string;
        email: string;
        name: string;
        password_hash: string | null;
        totp_secret: string | null;
        status: string;
        tier: string;
      }>();

    // Mensagem genérica anti-enumeração + anti-timing (sempre roda hash)
    const dummy =
      "100000$0000000000000000000000000000000000000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";
    const valid =
      user && user.password_hash
        ? await verifyPassword(body.password, user.password_hash)
        : await verifyPassword(body.password, dummy).then(() => false);

    if (!user || !valid || user.status !== "active") {
      await logAudit(c.env, {
        userId: user?.id,
        action: "auth.login.failure",
        ip,
        userAgent: ua,
      });
      return c.json({ error: "invalid_credentials" }, 401);
    }

    // 2FA? Bind do tempToken ao IP original — se o IP mudar até o /login/2fa,
    // rejeitamos (anti-MITM, anti-cookie-relay).
    if (user.totp_secret) {
      const tempToken = randomToken(32);
      await c.env.SESSIONS.put(
        `2fa:${tempToken}`,
        JSON.stringify({ userId: user.id, ip }),
        { expirationTtl: 300 }
      );
      return c.json({ needs2fa: true, tempToken });
    }

    const sessionId = await createSession(c.env, user.id, user.email, user.tier, ip, ua);
    await logAudit(c.env, { userId: user.id, action: "auth.login.success", ip, userAgent: ua });

    return new Response(
      JSON.stringify({
        user: { id: user.id, email: user.email, name: user.name, tier: user.tier },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": buildSessionCookie(sessionId),
        },
      }
    );
  })

  /* ─────── POST /login/2fa ─────── */
  .post("/login/2fa", zValidator("json", login2faSchema), async (c) => {
    const ip = clientIp(c);
    const ua = c.req.header("User-Agent") ?? "";
    const body = c.req.valid("json");
    const stored = await c.env.SESSIONS.get(`2fa:${body.tempToken}`);
    if (!stored) return c.json({ error: "invalid_token" }, 401);
    let parsed: { userId: string; ip: string };
    try {
      parsed = JSON.parse(stored);
    } catch {
      return c.json({ error: "invalid_token" }, 401);
    }
    // Anti-relay: IP precisa bater com o do /login original
    if (parsed.ip !== ip) {
      await c.env.SESSIONS.delete(`2fa:${body.tempToken}`);
      await logAudit(c.env, {
        userId: parsed.userId,
        action: "auth.2fa.ip_mismatch",
        ip,
        userAgent: ua,
        meta: { originalIp: parsed.ip },
      });
      return c.json({ error: "invalid_token" }, 401);
    }

    const user = await c.env.DB.prepare(
      `SELECT id, email, name, totp_secret, tier FROM users WHERE id = ? LIMIT 1`
    )
      .bind(parsed.userId)
      .first<{ id: string; email: string; name: string; totp_secret: string; tier: string }>();
    if (!user || !user.totp_secret) return c.json({ error: "invalid_token" }, 401);

    let valid = false;
    if (/^\d{6}$/.test(body.code)) {
      valid = await verifyTotpCode(user.totp_secret, body.code);
    } else {
      // backup code
      const codeHash = await hashBackupCode(body.code);
      const backup = await c.env.DB.prepare(
        `SELECT id FROM totp_backup_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL LIMIT 1`
      )
        .bind(user.id, codeHash)
        .first<{ id: string }>();
      if (backup) {
        await c.env.DB.prepare(`UPDATE totp_backup_codes SET used_at = ? WHERE id = ?`)
          .bind(ts(), backup.id)
          .run();
        valid = true;
      }
    }

    if (!valid) {
      await logAudit(c.env, {
        userId: user.id,
        action: "auth.2fa.failure",
        ip,
        userAgent: ua,
      });
      return c.json({ error: "invalid_code" }, 401);
    }

    await c.env.SESSIONS.delete(`2fa:${body.tempToken}`);
    const sessionId = await createSession(c.env, user.id, user.email, user.tier, ip, ua);
    await logAudit(c.env, { userId: user.id, action: "auth.login.2fa_success", ip, userAgent: ua });

    return new Response(
      JSON.stringify({
        user: { id: user.id, email: user.email, name: user.name, tier: user.tier },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": buildSessionCookie(sessionId),
        },
      }
    );
  })

  /* ─────── POST /logout ─────── */
  .post("/logout", async (c) => {
    const cookie = c.req.header("Cookie") ?? "";
    const m = cookie.match(new RegExp(`${sessionCookieName}=([^;]+)`));
    if (m) {
      await revokeSession(c.env, m[1]!);
    }
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      },
    });
  })

  /* ─────── GET /me ─────── */
  .get("/me", requireAuth, (c) => {
    return c.json({ user: c.var.user });
  })

  /* ─────── POST /forgot-password ─────── */
  .post("/forgot-password", zValidator("json", forgotSchema), async (c) => {
    const ip = clientIp(c);
    const ok = await rateLimit(c, `forgot:${ip}`, 3, 3600);
    if (!ok) return c.json({ error: "rate_limited" }, 429);

    const body = c.req.valid("json");
    const turnstileOk = await verifyTurnstileToken(
      body.turnstileToken,
      c.env.TURNSTILE_SECRET,
      ip
    );
    if (!turnstileOk) return c.json({ error: "verification_failed" }, 400);

    const user = await c.env.DB.prepare(
      `SELECT id, name, email FROM users WHERE email = ? AND status = 'active' LIMIT 1`
    )
      .bind(body.email)
      .first<{ id: string; name: string; email: string }>();

    // sempre 200 (anti-enumeration)
    if (user) {
      const token = randomToken(32);
      const tokenHash = await hashToken(token);
      const now = ts();
      await c.env.DB.prepare(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(randomToken(16), user.id, tokenHash, now + 3600, now)
        .run();
      await sendEmail(c.env.RESEND_API_KEY, {
        to: user.email,
        subject: "Redefinir sua senha — RJ+ Hub",
        html: emailTemplates.resetPassword(user.name, `${c.env.APP_URL}/redefinir-senha?token=${token}`),
      });
      await logAudit(c.env, { userId: user.id, action: "auth.forgot_password.requested", ip });
    }
    return c.json({ status: "ok" });
  })

  /* ─────── POST /reset-password ─────── */
  .post("/reset-password", zValidator("json", resetSchema), async (c) => {
    const body = c.req.valid("json");
    const tokenHash = await hashToken(body.token);
    const row = await c.env.DB.prepare(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`
    )
      .bind(tokenHash)
      .first<{ id: string; user_id: string; expires_at: number; used_at: number | null }>();
    if (!row || row.used_at || row.expires_at < ts()) {
      return c.json({ error: "invalid_token" }, 400);
    }
    const newHash = await hashPassword(body.password);
    const now = ts();
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).bind(
        newHash,
        now,
        row.user_id
      ),
      c.env.DB.prepare(`UPDATE password_reset_tokens SET used_at = ? WHERE id = ?`).bind(
        now,
        row.id
      ),
    ]);
    await revokeUserSessions(c.env, row.user_id);
    await logAudit(c.env, { userId: row.user_id, action: "auth.password_reset.success" });
    return c.json({ status: "ok" });
  })

  /* ─────── POST /2fa/enable ─────── */
  .post("/2fa/enable", requireAuth, zValidator("json", enable2faSchema), async (c) => {
    const user = c.var.user;
    const secret = generateTotpSecret();
    // Armazena secret pendente em KV (5 min) — só ativa após confirm
    await c.env.SESSIONS.put(`2fa-pending:${user.id}`, secret, { expirationTtl: 300 });
    const uri = buildTotpUri(secret, user.email);
    return c.json({ secret, otpauthUri: uri });
  })

  /* ─────── POST /2fa/confirm ─────── */
  .post("/2fa/confirm", requireAuth, zValidator("json", confirm2faSchema), async (c) => {
    const user = c.var.user;
    const secret = await c.env.SESSIONS.get(`2fa-pending:${user.id}`);
    if (!secret) return c.json({ error: "no_pending_setup" }, 400);
    const body = c.req.valid("json");
    const ok = await verifyTotpCode(secret, body.code);
    if (!ok) return c.json({ error: "invalid_code" }, 401);

    const now = ts();
    await c.env.DB.prepare(`UPDATE users SET totp_secret = ?, updated_at = ? WHERE id = ?`)
      .bind(secret, now, user.id)
      .run();
    await c.env.SESSIONS.delete(`2fa-pending:${user.id}`);

    // Gera 10 backup codes
    const codes = generateBackupCodes();
    const inserts = codes.map((code) =>
      hashBackupCode(code).then((hash) =>
        c.env.DB.prepare(
          `INSERT INTO totp_backup_codes (id, user_id, code_hash, created_at) VALUES (?, ?, ?, ?)`
        ).bind(randomToken(16), user.id, hash, now)
      )
    );
    const stmts = await Promise.all(inserts);
    await c.env.DB.batch(stmts);
    await logAudit(c.env, { userId: user.id, action: "auth.2fa.enabled" });
    return c.json({ status: "ok", backupCodes: codes });
  })

  /* ─────── POST /2fa/disable ─────── */
  .post("/2fa/disable", requireAuth, zValidator("json", disable2faSchema), async (c) => {
    const user = c.var.user;
    const body = c.req.valid("json");
    const u = await c.env.DB.prepare(
      `SELECT password_hash, totp_secret FROM users WHERE id = ?`
    )
      .bind(user.id)
      .first<{ password_hash: string; totp_secret: string }>();
    if (!u || !u.totp_secret) return c.json({ error: "no_2fa" }, 400);

    const passOk = await verifyPassword(body.password, u.password_hash);
    const codeOk = await verifyTotpCode(u.totp_secret, body.code);
    if (!passOk || !codeOk) return c.json({ error: "invalid" }, 401);

    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE users SET totp_secret = NULL, updated_at = ? WHERE id = ?`).bind(
        ts(),
        user.id
      ),
      c.env.DB.prepare(`DELETE FROM totp_backup_codes WHERE user_id = ?`).bind(user.id),
    ]);
    await logAudit(c.env, { userId: user.id, action: "auth.2fa.disabled" });
    return c.json({ status: "ok" });
  });
