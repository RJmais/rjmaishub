import type { Env } from "../index";
import { randomToken } from "./crypto";

export interface AuditEntry {
  userId?: string | null;
  action: string;
  resource?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Grava entry imutável em audit_log.
 * Nunca lança — log de erro pra console se falhar (não bloqueia request).
 *
 * Workers-compat: usa Web Crypto via randomToken (NÃO require("crypto")).
 */
export async function logAudit(env: Env, entry: AuditEntry): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log
        (id, user_id, action, resource, ip, user_agent, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        randomToken(16),
        entry.userId ?? null,
        entry.action,
        entry.resource ?? null,
        entry.ip ?? null,
        entry.userAgent ?? null,
        entry.meta ? JSON.stringify(entry.meta) : null,
        Math.floor(Date.now() / 1000)
      )
      .run();
  } catch (e) {
    console.error("audit_log insert failed:", e, entry);
  }
}

/** Batch helper. */
export async function logAuditBatch(env: Env, entries: AuditEntry[]): Promise<void> {
  await Promise.all(entries.map((e) => logAudit(env, e)));
}
