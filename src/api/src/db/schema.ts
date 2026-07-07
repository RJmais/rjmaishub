import { pgTable, text, bigint, integer, unique, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified').notNull().default(0),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  tier: text('tier').notNull().default('cliente'),
  status: text('status').notNull().default('active'),
  totpSecret: text('totp_secret'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  deletedAt: bigint('deleted_at', { mode: 'number' }),
  pendingDeletionAt: bigint('pending_deletion_at', { mode: 'number' }),
});

export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  phone: text('phone'),
  language: text('language').notNull().default('pt-BR'),
  timezone: text('timezone').notNull().default('America/Sao_Paulo'),
  marketingOptIn: integer('marketing_opt_in').notNull().default(0),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const userConsents = pgTable('user_consents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  policyVersion: text('policy_version').notNull(),
  grantedAt: bigint('granted_at', { mode: 'number' }).notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  category: text('category'),
  status: text('status').notNull(),
  revokedAt: bigint('revoked_at', { mode: 'number' }),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  revokedAt: bigint('revoked_at', { mode: 'number' }),
});

export const emailVerifyTokens = pgTable('email_verify_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  usedAt: bigint('used_at', { mode: 'number' }),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  usedAt: bigint('used_at', { mode: 'number' }),
});

export const totpBackupCodes = pgTable('totp_backup_codes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  usedAt: bigint('used_at', { mode: 'number' }),
});

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assistant: text('assistant').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  anonymized: integer('anonymized').notNull().default(0),
});

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  resource: text('resource'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  metaJson: text('meta_json'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const referrals = pgTable('referrals', {
  id: text('id').primaryKey(),
  referrerId: text('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  inviteeEmail: text('invitee_email').notNull(),
  status: text('status').notNull().default('pending'),
  rewardStatus: text('reward_status').notNull().default('none'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  convertedAt: bigint('converted_at', { mode: 'number' }),
});

export const dpoRequests = pgTable('dpo_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('open'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const eventsRsvp = pgTable('events_rsvp', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventSlug: text('event_slug').notNull(),
  status: text('status').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => ({
  userEventUniq: unique('events_rsvp_user_event_unique').on(table.userId, table.eventSlug),
}));

export const leads = pgTable('leads', {
  id:              text('id').primaryKey(),
  email:           text('email').notNull().unique(),
  name:            text('name'),
  phone:           text('phone'),
  source:          text('source').notNull().default('ana-chatbot'),
  utmSource:       text('utm_source'),
  utmCampaign:     text('utm_campaign'),
  utmMedium:       text('utm_medium'),
  message:         text('message'),
  status:          text('status').notNull().default('new'),
  hubspotSyncedAt: bigint('hubspot_synced_at', { mode: 'number' }),
  createdAt:       bigint('created_at',        { mode: 'number' }).notNull(),
  updatedAt:       bigint('updated_at',        { mode: 'number' }).notNull(),
});

/** Painel de TI — histórico persistente de incidentes (com busca). */
export const painelIncidentes = pgTable('painel_incidentes', {
  id:           text('id').primaryKey(),                              // ex.: INC-042
  titulo:       text('titulo').notNull(),
  severidade:   text('severidade').notNull(),                         // critico | alto | medio | baixo
  estado:       text('estado').notNull().default('aberto'),           // aberto | em_andamento | resolvido
  sistema:      text('sistema').notNull(),
  responsavel:  text('responsavel').notNull(),
  impacto:      text('impacto').notNull(),
  linhaDoTempo: jsonb('linha_do_tempo').$type<{ hora: string; evento: string }[]>().notNull().default([]),
  abertoEm:     bigint('aberto_em',    { mode: 'number' }).notNull(), // epoch ms
  resolvidoEm:  bigint('resolvido_em', { mode: 'number' }),
  criadoEm:     bigint('criado_em',    { mode: 'number' }).notNull(),
  atualizadoEm: bigint('atualizado_em', { mode: 'number' }).notNull(),
});
