/**
 * session.ts — Session management (Postgres + KV dual-layer)
 * - KV: Fast lookups, TTL 7 days (auth on every request)
 * - Postgres: Audit trail, revocation log, admin queries
 * - Pattern: createSession creates in both; getSession checks KV first, falls back to Postgres
 * - Revocation: immediate removal from KV + insert into revoked_at in Postgres
 */

import type { Env } from "../index";
import { randomToken } from "./crypto";
import { getDb } from "../db/client";
import { sessions, users } from "../db/schema";
import { eq, and, isNull, gt, lt } from "drizzle-orm";

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
 * Create session in both KV (fast) and Postgres (audit).
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
    { expirationTtl: SESSION_TTL_SECONDS }
  );

  // Postgres: insert into sessions table for audit
  const db = getDb(env);
  await db.insert(sessions).values({
    id: sessionIdHex,
    userId,
    ip,
    userAgent,
    createdAt: now,
    expiresAt,
  });

  return sessionIdHex;
}

/**
 * Get session from KV (fast path) or Postgres (fallback).
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

  // Fallback: check Postgres (in case KV expired but session row still valid)
  const db = getDb(env);
  const now = Math.floor(Date.now() / 1000);

  const [sessionRow] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      ip: sessions.ip,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .limit(1);

  if (!sessionRow) return null;

  // Query user to populate email and tier
  const [userRow] = await db
    .select({ email: users.email, tier: users.tier })
    .from(users)
    .where(eq(users.id, sessionRow.userId))
    .limit(1);

  if (!userRow) return null;

  const session: SessionData = {
    userId: sessionRow.userId,
    email: userRow.email,
    tier: userRow.tier,
    createdAt: sessionRow.createdAt,
    expiresAt: sessionRow.expiresAt,
    ip: sessionRow.ip ?? "",
    userAgent: sessionRow.userAgent ?? "",
  };

  // Repopulate KV for next request
  await env.SESSIONS.put(
    `session:${sessionId}`,
    JSON.stringify(session),
    { expirationTtl: SESSION_TTL_SECONDS }
  );

  return session;
}

/**
 * Revoke session (logout, password change, admin action).
 * Removes from KV immediately + marks revoked_at in Postgres.
 */
export async function revokeSession(
  env: Env,
  sessionId: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // KV: immediate removal
  await env.SESSIONS.delete(`session:${sessionId}`);

  // Postgres: mark revoked
  const db = getDb(env);
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(eq(sessions.id, sessionId));
}

/**
 * Revoke all sessions for a user (password change, security incident).
 */
export async function revokeUserSessions(
  env: Env,
  userId: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const db = getDb(env);

  // Postgres: get all active session IDs
  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

  // KV: delete each session
  await Promise.all(
    activeSessions.map((row) => env.SESSIONS.delete(`session:${row.id}`))
  );

  // Postgres: mark all revoked
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
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
 * Cleanup expired sessions from Postgres (run via scheduled task, e.g., daily).
 * KV TTL handles its own expiration automatically.
 */
export async function cleanupExpiredSessions(env: Env): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const db = getDb(env);
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });
  return deleted.length;
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
