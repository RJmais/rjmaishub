import type { MiddlewareHandler } from "hono";
import type { Env } from "../index";
import { getUserIdFromCookie } from "../lib/session";

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
 * Sessão em KV (rápido) → busca user em D1.
 * Anexa `c.var.user` (objeto completo) e `c.var.userId` (atalho).
 */
export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}> = async (c, next) => {
  const userId = await getUserIdFromCookie(c.env, c.req.header("Cookie") ?? null);
  if (!userId) return c.json({ error: "unauthorized" }, 401);

  const row = await c.env.DB.prepare(
    `SELECT id, email, name, email_verified, tier, totp_secret, status
       FROM users WHERE id = ? AND status = 'active' LIMIT 1`
  )
    .bind(userId)
    .first<{
      id: string;
      email: string;
      name: string;
      email_verified: number;
      tier: string;
      totp_secret: string | null;
      status: string;
    }>();

  if (!row) return c.json({ error: "unauthorized" }, 401);

  const user: AuthUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: !!row.email_verified,
    tier: (row.tier as AuthUser["tier"]) ?? "cliente",
    has2fa: !!row.totp_secret,
  };
  c.set("user", user);
  c.set("userId", user.id);
  await next();
};
