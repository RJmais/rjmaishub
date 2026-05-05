import type { Env } from "../index";
import { randomToken } from "./crypto";
import { getDb } from "../db/client";
import { auditLog } from "../db/schema";

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
    const db = getDb(env);
    await db.insert(auditLog).values({
      id: randomToken(16),
      userId: entry.userId ?? null,
      action: entry.action,
      resource: entry.resource ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metaJson: entry.meta ? JSON.stringify(entry.meta) : null,
      createdAt: Math.floor(Date.now() / 1000),
    });
  } catch (e) {
    console.error("audit_log insert failed:", e, entry);
  }
}

/** Batch helper. */
export async function logAuditBatch(env: Env, entries: AuditEntry[]): Promise<void> {
  await Promise.all(entries.map((e) => logAudit(env, e)));
}
