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
import { retentionSweep } from "./cron/retention";

export interface Env {
  // Bindings (sempre presentes)
  DB: D1Database;
  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  FILES: R2Bucket;
  // Vars do wrangler.toml
  APP_URL: string;
  ENVIRONMENT: string;
  // Secrets (podem estar ausentes em dev sem .dev.vars)
  ANTHROPIC_API_KEY: string;
  BETTER_AUTH_SECRET: string;
  TURNSTILE_SECRET: string;
  RESEND_API_KEY?: string;
  HUBSPOT_TOKEN?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Hardening
app.use("*", securityHeaders);
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = [c.env.APP_URL, "http://localhost:5173"];
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

// Protegidas (requireAuth aplicado dentro de cada router)
app.route("/chat", chat);
app.route("/consents", consents);
app.route("/data", data);
app.route("/dpo", dpo);
app.route("/referrals", referrals);
app.route("/events", events);

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
