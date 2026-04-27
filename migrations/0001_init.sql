-- RJ+ Hub — D1 schema inicial
-- Aplicar com: wrangler d1 migrations apply DB --local (ou --remote em prod)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,                  -- uuid
  email         TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  name          TEXT NOT NULL,
  password_hash TEXT,                              -- bcrypt; null se SSO-only
  oauth_provider TEXT,                             -- "google" | null
  oauth_id      TEXT,
  totp_secret   TEXT,                              -- 2FA opcional, criptografado
  tier          TEXT NOT NULL DEFAULT 'cliente',   -- cliente | parceiro | admin
  status        TEXT NOT NULL DEFAULT 'active',    -- active | suspended | deleted
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER                            -- soft delete LGPD
);
CREATE UNIQUE INDEX IF NOT EXISTS users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_status ON users(status);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cpf_encrypted TEXT,                              -- AES-256-GCM
  phone         TEXT,
  language      TEXT NOT NULL DEFAULT 'pt-BR',
  timezone      TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,                  -- session id (cookie)
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip            TEXT,
  user_agent    TEXT,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL,
  revoked_at    INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assistant     TEXT NOT NULL,                     -- 'sofia' | 'ana'
  role          TEXT NOT NULL,                     -- 'user' | 'assistant'
  content       TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_user_assist ON chat_messages(user_id, assistant, created_at);

CREATE TABLE IF NOT EXISTS referrals (
  id            TEXT PRIMARY KEY,
  referrer_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | converted | expired
  reward_status TEXT NOT NULL DEFAULT 'none',      -- none | granted
  created_at    INTEGER NOT NULL,
  converted_at  INTEGER
);
CREATE INDEX IF NOT EXISTS referrals_referrer ON referrals(referrer_id);

CREATE TABLE IF NOT EXISTS events_rsvp (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_slug    TEXT NOT NULL,
  status        TEXT NOT NULL,                     -- yes | maybe | no
  created_at    INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS rsvp_user_event ON events_rsvp(user_id, event_slug);

CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,                              -- null se sistema
  action        TEXT NOT NULL,                     -- ex: 'auth.login', 'data.export'
  resource      TEXT,                              -- ex: 'user:abc', 'doc:xyz'
  ip            TEXT,
  user_agent    TEXT,
  meta_json     TEXT,                              -- JSON serializado
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_user ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_action ON audit_log(action, created_at);

CREATE TABLE IF NOT EXISTS user_consents (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL,                    -- ex: 'priv-2026-04'
  granted_at    INTEGER NOT NULL,
  ip            TEXT,
  user_agent    TEXT
);
CREATE INDEX IF NOT EXISTS consents_user ON user_consents(user_id, granted_at);

CREATE TABLE IF NOT EXISTS encryption_keys (
  id            TEXT PRIMARY KEY,                  -- key version (ex: 'k-2026-04')
  algorithm     TEXT NOT NULL DEFAULT 'AES-256-GCM',
  status        TEXT NOT NULL DEFAULT 'active',    -- active | retired
  created_at    INTEGER NOT NULL,
  retired_at    INTEGER
);
