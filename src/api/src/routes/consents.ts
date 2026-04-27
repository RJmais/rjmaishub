import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { randomToken } from "../lib/crypto";
import { clientIp } from "../middleware/rateLimit";

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
  category: string;
  status: string;
  granted_at: number;
  revoked_at: number | null;
  policy_version: string;
}

export const consents = new Hono<{
  Bindings: Env;
  Variables: { user: any; userId: string };
}>()
  .use("*", requireAuth)

  /** Estado atual por categoria — uma linha por categoria (mais recente). */
  .get("/", async (c) => {
    const userId = c.var.userId;
    const rows = await c.env.DB.prepare(
      `SELECT category, status, granted_at, revoked_at, policy_version
         FROM user_consents
        WHERE user_id = ? AND category IS NOT NULL
        ORDER BY granted_at DESC`
    )
      .bind(userId)
      .all<ConsentRow>();

    const seen = new Set<string>();
    const items: ConsentRow[] = [];
    for (const r of rows.results ?? []) {
      if (!seen.has(r.category)) {
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

    await c.env.DB.prepare(
      `INSERT INTO user_consents
        (id, user_id, policy_version, granted_at, ip, user_agent, category, status, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        userId,
        version,
        now,
        ip,
        ua,
        body.category,
        body.status,
        body.status === "revoked" ? now : null
      )
      .run();

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
    const rows = await c.env.DB.prepare(
      `SELECT id, category, status, policy_version, granted_at, revoked_at, ip
         FROM user_consents
        WHERE user_id = ?
        ORDER BY granted_at DESC
        LIMIT 200`
    )
      .bind(userId)
      .all();
    return c.json({ history: rows.results ?? [] });
  });
