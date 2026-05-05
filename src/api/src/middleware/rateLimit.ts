import type { Context } from "hono";
import type { Env } from "../index";

/**
 * Rate limit por chave (ex: IP, userId, IP+rota).
 * Backed por KV (RATE_LIMIT). Janela deslizante via TTL nativo.
 */
export async function rateLimit<E extends { Bindings: Env }>(
  c: Context<E>,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const k = `rl:${key}`;
  const raw = await c.env.RATE_LIMIT.get(k);
  const count = raw ? Number(raw) : 0;
  if (count >= limit) return false;
  await c.env.RATE_LIMIT.put(k, String(count + 1), {
    expirationTtl: windowSeconds,
  });
  return true;
}

/**
 * Retorna o IP do cliente.
 * Em produção CF sempre seta CF-Connecting-IP.
 * Se ausente (dev local sem proxy CF), retorna fallback determinístico
 * baseado em UA + Accept-Language pra evitar bucket compartilhado em DDoS.
 */
export function clientIp(c: Context): string {
  const cf = c.req.header("CF-Connecting-IP");
  if (cf) return cf;
  const xff = c.req.header("X-Forwarded-For")?.split(",")[0]?.trim();
  if (xff) return xff;
  // Fallback fingerprint (não confiável pra security real, mas evita "unknown" compartilhado)
  const ua = c.req.header("User-Agent") ?? "no-ua";
  const lang = c.req.header("Accept-Language") ?? "no-lang";
  return `fp:${ua.slice(0, 30)}:${lang.slice(0, 10)}`;
}
