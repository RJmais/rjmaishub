import type { Env } from "../index";
import { logAudit } from "../lib/audit";

/**
 * Aplica políticas de retenção LGPD diariamente.
 * Documentação: outputs/lgpd/02-politica-de-retencao.md
 */
export async function retentionSweep(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  const results = await env.DB.batch([
    // Conversas com mais de 12 meses → anonimizar
    env.DB.prepare(
      `UPDATE chat_messages
         SET content = '[anonymized]', anonymized = 1
         WHERE created_at < ? AND anonymized = 0`
    ).bind(now - 365 * day),
    // Sessões revogadas há mais de 30 dias → eliminar
    env.DB.prepare(
      `DELETE FROM sessions WHERE revoked_at IS NOT NULL AND revoked_at < ?`
    ).bind(now - 30 * day),
    // Sessões expiradas há mais de 30 dias → eliminar
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(now - 30 * day),
    // Audit log com mais de 2 anos → eliminar
    env.DB.prepare(`DELETE FROM audit_log WHERE created_at < ?`).bind(now - 730 * day),
    // Indicações pending há mais de 90 dias → expirar
    env.DB.prepare(
      `UPDATE referrals
         SET invitee_email = '[anonymized]', status = 'expired'
         WHERE status = 'pending' AND created_at < ?`
    ).bind(now - 90 * day),
    // Tokens de email verify expirados → eliminar
    env.DB.prepare(`DELETE FROM email_verify_tokens WHERE expires_at < ?`).bind(
      now - 7 * day
    ),
    // Tokens de reset password expirados → eliminar
    env.DB.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < ?`).bind(
      now - 7 * day
    ),
    // Users com pending_deletion_at vencido (> 30 dias) → hard delete
    env.DB.prepare(
      `DELETE FROM users WHERE pending_deletion_at IS NOT NULL AND pending_deletion_at < ?`
    ).bind(now - 30 * day),
  ]);

  const counts = results.map((r) => r.meta?.changes ?? 0);
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
