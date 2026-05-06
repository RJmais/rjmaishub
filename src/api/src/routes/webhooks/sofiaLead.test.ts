import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../../index";

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
        if (mockDbState.insertError) return Promise.reject(mockDbState.insertError);
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

import { sofiaLead } from "./sofiaLead";
import { pushLeadToHubSpot } from "../../lib/hubspot";
import { logAudit } from "../../lib/audit";

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

function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", sofiaLead);
  app.onError((_err, c) => c.json({ error: "internal_error" }, 500));
  return app;
}

function makeFakeCtx(): ExecutionContext & { flush: () => Promise<void> } {
  const pending: Promise<unknown>[] = [];
  return {
    waitUntil(p: Promise<unknown>) { pending.push(p.catch(() => {})); },
    passThroughOnException() {},
    async flush() { await Promise.all(pending); },
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
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    env,
    ctx
  );
  await ctx.flush();
  return res;
}

describe("POST /webhooks/sofia-lead", () => {
  beforeEach(() => {
    mockDbState.existing = null;
    mockDbState.insertError = null;
    vi.clearAllMocks();
  });

  it("should return 201 with status captured when lead is new", async () => {
    const res = await post(buildApp(), { email: "sofia@lead.com" });
    expect(res.status).toBe(201);
    const json = await res.json<{ status: string; id: string }>();
    expect(json.status).toBe("captured");
    expect(json.id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("should return 200 with status duplicate when email exists", async () => {
    mockDbState.existing = { id: "existing-id-001" };
    const res = await post(buildApp(), { email: "dup@lead.com" });
    expect(res.status).toBe(200);
    const json = await res.json<{ status: string; id: string }>();
    expect(json.status).toBe("duplicate");
    expect(json.id).toBe("existing-id-001");
  });

  it("should return 200 with status duplicate on Postgres 23505 race condition", async () => {
    mockDbState.insertError = Object.assign(
      new Error('duplicate key value violates unique constraint "leads_email_key"'),
      { code: "23505" }
    );
    const res = await post(buildApp(), { email: "race@lead.com" });
    expect(res.status).toBe(200);
    const json = await res.json<{ status: string }>();
    expect(json.status).toBe("duplicate");
  });

  it("should return 400 when email is invalid", async () => {
    const res = await post(buildApp(), { email: "not-valid" });
    expect(res.status).toBe(400);
  });

  it("should call pushLeadToHubSpot with source sofia-chatbot for new leads", async () => {
    await post(buildApp(), { email: "hs@sofia.com", name: "Sofia User" });
    expect(pushLeadToHubSpot).toHaveBeenCalledOnce();
    const [, payload] = (pushLeadToHubSpot as ReturnType<typeof vi.fn>).mock.calls[0] as [
      unknown,
      { source: string }
    ];
    expect(payload.source).toBe("sofia-chatbot");
  });

  it("should call logAudit with action webhook.sofia_lead.capture for new leads", async () => {
    await post(buildApp(), { email: "audit@sofia.com" });
    expect(logAudit).toHaveBeenCalledOnce();
    const [, entry] = (logAudit as ReturnType<typeof vi.fn>).mock.calls[0] as [
      unknown,
      { action: string }
    ];
    expect(entry.action).toBe("webhook.sofia_lead.capture");
  });

  it("should NOT call pushLeadToHubSpot for duplicate leads", async () => {
    mockDbState.existing = { id: "dup-001" };
    await post(buildApp(), { email: "dup@sofia.com" });
    expect(pushLeadToHubSpot).not.toHaveBeenCalled();
  });

  it("should return 500 for unexpected DB errors", async () => {
    mockDbState.insertError = new Error("connection timeout");
    const res = await post(buildApp(), { email: "crash@sofia.com" });
    expect(res.status).toBe(500);
  });
});
