import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { randomToken } from "../lib/crypto";
import { logAudit } from "../lib/audit";
import { sendEmail } from "../lib/email";

const createSchema = z.object({
  inviteeEmail: z.string().email().toLowerCase(),
  message: z.string().max(500).optional(),
});

const ts = () => Math.floor(Date.now() / 1000);

export const referrals = new Hono<{
  Bindings: Env;
  Variables: { user: any; userId: string };
}>()
  .use("*", requireAuth)

  .post("/", zValidator("json", createSchema), async (c) => {
    const user = c.var.user;
    const body = c.req.valid("json");

    const dup = await c.env.DB.prepare(
      `SELECT id FROM referrals WHERE referrer_id = ? AND invitee_email = ? AND status = 'pending'`
    )
      .bind(user.id, body.inviteeEmail)
      .first();
    if (dup) return c.json({ error: "already_invited" }, 409);

    const id = randomToken(16);
    const now = ts();
    await c.env.DB.prepare(
      `INSERT INTO referrals (id, referrer_id, invitee_email, status, reward_status, created_at)
       VALUES (?, ?, ?, 'pending', 'none', ?)`
    )
      .bind(id, user.id, body.inviteeEmail, now)
      .run();

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
    const rows = await c.env.DB.prepare(
      `SELECT id, invitee_email, status, reward_status, created_at, converted_at
         FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC LIMIT 100`
    )
      .bind(user.id)
      .all();
    return c.json({ items: rows.results ?? [] });
  });
