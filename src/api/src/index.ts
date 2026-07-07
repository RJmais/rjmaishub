import { Hono } from "hono";
import { cors } from "hono/cors";
import { securityHeaders } from "./middleware/security";
import { health } from "./routes/health";
import { auth } from "./routes/auth";
import { chat } from "./routes/chat";
import { consents } from "./routes/consents";
import { data } from "./routes/data";
import { dpo } from "./routes/dpo";
import { referrals } from "./routes/referrals";
import { events } from "./routes/events";
import { webhooks } from "./routes/webhooks";
import { leads } from "./routes/leads";
import { painel } from "./routes/painel";
import { retentionSweep } from "./cron/retention";

export interface Env {
  // Bindings (sempre presentes)
  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  FILES: R2Bucket;
  // Vars do wrangler.toml
  APP_URL: string;
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  // Secrets (configurar via `wrangler secret put NAME`)
  DATABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  ANTHROPIC_API_KEY: string;
  TURNSTILE_SECRET: string;
  RESEND_API_KEY?: string;
  HUBSPOT_TOKEN?: string;
  /** HMAC compartilhado com os chatbots Ana/Sofia p/ assinar webhooks de lead (H1). */
  WEBHOOK_SECRET?: string;
  /** Chave AES-256 (base64 de 32 bytes) p/ criptografar segredos TOTP em repouso (H2). */
  TOTP_ENC_KEY?: string;
  /** Bearer token do Painel de TI (painel-ti-rjmais) — consumido só server-side. */
  PAINEL_TOKEN?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Hardening
app.use("*", securityHeaders);
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = [
        c.env.APP_URL,
        "http://localhost:5173",
        "https://ana-rjmais.pages.dev",
        "https://chat.rjpeoplecare.com",
      ];
      return origin && allowed.includes(origin) ? origin : allowed[0];
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })
);

// Públicas
app.route("/health", health);
app.route("/auth", auth);
app.route("/webhooks", webhooks);

// Protegidas (requireAuth aplicado dentro de cada router)
app.route("/leads", leads);
app.route("/chat", chat);
app.route("/consents", consents);
app.route("/data", data);
app.route("/dpo", dpo);
app.route("/referrals", referrals);
app.route("/events", events);
app.route("/painel", painel); // Painel de TI (Bearer PAINEL_TOKEN)

app.notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404));

app.onError((err, c) => {
  console.error("worker error", err);
  return c.json({ error: "internal_error" }, 500);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  /** Cloudflare cron trigger — executa rotinas agendadas. */
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    await retentionSweep(env);
  },
};
