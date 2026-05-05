import type { Env } from "../index";
import { logAudit } from "../lib/audit";
import { getDb } from "../db/client";
import {
  chatMessages,
  sessions,
  auditLog,
  referrals,
  emailVerifyTokens,
  passwordResetTokens,
  users,
} from "../db/schema";
import { eq, and, lt, isNotNull } from "drizzle-orm";

/**
 * Aplica políticas de retenção LGPD diariamente.
 * Documentação: outputs/lgpd/02-politica-de-retencao.md
 */
export async function retentionSweep(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;
  const db = getDb(env);

  const [r0, r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
    // Conversas com mais de 12 meses → anonimizar
    db
      .update(chatMessages)
      .set({ content: "[anonymized]", anonymized: 1 })
      .where(
        and(
          lt(chatMessages.createdAt, now - 365 * day),
          eq(chatMessages.anonymized, 0)
        )
      )
      .returning({ id: chatMessages.id }),

    // Sessões revogadas há mais de 30 dias → eliminar
    db
      .delete(sessions)
      .where(
        and(isNotNull(sessions.revokedAt), lt(sessions.revokedAt, now - 30 * day))
      )
      .returning({ id: sessions.id }),

    // Sessões expiradas há mais de 30 dias → eliminar
    db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now - 30 * day))
      .returning({ id: sessions.id }),

    // Audit log com mais de 2 anos → eliminar
    db
      .delete(auditLog)
      .where(lt(auditLog.createdAt, now - 730 * day))
      .returning({ id: auditLog.id }),

    // Indicações pending há mais de 90 dias → expirar
    db
      .update(referrals)
      .set({ inviteeEmail: "[anonymized]", status: "expired" })
      .where(
        and(
          eq(referrals.status, "pending"),
          lt(referrals.createdAt, now - 90 * day)
        )
      )
      .returning({ id: referrals.id }),

    // Tokens de email verify expirados → eliminar
    db
      .delete(emailVerifyTokens)
      .where(lt(emailVerifyTokens.expiresAt, now - 7 * day))
      .returning({ id: emailVerifyTokens.id }),

    // Tokens de reset password expirados → eliminar
    db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, now - 7 * day))
      .returning({ id: passwordResetTokens.id }),

    // Users com pending_deletion_at vencido (> 30 dias) → hard delete
    db
      .delete(users)
      .where(
        and(
          isNotNull(users.pendingDeletionAt),
          lt(users.pendingDeletionAt, now - 30 * day)
        )
      )
      .returning({ id: users.id }),
  ]);

  const counts = [r0, r1, r2, r3, r4, r5, r6, r7].map((r) => r.length);

  await logAudit(env, {
    action: "retention.sweep",
    meta: {
      anonymizedChats: counts[0],
      deletedSessionsRevoked: counts[1],
      deletedSessionsExpired: counts[2],
      deletedAuditLogs: counts[3],
      expiredReferrals: counts[4],
      deletedVerifyTokens: counts[5],
      deletedResetTokens: counts[6],
      hardDeletedUsers: counts[7],
    },
  });
}
