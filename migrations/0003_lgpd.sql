-- Migration 0003 — LGPD complementos
-- Aplicar com: wrangler d1 migrations apply DB --local (ou --remote)

-- Solicitações ao DPO
CREATE TABLE IF NOT EXISTS dpo_requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open',         -- open|in_progress|resolved|rejected
  created_at   INTEGER NOT NULL,
  resolved_at  INTEGER
);
CREATE INDEX IF NOT EXISTS dpo_user ON dpo_requests(user_id, created_at);
CREATE INDEX IF NOT EXISTS dpo_status ON dpo_requests(status, created_at);

-- Mensagens de chat: flag de anonimização (cron retenção 12 meses)
ALTER TABLE chat_messages ADD COLUMN anonymized INTEGER NOT NULL DEFAULT 0;

-- Users: marca de exclusão pendente (LGPD direito ao esquecimento — 30 dias para hard delete)
ALTER TABLE users ADD COLUMN pending_deletion_at INTEGER;

-- Indexes adicionais
CREATE INDEX IF NOT EXISTS chat_anon ON chat_messages(anonymized, created_at);
CREATE INDEX IF NOT EXISTS users_deletion ON users(pending_deletion_at);
CREATE INDEX IF NOT EXISTS rsvp_user ON events_rsvp(user_id);
CREATE INDEX IF NOT EXISTS referrals_invitee ON referrals(invitee_email);
