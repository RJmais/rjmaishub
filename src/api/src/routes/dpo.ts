import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { randomToken } from "../lib/crypto";
import { clientIp } from "../middleware/rateLimit";
import { sendEmail } from "../lib/email";
import { getDb } from "../db/client";
import { dpoRequests } from "../db/schema";

const contactSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(5000),
});

export const dpo = new Hono<{
  Bindings: Env;
  Variables: { user: any; userId: string };
}>()
  .use("*", requireAuth)

  .post("/contact", zValidator("json", contactSchema), async (c) => {
    const user = c.var.user;
    const ip = clientIp(c);
    const ua = c.req.header("user-agent") ?? "";
    const body = c.req.valid("json");
    const id = randomToken(16);
    const now = Math.floor(Date.now() / 1000);

    const db = getDb(c.env);
    await db.insert(dpoRequests).values({
      id,
      userId: user.id,
      subject: body.subject,
      message: body.message,
      status: "open",
      createdAt: now,
    });

    await logAudit(c.env, {
      userId: user.id,
      action: "dpo.contact",
      resource: `dpo:${id}`,
      ip,
      userAgent: ua,
    });

    // Notifica DPO por email (best effort, não bloqueia resposta)
    sendEmail(c.env.RESEND_API_KEY, {
      to: "dpo@rjmais.com",
      subject: `[DPO][${id}] ${body.subject}`,
      replyTo: user.email,
      html: `
        <h2>Solicitação ao DPO</h2>
        <p><strong>ID:</strong> ${id}</p>
        <p><strong>Cliente:</strong> ${user.name} &lt;${user.email}&gt;</p>
        <p><strong>IP:</strong> ${ip}</p>
        <p><strong>Assunto:</strong> ${body.subject}</p>
        <hr/>
        <pre style="white-space:pre-wrap;font-family:monospace;background:#f5f5f5;padding:12px;border-radius:6px;">${body.message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")}</pre>
      `,
    }).catch((e) => console.error("dpo email error", e));

    return c.json(
      {
        id,
        status: "open",
        message: "Recebemos sua solicitação. O DPO responde em até 15 dias úteis.",
      },
      201
    );
  });
