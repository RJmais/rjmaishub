import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { rateLimit, clientIp } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";
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
import { getDb } from "../db/client";
import {
  users,
  userProfiles,
  userConsents,
  emailVerifyTokens,
  passwordResetTokens,
  totpBackupCodes,
} from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";

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

export const auth = new Hono<{ Bindings: Env; Variables: { user: AuthUser; userId: string } }>()

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

    const db = getDb(c.env);
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (existing) {
      // Mensagem genérica anti-enumeração
      return c.json({ status: "ok", message: "Cadastro recebido. Verifique seu email." });
    }

    const userId = randomToken(16);
    const passwordHash = await hashPassword(body.password);
    const now = ts();

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: body.email,
        emailVerified: 0,
        name: body.name,
        passwordHash,
        tier: "cliente",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(userProfiles).values({
        userId,
        phone: body.phone ?? null,
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
        marketingOptIn: body.consents.marketing ? 1 : 0,
        updatedAt: now,
      });
      // 4 consentimentos em batch
      await tx.insert(userConsents).values([
        {
          id: randomToken(16),
          userId,
          policyVersion: "priv-2026-04",
          grantedAt: now,
          ip,
          userAgent: ua,
          category: "privacy",
          status: "granted",
          revokedAt: null,
        },
        {
          id: randomToken(16),
          userId,
          policyVersion: "terms-2026-04",
          grantedAt: now,
          ip,
          userAgent: ua,
          category: "terms",
          status: "granted",
          revokedAt: null,
        },
        {
          id: randomToken(16),
          userId,
          policyVersion: "ai-chat-2026-04",
          grantedAt: now,
          ip,
          userAgent: ua,
          category: "ai_chat",
          status: body.consents.aiChat ? "granted" : "revoked",
          revokedAt: body.consents.aiChat ? null : now,
        },
        {
          id: randomToken(16),
          userId,
          policyVersion: "marketing-2026-04",
          grantedAt: now,
          ip,
          userAgent: ua,
          category: "marketing",
          status: body.consents.marketing ? "granted" : "revoked",
          revokedAt: body.consents.marketing ? null : now,
        },
      ]);
    });

    // Email verify token
    const verifyToken = randomToken(32);
    const verifyTokenHash = await hashToken(verifyToken);
    await db.insert(emailVerifyTokens).values({
      id: randomToken(16),
      userId,
      tokenHash: verifyTokenHash,
      expiresAt: now + 24 * 3600,
      createdAt: now,
    });

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
    const db = getDb(c.env);

    const [row] = await db
      .select({
        userId: emailVerifyTokens.userId,
        expiresAt: emailVerifyTokens.expiresAt,
        usedAt: emailVerifyTokens.usedAt,
      })
      .from(emailVerifyTokens)
      .where(eq(emailVerifyTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.usedAt || row.expiresAt < ts()) {
      return c.json({ error: "invalid_token" }, 400);
    }
    const now = ts();
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ emailVerified: 1, updatedAt: now })
        .where(eq(users.id, row.userId));
      await tx
        .update(emailVerifyTokens)
        .set({ usedAt: now })
        .where(eq(emailVerifyTokens.tokenHash, tokenHash));
    });
    await logAudit(c.env, { userId: row.userId, action: "auth.email_verified" });
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

    const db = getDb(c.env);
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        totpSecret: users.totpSecret,
        status: users.status,
        tier: users.tier,
      })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    // Mensagem genérica anti-enumeração + anti-timing (sempre roda hash)
    const dummy =
      "100000$0000000000000000000000000000000000000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";
    const valid =
      user && user.passwordHash
        ? await verifyPassword(body.password, user.passwordHash)
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
    if (user.totpSecret) {
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

    const db = getDb(c.env);
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        totpSecret: users.totpSecret,
        tier: users.tier,
      })
      .from(users)
      .where(eq(users.id, parsed.userId))
      .limit(1);
    if (!user || !user.totpSecret) return c.json({ error: "invalid_token" }, 401);

    let valid = false;
    if (/^\d{6}$/.test(body.code)) {
      valid = await verifyTotpCode(user.totpSecret, body.code);
    } else {
      // backup code
      const codeHash = await hashBackupCode(body.code);
      const [backup] = await db
        .select({ id: totpBackupCodes.id })
        .from(totpBackupCodes)
        .where(
          and(
            eq(totpBackupCodes.userId, user.id),
            eq(totpBackupCodes.codeHash, codeHash),
            isNull(totpBackupCodes.usedAt)
          )
        )
        .limit(1);
      if (backup) {
        await db
          .update(totpBackupCodes)
          .set({ usedAt: ts() })
          .where(eq(totpBackupCodes.id, backup.id));
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

    const db = getDb(c.env);
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(and(eq(users.email, body.email), eq(users.status, "active")))
      .limit(1);

    // sempre 200 (anti-enumeration)
    if (user) {
      const token = randomToken(32);
      const tokenHash = await hashToken(token);
      const now = ts();
      await db.insert(passwordResetTokens).values({
        id: randomToken(16),
        userId: user.id,
        tokenHash,
        expiresAt: now + 3600,
        createdAt: now,
      });
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
    const db = getDb(c.env);

    const [row] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.usedAt || row.expiresAt < ts()) {
      return c.json({ error: "invalid_token" }, 400);
    }
    const newHash = await hashPassword(body.password);
    const now = ts();
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: newHash, updatedAt: now })
        .where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.id, row.id));
    });
    await revokeUserSessions(c.env, row.userId);
    await logAudit(c.env, { userId: row.userId, action: "auth.password_reset.success" });
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
    const db = getDb(c.env);
    await db
      .update(users)
      .set({ totpSecret: secret, updatedAt: now })
      .where(eq(users.id, user.id));
    await c.env.SESSIONS.delete(`2fa-pending:${user.id}`);

    // Gera 10 backup codes — bulk insert único
    const codes = generateBackupCodes();
    const codeValues = await Promise.all(
      codes.map(async (code) => ({
        id: randomToken(16),
        userId: user.id,
        codeHash: await hashBackupCode(code),
        createdAt: now,
      }))
    );
    await db.insert(totpBackupCodes).values(codeValues);

    await logAudit(c.env, { userId: user.id, action: "auth.2fa.enabled" });
    return c.json({ status: "ok", backupCodes: codes });
  })

  /* ─────── POST /2fa/disable ─────── */
  .post("/2fa/disable", requireAuth, zValidator("json", disable2faSchema), async (c) => {
    const user = c.var.user;
    const body = c.req.valid("json");
    const db = getDb(c.env);

    const [u] = await db
      .select({ passwordHash: users.passwordHash, totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!u || !u.totpSecret) return c.json({ error: "no_2fa" }, 400);

    const passOk = await verifyPassword(body.password, u.passwordHash ?? "");
    const codeOk = await verifyTotpCode(u.totpSecret, body.code);
    if (!passOk || !codeOk) return c.json({ error: "invalid" }, 401);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ totpSecret: null, updatedAt: ts() })
        .where(eq(users.id, user.id));
      await tx
        .delete(totpBackupCodes)
        .where(eq(totpBackupCodes.userId, user.id));
    });
    await logAudit(c.env, { userId: user.id, action: "auth.2fa.disabled" });
    return c.json({ status: "ok" });
  });
