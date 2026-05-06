import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../index";
import { randomToken } from "../../lib/crypto";
import { logAudit } from "../../lib/audit";
import { pushLeadToHubSpot } from "../../lib/hubspot";
import { getDb } from "../../db/client";
import { leads as leadsTable } from "../../db/schema";
import { eq } from "drizzle-orm";

const SOURCE = "sofia-chatbot";

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
  .post("/", zValidator("json", sofiaLeadSchema), async (c) => {
    const body = c.req.valid("json");
    const db   = getDb(c.env);
    const now  = ts();

    const [existing] = await db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(eq(leadsTable.email, body.email))
      .limit(1);

    if (existing) {
      return c.json({ status: "duplicate", id: existing.id }, 200);
    }

    const id = randomToken(16);
    try {
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
        return c.json({ status: "duplicate" }, 200);
      }
      throw e;
    }

    const ctx = c.executionCtx;
    ctx.waitUntil(
      pushLeadToHubSpot(c.env, {
        email:  body.email,
        name:   body.name,
        phone:  body.phone,
        source: SOURCE,
      })
    );

    ctx.waitUntil(
      logAudit(c.env, {
        action:    "webhook.sofia_lead.capture",
        resource:  `lead:${id}`,
        ip:        c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For"),
        userAgent: c.req.header("User-Agent"),
        meta: {
          email:       body.email,
          utmSource:   body.utmSource,
          utmCampaign: body.utmCampaign,
        },
      })
    );

    return c.json({ status: "captured", id }, 201);
  });
