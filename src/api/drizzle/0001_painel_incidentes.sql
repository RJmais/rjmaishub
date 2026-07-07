CREATE TABLE IF NOT EXISTS "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"source" text DEFAULT 'ana-chatbot' NOT NULL,
	"utm_source" text,
	"utm_campaign" text,
	"utm_medium" text,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"hubspot_synced_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "painel_incidentes" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"severidade" text NOT NULL,
	"estado" text DEFAULT 'aberto' NOT NULL,
	"sistema" text NOT NULL,
	"responsavel" text NOT NULL,
	"impacto" text NOT NULL,
	"linha_do_tempo" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aberto_em" bigint NOT NULL,
	"resolvido_em" bigint,
	"criado_em" bigint NOT NULL,
	"atualizado_em" bigint NOT NULL
);
