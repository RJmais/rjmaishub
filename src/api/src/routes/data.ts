import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { clientIp } from "../middleware/rateLimit";
import { revokeUserSessions } from "../lib/session";
import JSZip from "jszip";
import { getDb } from "../db/client";
import {
  users,
  userProfiles,
  chatMessages,
  userConsents,
  auditLog,
  referrals as referralsTable,
  eventsRsvp,
} from "../db/schema";
import { eq, desc } from "drizzle-orm";

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
    const db = getDb(c.env);

    const [
      userRow,
      profileRow,
      chatMsgRows,
      consentsRows,
      auditRows,
      referralRows,
      rsvpRows,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
          name: users.name,
          tier: users.tier,
          status: users.status,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({
          phone: userProfiles.phone,
          language: userProfiles.language,
          timezone: userProfiles.timezone,
          marketingOptIn: userProfiles.marketingOptIn,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1)
        .then((r) => r[0] ?? null),
      db
        .select({
          id: chatMessages.id,
          assistant: chatMessages.assistant,
          role: chatMessages.role,
          content: chatMessages.content,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(desc(chatMessages.createdAt)),
      db
        .select({
          id: userConsents.id,
          category: userConsents.category,
          status: userConsents.status,
          policyVersion: userConsents.policyVersion,
          grantedAt: userConsents.grantedAt,
          revokedAt: userConsents.revokedAt,
        })
        .from(userConsents)
        .where(eq(userConsents.userId, userId))
        .orderBy(desc(userConsents.grantedAt)),
      db
        .select({
          id: auditLog.id,
          action: auditLog.action,
          resource: auditLog.resource,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(eq(auditLog.userId, userId))
        .orderBy(desc(auditLog.createdAt))
        .limit(1000),
      db
        .select({
          id: referralsTable.id,
          inviteeEmail: referralsTable.inviteeEmail,
          status: referralsTable.status,
          createdAt: referralsTable.createdAt,
          convertedAt: referralsTable.convertedAt,
        })
        .from(referralsTable)
        .where(eq(referralsTable.referrerId, userId)),
      db
        .select({
          eventSlug: eventsRsvp.eventSlug,
          status: eventsRsvp.status,
          createdAt: eventsRsvp.createdAt,
        })
        .from(eventsRsvp)
        .where(eq(eventsRsvp.userId, userId)),
    ]);

    if (!userRow) return c.json({ error: "user_not_found" }, 404);

    const zip = new JSZip();
    zip.file(
      "README.txt",
      `Exportação de dados RJ+ Hub\nUser ID: ${userId}\nGerada em: ${new Date().toISOString()}\nLGPD Art. 18, V.`
    );
    zip.file("perfil.json", JSON.stringify({ user: userRow, profile: profileRow }, null, 2));
    zip.file("conversas.json", JSON.stringify(chatMsgRows, null, 2));
    zip.file("consentimentos.json", JSON.stringify(consentsRows, null, 2));
    zip.file("audit_log.json", JSON.stringify(auditRows, null, 2));
    zip.file("indicacoes.json", JSON.stringify(referralRows, null, 2));
    zip.file("eventos_rsvp.json", JSON.stringify(rsvpRows, null, 2));

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
    const db = getDb(c.env);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          status: "deleted",
          deletedAt: now,
          pendingDeletionAt: purgeAt,
          email: `deleted-${userId}@anonymized.local`,
          name: "[anonymized]",
          updatedAt: now,
        })
        .where(eq(users.id, userId));
      await tx
        .update(chatMessages)
        .set({ content: "[anonymized]", anonymized: 1 })
        .where(eq(chatMessages.userId, userId));
    });

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
    const db = getDb(c.env);

    if (field === "name") {
      await db
        .update(users)
        .set({ name: value, updatedAt: now })
        .where(eq(users.id, userId));
    } else {
      await db
        .update(userProfiles)
        .set({ phone: value, updatedAt: now })
        .where(eq(userProfiles.userId, userId));
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
