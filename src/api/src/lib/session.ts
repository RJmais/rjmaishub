/**
 * session.ts — Session management (D1 + KV dual-layer)
 * - KV: Fast lookups, TTL 7 days (auth on every request)
 * - D1: Audit trail, revocation log, admin queries
 * - Pattern: createSession creates in both; getSession checks KV first, falls back to D1
 * - Revocation: immediate removal from KV + insert into revoked_at in D1
 */

import type { Env } from "../index";
import { randomToken } from "./crypto";

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const COOKIE_NAME = "rj_session";

export interface SessionData {
  userId: string;
  email: string;
  tier: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

/**
 * Create session in both KV (fast) and D1 (audit).
 * Returns session ID (hex-encoded random).
 */
export async function createSession(
  env: Env,
  userId: string,
  email: string,
  tier: string,
  ip: string,
  userAgent: string
): Promise<string> {
  // Web Crypto API (nativo em Workers — NÃO usar require)
  const sessionIdHex = randomToken(32);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;

  const session: SessionData = {
    userId,
    email,
    tier,
    createdAt: now,
    expiresAt,
    ip,
    userAgent,
  };

  // KV: store session data with TTL
  await env.SESSIONS.put(
    `session:${sessionIdHex}`,
    JSON.stringify(session),
    {
      expirationTtl: SESSION_TTL_SECONDS,
    }
  );

  // D1: insert into sessions table for audit
  await env.DB.prepare(
    `
    INSERT INTO sessions (id, user_id, ip, user_agent, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
    `
  ).bind(sessionIdHex, userId, ip, userAgent, now, expiresAt).run();

  return sessionIdHex;
}

/**
 * Get session from KV (fast path) or D1 (fallback).
 * Returns null if not found or expired.
 */
export async function getSession(
  env: Env,
  sessionId: string
): Promise<SessionData | null> {
  // Fast path: check KV first
  const cached = await env.SESSIONS.get(`session:${sessionId}`);
  if (cached) {
    try {
      return JSON.parse(cached) as SessionData;
    } catch {
      return null;
    }
  }

  // Fallback: check D1 (in case KV expired but session row still valid)
  const result = await env.DB.prepare(
    `
    SELECT id, user_id, ip, user_agent, created_at, expires_at
    FROM sessions
    WHERE id = ? AND revoked_at IS NULL AND expires_at > ?
    LIMIT 1
    `
  )
    .bind(sessionId, Math.floor(Date.now() / 1000))
    .first();

  if (!result) return null;

  // Query user to populate email and tier
  const user = await env.DB.prepare(
    `SELECT email, tier FROM users WHERE id = ? LIMIT 1`
  )
    .bind(result.user_id as string)
    .first();

  if (!user) return null;

  const session: SessionData = {
    userId: result.user_id as string,
    email: user.email as string,
    tier: user.tier as string,
    createdAt: result.created_at as number,
    expiresAt: result.expires_at as number,
    ip: result.ip as string,
    userAgent: result.user_agent as string,
  };

  // Repopulate KV for next request
  await env.SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify(session),
    {
      expirationTtl: SESSION_TTL_SECONDS,
    }
  );

  return session;
}

/**
 * Revoke session (logout, password change, admin action).
 * Removes from KV immediately + marks revoked_at in D1.
 */
export async function revokeSession(
  env: Env,
  sessionId: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // KV: immediate removal
  await env.SESSIONS.delete(`session:${sessionId}`);

  // D1: mark revoked
  await env.DB.prepare(
    `UPDATE sessions SET revoked_at = ? WHERE id = ?`
  )
    .bind(now, sessionId)
    .run();
}

/**
 * Revoke all sessions for a user (password change, security incident).
 */
export async function revokeUserSessions(
  env: Env,
  userId: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // D1: get all active session IDs
  const rows = await env.DB.prepare(
    `SELECT id FROM sessions WHERE user_id = ? AND revoked_at IS NULL`
  )
    .bind(userId)
    .all();

  // KV: delete each session
  const promises = (rows.results || []).map((row: any) =>
    env.SESSIONS.delete(`session:${row.id}`)
  );
  await Promise.all(promises);

  // D1: mark all revoked
  await env.DB.prepare(
    `UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`
  )
    .bind(now, userId)
    .run();
}

/**
 * Rotate session (refresh token pattern for JWT).
 * Revokes old session and creates new one with same user context.
 * Used during token refresh or after password change.
 */
export async function rotateSession(
  env: Env,
  oldSessionId: string
): Promise<string | null> {
  const session = await getSession(env, oldSessionId);
  if (!session) return null;

  // Revoke old
  await revokeSession(env, oldSessionId);

  // Create new with same context
  return createSession(
    env,
    session.userId,
    session.email,
    session.tier,
    session.ip,
    session.userAgent
  );
}

/**
 * Cleanup expired sessions from D1 (run via scheduled task, e.g., daily).
 * KV TTL handles its own expiration automatically.
 */
export async function cleanupExpiredSessions(env: Env): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(
    `DELETE FROM sessions WHERE expires_at < ?`
  )
    .bind(now)
    .run();

  return result.meta.changes || 0;
}

/* ────────────────────────────────────────────────────────
 * Cookie helpers — usados pelas rotas auth + middleware
 * ──────────────────────────────────────────────────────── */

export const sessionCookieName = COOKIE_NAME;

/** Lê userId direto do cookie (KV-fast). Helper pro middleware. */
export async function getUserIdFromCookie(
  env: Env,
  cookieHeader: string | null
): Promise<string | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  const sess = await getSession(env, match[1]!);
  return sess?.userId ?? null;
}

/** Cookie httpOnly Secure SameSite=Strict pra setar pós-login. */
export function buildSessionCookie(sessionId: string): string {
  const expires = new Date(
    Date.now() + SESSION_TTL_SECONDS * 1000
  ).toUTCString();
  return `${COOKIE_NAME}=${sessionId}; Path=/; Expires=${expires}; HttpOnly; Secure; SameSite=Strict`;
}

/** Cookie pra clear (logout). */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict`;
}
