-- RJ+ Hub — tabela de leads capturados pelo webhook Ana Chatbot
-- Aplicar com: psql $DATABASE_URL -f migrations/0004_leads.sql

CREATE TABLE IF NOT EXISTS leads (
  id               TEXT        PRIMARY KEY,
  email            TEXT        NOT NULL UNIQUE,
  name             TEXT,
  phone            TEXT,
  source           TEXT        NOT NULL DEFAULT 'ana-chatbot',
  utm_source       TEXT,
  utm_campaign     TEXT,
  utm_medium       TEXT,
  message          TEXT,
  status           TEXT        NOT NULL DEFAULT 'new',
  hubspot_synced_at BIGINT,
  created_at       BIGINT      NOT NULL,
  updated_at       BIGINT      NOT NULL
);

CREATE INDEX IF NOT EXISTS leads_email_idx    ON leads(email);
CREATE INDEX IF NOT EXISTS leads_status_idx   ON leads(status, created_at);
CREATE INDEX IF NOT EXISTS leads_source_idx   ON leads(source, created_at);
CREATE INDEX IF NOT EXISTS leads_created_idx  ON leads(created_at DESC);
