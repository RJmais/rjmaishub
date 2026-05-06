import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";
import { logAudit } from "../lib/audit";
import { randomToken } from "../lib/crypto";
import { getDb } from "../db/client";
import { eventsRsvp } from "../db/schema";
import { eq } from "drizzle-orm";

const rsvpSchema = z.object({
  status: z.enum(["yes", "maybe", "no"]),
});

const ts = () => Math.floor(Date.now() / 1000);

/**
 * Mock de eventos enquanto a integração com calendariorjmais.pages.dev API
 * não está pronta (Fase 3). Cada evento tem slug, título, data, localização.
 */
const MOCK_EVENTS = [
  {
    slug: "almoco-julho-2026",
    title: "Almoço RJ+ Experience — Cidade Maravilhosa",
    date: "2026-07-12T13:00:00-03:00",
    location: "Copacabana Palace · Rio de Janeiro",
    description: "Almoço exclusivo para clientes RJ+ com curadoria de chefs internacionais.",
  },
  {
    slug: "vintage-cars-agosto-2026",
    title: "Vintage Cars Tour Petrópolis",
    date: "2026-08-23T09:00:00-03:00",
    location: "Centro · Petrópolis",
    description: "Passeio em carros clássicos pela Serra Imperial, com almoço em Itaipava.",
  },
  {
    slug: "investidor-internacional-set-2026",
    title: "Encontro RJ+ Internacional — São Paulo",
    date: "2026-09-18T19:00:00-03:00",
    location: "Hotel Fasano · São Paulo",
    description: "Painel sobre investimentos internacionais, hedge cambial e relocação.",
  },
];

export const events = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>()
  .use("*", requireAuth)

  .get("/", async (c) => {
    const user = c.var.user;
    const db = getDb(c.env);
    const rsvps = await db
      .select({ eventSlug: eventsRsvp.eventSlug, status: eventsRsvp.status })
      .from(eventsRsvp)
      .where(eq(eventsRsvp.userId, user.id));
    const rsvpMap = new Map(rsvps.map((r) => [r.eventSlug, r.status]));
    return c.json({
      items: MOCK_EVENTS.map((e) => ({
        ...e,
        myRsvp: rsvpMap.get(e.slug) ?? null,
      })),
    });
  })

  .post("/:slug/rsvp", zValidator("json", rsvpSchema), async (c) => {
    const user = c.var.user;
    const slug = c.req.param("slug");
    const body = c.req.valid("json");
    if (!MOCK_EVENTS.find((e) => e.slug === slug)) {
      return c.json({ error: "event_not_found" }, 404);
    }
    const now = ts();
    const db = getDb(c.env);
    await db
      .insert(eventsRsvp)
      .values({
        id: randomToken(16),
        userId: user.id,
        eventSlug: slug,
        status: body.status,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: [eventsRsvp.userId, eventsRsvp.eventSlug],
        set: { status: body.status, createdAt: now },
      });
    await logAudit(c.env, {
      userId: user.id,
      action: "events.rsvp",
      resource: `event:${slug}`,
      meta: { status: body.status },
    });
    return c.json({ status: "ok", slug, rsvp: body.status });
  });
