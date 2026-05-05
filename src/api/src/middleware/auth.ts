import type { MiddlewareHandler } from "hono";
import type { Env } from "../index";
import { getUserIdFromCookie } from "../lib/session";
import { getDb } from "../db/client";
import { users } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  tier: "cliente" | "parceiro" | "admin";
  has2fa: boolean;
}

/**
 * Auth middleware — valida sessão via cookie httpOnly `rj_session`.
 * Sessão em KV (rápido) → busca user em Postgres.
 * Anexa `c.var.user` (objeto completo) e `c.var.userId` (atalho).
 */
export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}> = async (c, next) => {
  const userId = await getUserIdFromCookie(c.env, c.req.header("Cookie") ?? null);
  if (!userId) return c.json({ error: "unauthorized" }, 401);

  const db = getDb(c.env);
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      emailVerified: users.emailVerified,
      tier: users.tier,
      totpSecret: users.totpSecret,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, "active")))
    .limit(1);

  if (!row) return c.json({ error: "unauthorized" }, 401);

  const user: AuthUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: !!row.emailVerified,
    tier: (row.tier as AuthUser["tier"]) ?? "cliente",
    has2fa: !!row.totpSecret,
  };
  c.set("user", user);
  c.set("userId", user.id);
  await next();
};
