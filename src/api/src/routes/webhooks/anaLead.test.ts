/**
 * anaLead.test.ts
 * Integration-style tests for POST /webhooks/ana-lead.
 * Mocks: getDb (database), pushLeadToHubSpot, logAudit.
 *
 * Env + ExecutionContext are passed as 2nd/3rd extra args to app.request(),
 * which is how Hono exposes bindings in unit tests outside Workers runtime.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../../index";

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the route
// ---------------------------------------------------------------------------

const mockDbState = {
  existing: null as { id: string } | null,
  insertError: null as Error | null,
};

vi.mock("../../db/client", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve(
              mockDbState.existing ? [mockDbState.existing] : []
            ),
        }),
      }),
    }),
    insert: () => ({
      values: () => {
        if (mockDbState.insertError) {
          return Promise.reject(mockDbState.insertError);
        }
        return Promise.resolve();
      },
    }),
  }),
}));

vi.mock("../../lib/hubspot", () => ({
  pushLeadToHubSpot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Import route AFTER mocks
// ---------------------------------------------------------------------------
import { anaLead } from "./anaLead";
import { pushLeadToHubSpot } from "../../lib/hubspot";
import { logAudit } from "../../lib/audit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    SESSIONS: {} as KVNamespace,
    RATE_LIMIT: {} as KVNamespace,
    FILES: {} as R2Bucket,
    APP_URL: "https://app.rjmais.com.br",
    ENVIRONMENT: "test",
    SUPABASE_URL: "https://xxx.supabase.co",
    DATABASE_URL: "postgres://test",
    SUPABASE_SERVICE_ROLE_KEY: "test-srk",
    ANTHROPIC_API_KEY: "test-ant",
    TURNSTILE_SECRET: "test-ts",
    HUBSPOT_TOKEN: "test-token",
    ...overrides,
  };
}

/**
 * Build a minimal Hono app that mounts anaLead at "/" and adds an error handler
 * that returns 500 for unhandled errors (mirrors index.ts behaviour).
 */
function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", anaLead);
  app.onError((_err, c) => c.json({ error: "internal_error" }, 500));
  return app;
}

/**
 * waitUntil promises are executed eagerly in tests — collect them so we can
 * await them before asserting mocks.
 */
function makeFakeCtx(): ExecutionContext & { flush: () => Promise<void> } {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil(p: Promise<unknown>) {
      pending.push(p.catch(() => {}));
    },
    passThroughOnException() {},
    async flush() {
      await Promise.all(pending);
    },
  };
}

async function post(
  app: Hono<{ Bindings: Env }>,
  body: unknown,
  env: Env = makeEnv(),
  ctx: ReturnType<typeof makeFakeCtx> = makeFakeCtx()
) {
  const res = await app.request(
    "/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
    ctx
  );
  // Flush waitUntil promises so mock assertions are deterministic
  await ctx.flush();
  return res;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("POST /webhooks/ana-lead", () => {
  beforeEach(() => {
    mockDbState.existing = null;
    mockDbState.insertError = null;
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy path — new lead (minimal payload)
  // -------------------------------------------------------------------------
  it("should return 201 with status captured and a hex id when lead is new", async () => {
    const app = buildApp();
    const res = await post(app, { email: "new@lead.com" });

    expect(res.status).toBe(201);
    const json = await res.json<{ status: string; id: string }>();
    expect(json.status).toBe("captured");
    // randomToken(16) → 16 bytes × 2 hex chars = 32 chars
    expect(json.id).toMatch(/^[0-9a-f]{32}$/);
  });

  // -------------------------------------------------------------------------
  // Happy path — full payload
  // -------------------------------------------------------------------------
  it("should return 201 and accept all optional fields in a full payload", async () => {
    const app = buildApp();
    const res = await post(app, {
      email: "full@lead.com",
      name: "Ana Silva",
      phone: "+5521999999999",
      message: "Quero investir",
      utmSource: "instagram",
      utmCampaign: "junho2026",
      utmMedium: "stories",
    });

    expect(res.status).toBe(201);
    const json = await res.json<{ status: string; id: string }>();
    expect(json.status).toBe("captured");
    expect(json.id).toMatch(/^[0-9a-f]{32}$/);
  });

  // -------------------------------------------------------------------------
  // Duplicate — email already in DB
  // -------------------------------------------------------------------------
  it("should return 200 with status duplicate and the existing id when email is already in DB", async () => {
    mockDbState.existing = { id: "existing-aabbcc112233" };
    const app = buildApp();
    const res = await post(app, { email: "dup@lead.com" });

    expect(res.status).toBe(200);
    const json = await res.json<{ status: string; id: string }>();
    expect(json.status).toBe("duplicate");
    expect(json.id).toBe("existing-aabbcc112233");
  });

  // -------------------------------------------------------------------------
  // Race condition — insert throws Postgres 23505
  // -------------------------------------------------------------------------
  it("should return 200 with status duplicate when insert throws a Postgres 23505 error", async () => {
    mockDbState.insertError = Object.assign(
      new Error('duplicate key value violates unique constraint "leads_email_key"'),
      { code: "23505" }
    );
    const app = buildApp();
    const res = await post(app, { email: "race@lead.com" });

    expect(res.status).toBe(200);
    const json = await res.json<{ status: string }>();
    expect(json.status).toBe("duplicate");
  });

  // -------------------------------------------------------------------------
  // Validation — missing email
  // -------------------------------------------------------------------------
  it("should return 400 when email field is missing", async () => {
    const app = buildApp();
    const res = await post(app, { name: "No Email" });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Validation — invalid email format
  // -------------------------------------------------------------------------
  it("should return 400 when email format is invalid", async () => {
    const app = buildApp();
    const res = await post(app, { email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Validation — empty body
  // -------------------------------------------------------------------------
  it("should return 400 when request body is an empty object", async () => {
    const app = buildApp();
    const res = await post(app, {});

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Email normalization — uppercase → lowercase
  // -------------------------------------------------------------------------
  it("should normalize email to lowercase (Zod transform) before inserting", async () => {
    const app = buildApp();
    const res = await post(app, { email: "UPPER@LEAD.COM" });

    expect(res.status).toBe(201);
    const json = await res.json<{ status: string; id: string }>();
    expect(json.status).toBe("captured");
  });

  // -------------------------------------------------------------------------
  // Validation — name too long (>200 chars)
  // -------------------------------------------------------------------------
  it("should return 400 when name exceeds 200 characters", async () => {
    const app = buildApp();
    const res = await post(app, {
      email: "valid@lead.com",
      name: "A".repeat(201),
    });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Validation — message too long (>2000 chars)
  // -------------------------------------------------------------------------
  it("should return 400 when message exceeds 2000 characters", async () => {
    const app = buildApp();
    const res = await post(app, {
      email: "valid@lead.com",
      message: "M".repeat(2001),
    });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // Fire-and-forget — pushLeadToHubSpot is called for new leads
  // -------------------------------------------------------------------------
  it("should trigger pushLeadToHubSpot via waitUntil when lead is new", async () => {
    const app = buildApp();
    await post(app, { email: "hs@lead.com", name: "Test User" });

    expect(pushLeadToHubSpot).toHaveBeenCalledOnce();
    const [, payload] = (pushLeadToHubSpot as ReturnType<typeof vi.fn>).mock
      .calls[0] as [unknown, { email: string; name?: string; source?: string }];
    expect(payload.email).toBe("hs@lead.com");
    expect(payload.name).toBe("Test User");
    expect(payload.source).toBe("ana-chatbot");
  });

  // -------------------------------------------------------------------------
  // Fire-and-forget — pushLeadToHubSpot NOT called for duplicates
  // -------------------------------------------------------------------------
  it("should NOT call pushLeadToHubSpot when lead is a duplicate", async () => {
    mockDbState.existing = { id: "dup-id-001" };
    const app = buildApp();
    await post(app, { email: "dup@lead.com" });

    expect(pushLeadToHubSpot).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Fire-and-forget — logAudit is called for new leads
  // -------------------------------------------------------------------------
  it("should trigger logAudit via waitUntil when lead is new", async () => {
    const app = buildApp();
    await post(app, { email: "audit@lead.com" });

    expect(logAudit).toHaveBeenCalledOnce();
    const [, entry] = (logAudit as ReturnType<typeof vi.fn>).mock.calls[0] as [
      unknown,
      { action: string; resource: string }
    ];
    expect(entry.action).toBe("webhook.ana_lead.capture");
    expect(entry.resource).toMatch(/^lead:/);
  });

  // -------------------------------------------------------------------------
  // logAudit is NOT called for duplicates
  // -------------------------------------------------------------------------
  it("should NOT call logAudit when lead is a duplicate", async () => {
    mockDbState.existing = { id: "dup-id-002" };
    const app = buildApp();
    await post(app, { email: "dup2@lead.com" });

    expect(logAudit).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Unexpected DB error (non-23505) bubbles to 500
  // -------------------------------------------------------------------------
  it("should return 500 when the DB throws an unexpected non-23505 error", async () => {
    mockDbState.insertError = new Error("connection timeout");
    const app = buildApp();

    const res = await post(app, { email: "crash@lead.com" });
    expect(res.status).toBe(500);
  });
});
