import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth, type AuthUser } from "../middleware/auth";
import { getDb } from "../db/client";
import { leads as leadsTable } from "../db/schema";
import { eq, and, desc, count, SQL } from "drizzle-orm";

const querySchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  source: z.enum(["ana-chatbot", "sofia-chatbot"]).optional(),
  status: z.enum(["new", "contacted", "converted", "disqualified"]).optional(),
});

export const leads = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>()
  .use("*", requireAuth)

  .get("/", zValidator("query", querySchema), async (c) => {
    const user = c.var.user;
    if (user.tier !== "admin") {
      return c.json({ error: "forbidden" }, 403);
    }

    const { page, limit, source, status } = c.req.valid("query");
    const offset = (page - 1) * limit;
    const db = getDb(c.env);

    const conditions: SQL[] = [];
    if (source) conditions.push(eq(leadsTable.source, source));
    if (status) conditions.push(eq(leadsTable.status, status));
    const where = conditions.length ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(leadsTable)
      .where(where);

    const items = await db
      .select({
        id:          leadsTable.id,
        email:       leadsTable.email,
        name:        leadsTable.name,
        phone:       leadsTable.phone,
        source:      leadsTable.source,
        utmSource:   leadsTable.utmSource,
        utmCampaign: leadsTable.utmCampaign,
        utmMedium:   leadsTable.utmMedium,
        message:     leadsTable.message,
        status:      leadsTable.status,
        hubspotSyncedAt: leadsTable.hubspotSyncedAt,
        createdAt:   leadsTable.createdAt,
      })
      .from(leadsTable)
      .where(where)
      .orderBy(desc(leadsTable.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ items, total, page, limit });
  });
