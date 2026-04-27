-- Migration 0002 — Auth e LGPD complementos
-- Aplicar com: wrangler d1 migrations apply DB --local (ou --remote)

-- Tokens de verificação de email
CREATE TABLE IF NOT EXISTS email_verify_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,                 -- sha256 hex do token enviado
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS evt_token_hash ON email_verify_tokens(token_hash);
CREATE INDEX IF NOT EXISTS evt_user ON email_verify_tokens(user_id);

-- Tokens de reset de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS prt_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS prt_user ON password_reset_tokens(user_id);

-- Backup codes 2FA (hashed)
CREATE TABLE IF NOT EXISTS totp_backup_codes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  used_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tbc_user ON totp_backup_codes(user_id);

-- Consent flow ampliado (LGPD): category + status + revogação
ALTER TABLE user_consents ADD COLUMN category TEXT;        -- 'privacy'|'terms'|'ai_chat'|'marketing'|'analytics_cookies'|'marketing_cookies'
ALTER TABLE user_consents ADD COLUMN status TEXT DEFAULT 'granted';  -- 'granted'|'revoked'
ALTER TABLE user_consents ADD COLUMN revoked_at INTEGER;
CREATE INDEX IF NOT EXISTS consents_cat ON user_consents(user_id, category, granted_at);

-- Login attempts (rate limit + lockout opcional)
CREATE TABLE IF NOT EXISTS login_attempts (
  id          TEXT PRIMARY KEY,
  email_hash  TEXT NOT NULL,
  ip          TEXT,
  success     INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS la_email ON login_attempts(email_hash, created_at);
CREATE INDEX IF NOT EXISTS la_ip ON login_attempts(ip, created_at);
