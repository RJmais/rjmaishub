import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../index";
import type { AuthUser } from "../middleware/auth";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLeads = [
  { id: "a1", email: "a@test.com", name: "A", phone: null, source: "ana-chatbot",
    utmSource: null, utmCampaign: null, utmMedium: null, message: null,
    status: "new", hubspotSyncedAt: null, createdAt: 1000 },
  { id: "b2", email: "b@test.com", name: "B", phone: null, source: "sofia-chatbot",
    utmSource: null, utmCampaign: null, utmMedium: null, message: null,
    status: "contacted", hubspotSyncedAt: null, createdAt: 900 },
];

const mockDbState = {
  total: 2,
  items: mockLeads,
};

vi.mock("../db/client", () => ({
  getDb: () => ({
    select: vi.fn().mockImplementation((fields) => {
      // count query returns { total }; item query returns items array
      const isCountQuery = fields && "total" in fields;
      return {
        from: () => ({
          where: () =>
            isCountQuery
              ? Promise.resolve([{ total: mockDbState.total }])
              : {
                  orderBy: () => ({
                    limit: () => ({
                      offset: () => Promise.resolve(mockDbState.items),
                    }),
                  }),
                },
        }),
      };
    }),
  }),
}));

vi.mock("../middleware/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../middleware/auth")>();
  return {
    ...actual,
    requireAuth: vi.fn(async (c: { set: (k: string, v: unknown) => void; var: { user: AuthUser } }, next: () => Promise<void>) => {
      c.set("user", mockAuthState.user);
      c.set("userId", mockAuthState.user.id);
      await next();
    }),
  };
});

const mockAuthState = {
  user: {
    id: "admin-user-1",
    email: "pilarmoret@gmail.com",
    name: "Pilar",
    emailVerified: true,
    tier: "admin" as const,
    has2fa: false,
  } satisfies AuthUser,
};

// ---------------------------------------------------------------------------
// Import route AFTER mocks
// ---------------------------------------------------------------------------
import { leads } from "./leads";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnv(): Env {
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
  };
}

function buildApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/", leads);
  app.onError((_err, c) => c.json({ error: "internal_error" }, 500));
  return app;
}

async function get(path: string, env: Env = makeEnv()) {
  return buildApp().request(path, { method: "GET" }, env);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("GET /leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = {
      id: "admin-user-1",
      email: "pilarmoret@gmail.com",
      name: "Pilar",
      emailVerified: true,
      tier: "admin",
      has2fa: false,
    };
    mockDbState.total = 2;
    mockDbState.items = mockLeads;
  });

  it("should return 200 with items and pagination metadata for admin user", async () => {
    const res = await get("/");
    expect(res.status).toBe(200);
    const json = await res.json<{ items: unknown[]; total: number; page: number; limit: number }>();
    expect(json.total).toBe(2);
    expect(json.page).toBe(1);
    expect(json.limit).toBe(20);
    expect(json.items).toHaveLength(2);
  });

  it("should return 403 when user tier is not admin", async () => {
    mockAuthState.user = { ...mockAuthState.user, tier: "cliente" };
    const res = await get("/");
    expect(res.status).toBe(403);
    const json = await res.json<{ error: string }>();
    expect(json.error).toBe("forbidden");
  });

  it("should return 403 when user tier is parceiro", async () => {
    mockAuthState.user = { ...mockAuthState.user, tier: "parceiro" };
    const res = await get("/");
    expect(res.status).toBe(403);
  });

  it("should accept custom page and limit query params", async () => {
    const res = await get("/?page=2&limit=10");
    expect(res.status).toBe(200);
    const json = await res.json<{ page: number; limit: number }>();
    expect(json.page).toBe(2);
    expect(json.limit).toBe(10);
  });

  it("should return 400 when limit exceeds 100", async () => {
    const res = await get("/?limit=101");
    expect(res.status).toBe(400);
  });

  it("should return 400 when page is 0", async () => {
    const res = await get("/?page=0");
    expect(res.status).toBe(400);
  });

  it("should accept valid source filter", async () => {
    const res = await get("/?source=ana-chatbot");
    expect(res.status).toBe(200);
  });

  it("should return 400 for invalid source value", async () => {
    const res = await get("/?source=unknown-bot");
    expect(res.status).toBe(400);
  });

  it("should accept valid status filter", async () => {
    const res = await get("/?status=new");
    expect(res.status).toBe(200);
  });

  it("should return 400 for invalid status value", async () => {
    const res = await get("/?status=invalid");
    expect(res.status).toBe(400);
  });

  it("should accept combined source and status filters", async () => {
    const res = await get("/?source=sofia-chatbot&status=contacted");
    expect(res.status).toBe(200);
  });
});
