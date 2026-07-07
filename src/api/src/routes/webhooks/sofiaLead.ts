import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../index";
import { randomToken, verifyWebhookSignature } from "../../lib/crypto";
import { logAudit } from "../../lib/audit";
import { pushLeadToHubSpot } from "../../lib/hubspot";
import { clientIp, rateLimit } from "../../middleware/rateLimit";
import { getDb } from "../../db/client";
import { leads as leadsTable } from "../../db/schema";
import { eq } from "drizzle-orm";

const SOURCE = "sofia-chatbot";
const RECEIVED_RESPONSE = { status: "received" } as const;

const sofiaLeadSchema = z.object({
  email:       z.string().email().toLowerCase().trim(),
  name:        z.string().max(200).optional(),
  phone:       z.string().max(30).optional(),
  message:     z.string().max(2000).optional(),
  utmSource:   z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  utmMedium:   z.string().max(100).optional(),
});

const ts = () => Math.floor(Date.now() / 1000);

export const sofiaLead = new Hono<{ Bindings: Env }>()
  .post("/", async (c) => {
    const ip = clientIp(c);
    const ua = c.req.header("User-Agent");
    const allowed = await rateLimit(c, `webhook:sofia-lead:${ip}`, 10, 60);
    if (!allowed) return c.json({ error: "rate_limited" }, 429);

    // H1 — verificação de assinatura HMAC (rollout faseado).
    // Enquanto WEBHOOK_SECRET não estiver setado, aceita não-assinado e loga aviso;
    // após o secret ser provisionado + chatbots assinarem, passa a exigir assinatura.
    const raw = await c.req.text();
    if (c.env.WEBHOOK_SECRET) {
      const sigOk = await verifyWebhookSignature(
        c.env.WEBHOOK_SECRET,
        raw,
        c.req.header("X-RJ-Signature")
      );
      if (!sigOk) {
        await logAudit(c.env, {
          action: "webhook.sofia_lead.bad_signature",
          ip,
          userAgent: ua,
        }).catch(() => {});
        return c.json({ error: "invalid_signature" }, 401);
      }
    } else {
      console.warn(
        "webhook.sofia_lead: WEBHOOK_SECRET ausente — aceitando não-assinado (rollout faseado H1)"
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const validation = sofiaLeadSchema.safeParse(parsed);
    if (!validation.success) {
      return c.json({ error: "invalid_body", issues: validation.error.issues }, 400);
    }
    const body = validation.data;

    const now = ts();
    const id  = randomToken(16);

    // Postgres em melhor esforço: indisponibilidade do banco NUNCA pode
    // derrubar a captação — o HubSpot é o destino garantido do lead e faz
    // o dedup por e-mail. (Incidente 07/07: DATABASE_URL inalcançável de
    // Workers travava a requisição inteira.)
    try {
      const db = getDb(c.env);
      const [existing] = await db
        .select({ id: leadsTable.id })
        .from(leadsTable)
        .where(eq(leadsTable.email, body.email))
        .limit(1);

      if (existing) return c.json(RECEIVED_RESPONSE, 202);

      await db.insert(leadsTable).values({
        id,
        email:       body.email,
        name:        body.name        ?? null,
        phone:       body.phone       ?? null,
        message:     body.message     ?? null,
        source:      SOURCE,
        utmSource:   body.utmSource   ?? null,
        utmCampaign: body.utmCampaign ?? null,
        utmMedium:   body.utmMedium   ?? null,
        status:      "new",
        createdAt:   now,
        updatedAt:   now,
      });
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        "code" in e &&
        (e as Error & { code: unknown }).code === "23505"
      ) {
        return c.json(RECEIVED_RESPONSE, 202);
      }
      console.error("webhook.sofia_lead.db_unavailable — seguindo só com HubSpot", e);
    }

    const ctx = c.executionCtx;
    ctx.waitUntil(
      pushLeadToHubSpot(c.env, {
        email:  body.email,
        name:   body.name,
        phone:  body.phone,
        source: SOURCE,
      }).catch((error: unknown) => {
        console.error("webhook.sofia_lead.hubspot_failed", error);
      })
    );

    ctx.waitUntil(
      logAudit(c.env, {
        action:    "webhook.sofia_lead.capture",
        resource:  `lead:${id}`,
        ip,
        userAgent: ua,
        meta: {
          source:      SOURCE,
          utmSource:   body.utmSource,
          utmCampaign: body.utmCampaign,
        },
      }).catch((error: unknown) => {
        console.error("webhook.sofia_lead.audit_failed", error);
      })
    );

    return c.json(RECEIVED_RESPONSE, 202);
  });
