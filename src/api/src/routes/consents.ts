import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { randomToken } from "../lib/crypto";
import { clientIp } from "../middleware/rateLimit";
import { getDb } from "../db/client";
import { userConsents } from "../db/schema";
import { eq, and, isNotNull, desc } from "drizzle-orm";

const CATEGORIES = [
  "privacy",
  "terms",
  "ai_chat",
  "marketing",
  "analytics_cookies",
  "marketing_cookies",
] as const;

const CURRENT_VERSIONS: Record<(typeof CATEGORIES)[number], string> = {
  privacy: "priv-2026-04",
  terms: "terms-2026-04",
  ai_chat: "ai-chat-2026-04",
  marketing: "marketing-2026-04",
  analytics_cookies: "cookies-2026-04",
  marketing_cookies: "cookies-2026-04",
};

const upsertSchema = z.object({
  category: z.enum(CATEGORIES),
  status: z.enum(["granted", "revoked"]),
});

interface ConsentRow {
  category: string | null;
  status: string;
  grantedAt: number;
  revokedAt: number | null;
  policyVersion: string;
}

export const consents = new Hono<{
  Bindings: Env;
  Variables: { user: any; userId: string };
}>()
  .use("*", requireAuth)

  /** Estado atual por categoria — uma linha por categoria (mais recente). */
  .get("/", async (c) => {
    const userId = c.var.userId;
    const db = getDb(c.env);
    const rows = await db
      .select({
        category: userConsents.category,
        status: userConsents.status,
        grantedAt: userConsents.grantedAt,
        revokedAt: userConsents.revokedAt,
        policyVersion: userConsents.policyVersion,
      })
      .from(userConsents)
      .where(and(eq(userConsents.userId, userId), isNotNull(userConsents.category)))
      .orderBy(desc(userConsents.grantedAt));

    const seen = new Set<string>();
    const items: ConsentRow[] = [];
    for (const r of rows) {
      if (r.category && !seen.has(r.category)) {
        seen.add(r.category);
        items.push(r);
      }
    }
    return c.json({ items });
  })

  /** Insere nova linha (append-only) — define grant/revoke. */
  .post("/", zValidator("json", upsertSchema), async (c) => {
    const userId = c.var.userId;
    const ip = clientIp(c);
    const ua = c.req.header("user-agent") ?? "";
    const body = c.req.valid("json");
    const now = Math.floor(Date.now() / 1000);
    const id = randomToken(16);
    const version = CURRENT_VERSIONS[body.category];
    const db = getDb(c.env);

    await db.insert(userConsents).values({
      id,
      userId,
      policyVersion: version,
      grantedAt: now,
      ip,
      userAgent: ua,
      category: body.category,
      status: body.status,
      revokedAt: body.status === "revoked" ? now : null,
    });

    await logAudit(c.env, {
      userId,
      action: body.status === "granted" ? "consent.grant" : "consent.revoke",
      resource: `consent:${body.category}`,
      ip,
      userAgent: ua,
      meta: { policyVersion: version },
    });

    return c.json({ id, category: body.category, status: body.status, grantedAt: now }, 201);
  })

  /** Histórico completo (auditoria do titular). */
  .get("/history", async (c) => {
    const userId = c.var.userId;
    const db = getDb(c.env);
    const rows = await db
      .select({
        id: userConsents.id,
        category: userConsents.category,
        status: userConsents.status,
        policyVersion: userConsents.policyVersion,
        grantedAt: userConsents.grantedAt,
        revokedAt: userConsents.revokedAt,
        ip: userConsents.ip,
      })
      .from(userConsents)
      .where(eq(userConsents.userId, userId))
      .orderBy(desc(userConsents.grantedAt))
      .limit(200);
    return c.json({ history: rows });
  });
