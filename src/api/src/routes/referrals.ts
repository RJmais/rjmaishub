import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";
import { randomToken } from "../lib/crypto";
import { logAudit } from "../lib/audit";
import { sendEmail } from "../lib/email";
import { getDb } from "../db/client";
import { referrals as referralsTable } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const createSchema = z.object({
  inviteeEmail: z.string().email().toLowerCase(),
  message: z.string().max(500).optional(),
});

const ts = () => Math.floor(Date.now() / 1000);

export const referrals = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>()
  .use("*", requireAuth)

  .post("/", zValidator("json", createSchema), async (c) => {
    const user = c.var.user;
    const body = c.req.valid("json");
    const db = getDb(c.env);

    const [dup] = await db
      .select({ id: referralsTable.id })
      .from(referralsTable)
      .where(
        and(
          eq(referralsTable.referrerId, user.id),
          eq(referralsTable.inviteeEmail, body.inviteeEmail),
          eq(referralsTable.status, "pending")
        )
      )
      .limit(1);
    if (dup) return c.json({ error: "already_invited" }, 409);

    const id = randomToken(16);
    const now = ts();
    await db.insert(referralsTable).values({
      id,
      referrerId: user.id,
      inviteeEmail: body.inviteeEmail,
      status: "pending",
      rewardStatus: "none",
      createdAt: now,
    });

    const link = `${c.env.APP_URL}/?ref=${id}`;
    await sendEmail(c.env.RESEND_API_KEY, {
      to: body.inviteeEmail,
      subject: `${user.name} convidou você para a RJ+`,
      html: `
        <p>Olá!</p>
        <p>${user.name} convidou você para conhecer a RJ+ Assessoria de Investimentos.</p>
        ${body.message ? `<blockquote>${body.message}</blockquote>` : ""}
        <p><a href="${link}" style="display:inline-block;background:#B8923E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Conhecer RJ+</a></p>`,
    });

    await logAudit(c.env, {
      userId: user.id,
      action: "referrals.create",
      resource: `ref:${id}`,
    });

    return c.json({ id, status: "pending" }, 201);
  })

  .get("/", async (c) => {
    const user = c.var.user;
    const db = getDb(c.env);
    const rows = await db
      .select({
        id: referralsTable.id,
        inviteeEmail: referralsTable.inviteeEmail,
        status: referralsTable.status,
        rewardStatus: referralsTable.rewardStatus,
        createdAt: referralsTable.createdAt,
        convertedAt: referralsTable.convertedAt,
      })
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, user.id))
      .orderBy(desc(referralsTable.createdAt))
      .limit(100);
    return c.json({ items: rows });
  });
