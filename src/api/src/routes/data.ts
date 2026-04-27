import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { clientIp } from "../middleware/rateLimit";
import { revokeUserSessions } from "../lib/session";
import JSZip from "jszip";

const correctSchema = z.object({
  field: z.enum(["name", "phone"]),
  value: z.string().min(1).max(200),
});

const ts = () => Math.floor(Date.now() / 1000);

export const data = new Hono<{
  Bindings: Env;
  Variables: { user: any; userId: string };
}>()
  .use("*", requireAuth)

  /** Exporta todos os dados do user em ZIP (LGPD Art. 18 V — portabilidade). */
  .get("/export", async (c) => {
    const userId = c.var.userId;
    const ip = clientIp(c);
    const ua = c.req.header("user-agent") ?? "";

    const [user, profile, chatMessages, consents, audit, referrals, rsvps] =
      await Promise.all([
        c.env.DB.prepare(
          "SELECT id, email, email_verified, name, tier, status, created_at FROM users WHERE id = ?"
        )
          .bind(userId)
          .first(),
        c.env.DB.prepare(
          "SELECT phone, language, timezone, marketing_opt_in FROM user_profiles WHERE user_id = ?"
        )
          .bind(userId)
          .first(),
        c.env.DB.prepare(
          "SELECT id, assistant, role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC"
        )
          .bind(userId)
          .all(),
        c.env.DB.prepare(
          "SELECT id, category, status, policy_version, granted_at, revoked_at FROM user_consents WHERE user_id = ? ORDER BY granted_at DESC"
        )
          .bind(userId)
          .all(),
        c.env.DB.prepare(
          "SELECT id, action, resource, created_at FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 1000"
        )
          .bind(userId)
          .all(),
        c.env.DB.prepare(
          "SELECT id, invitee_email, status, created_at, converted_at FROM referrals WHERE referrer_id = ?"
        )
          .bind(userId)
          .all(),
        c.env.DB.prepare(
          "SELECT event_slug, status, created_at FROM events_rsvp WHERE user_id = ?"
        )
          .bind(userId)
          .all(),
      ]);

    if (!user) return c.json({ error: "user_not_found" }, 404);

    const zip = new JSZip();
    zip.file(
      "README.txt",
      `Exportação de dados RJ+ Hub\nUser ID: ${userId}\nGerada em: ${new Date().toISOString()}\nLGPD Art. 18, V.`
    );
    zip.file("perfil.json", JSON.stringify({ user, profile }, null, 2));
    zip.file("conversas.json", JSON.stringify(chatMessages.results ?? [], null, 2));
    zip.file("consentimentos.json", JSON.stringify(consents.results ?? [], null, 2));
    zip.file("audit_log.json", JSON.stringify(audit.results ?? [], null, 2));
    zip.file("indicacoes.json", JSON.stringify(referrals.results ?? [], null, 2));
    zip.file("eventos_rsvp.json", JSON.stringify(rsvps.results ?? [], null, 2));

    await logAudit(c.env, {
      userId,
      action: "data.export",
      ip,
      userAgent: ua,
    });

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    return new Response(buffer, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="rjmaishub-meus-dados.zip"`,
      },
    });
  })

  /** Solicita exclusão da conta (LGPD Art. 18 VI). Hard delete em 30d via cron. */
  .post("/delete", async (c) => {
    const userId = c.var.userId;
    const ip = clientIp(c);
    const ua = c.req.header("user-agent") ?? "";
    const now = ts();
    const purgeAt = now + 30 * 86400;

    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE users
            SET status = 'deleted',
                deleted_at = ?,
                pending_deletion_at = ?,
                email = 'deleted-' || id || '@anonymized.local',
                name = '[anonymized]',
                updated_at = ?
          WHERE id = ?`
      ).bind(now, purgeAt, now, userId),
      c.env.DB.prepare(
        `UPDATE chat_messages SET content = '[anonymized]', anonymized = 1 WHERE user_id = ?`
      ).bind(userId),
    ]);

    await revokeUserSessions(c.env, userId);

    await logAudit(c.env, {
      userId,
      action: "data.delete.requested",
      ip,
      userAgent: ua,
      meta: { hardDeleteAt: purgeAt },
    });

    return c.json(
      {
        status: "scheduled",
        message:
          "Sua conta foi marcada para exclusão. Hard delete em 30 dias. Para reverter, contate dpo@rjmais.com.",
      },
      202
    );
  })

  /** Correção de dados pessoais (LGPD Art. 18 III). Email só via fluxo seguro à parte. */
  .post("/correct", zValidator("json", correctSchema), async (c) => {
    const userId = c.var.userId;
    const ip = clientIp(c);
    const ua = c.req.header("user-agent") ?? "";
    const { field, value } = c.req.valid("json");
    const now = ts();

    if (field === "name") {
      await c.env.DB.prepare(`UPDATE users SET name = ?, updated_at = ? WHERE id = ?`)
        .bind(value, now, userId)
        .run();
    } else {
      await c.env.DB.prepare(
        `UPDATE user_profiles SET phone = ?, updated_at = ? WHERE user_id = ?`
      )
        .bind(value, now, userId)
        .run();
    }

    await logAudit(c.env, {
      userId,
      action: "data.correct",
      resource: `field:${field}`,
      ip,
      userAgent: ua,
    });

    return c.json({ field, updated: true });
  });
