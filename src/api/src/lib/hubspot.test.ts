/**
 * hubspot.test.ts
 * Tests for pushLeadToHubSpot — fire-and-forget, never throws.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pushLeadToHubSpot } from "./hubspot";
import type { Env } from "../index";

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

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("pushLeadToHubSpot", () => {
  let consoleSpy: {
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1 — Missing token
  // -------------------------------------------------------------------------
  it("should log warn and return without fetching when HUBSPOT_TOKEN is absent", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const env = makeEnv({ HUBSPOT_TOKEN: undefined });

    await expect(
      pushLeadToHubSpot(env, { email: "lead@test.com" })
    ).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalledOnce();
    expect(consoleSpy.warn.mock.calls[0]?.[0]).toContain("HUBSPOT_TOKEN");
  });

  // -------------------------------------------------------------------------
  // 2 — Successful creation (2xx)
  // -------------------------------------------------------------------------
  it("should call HubSpot API with correct payload when token is present", async () => {
    const mockRes = new Response(JSON.stringify({ id: "hs-123" }), {
      status: 201,
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockRes);
    const env = makeEnv();

    await pushLeadToHubSpot(env, {
      email: "lead@test.com",
      name: "Ana Silva",
      phone: "+5521999999999",
      source: "ana-chatbot",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/contacts");
    expect(init.method).toBe("POST");

    const sent = JSON.parse(init.body as string);
    expect(sent.properties.email).toBe("lead@test.com");
    expect(sent.properties.firstname).toBe("Ana");
    expect(sent.properties.lastname).toBe("Silva");
    expect(sent.properties.phone).toBe("+5521999999999");
    expect(sent.properties.hs_lead_status).toBe("NEW");
    expect(sent.properties.lifecyclestage).toBe("lead");
    expect(consoleSpy.error).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3 — Single-word name (no lastname)
  // -------------------------------------------------------------------------
  it("should send only firstname when name has a single word", async () => {
    const mockRes = new Response("{}", { status: 200 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockRes);
    const env = makeEnv();

    await pushLeadToHubSpot(env, { email: "mono@test.com", name: "Carlos" });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.properties.firstname).toBe("Carlos");
    expect(sent.properties.lastname).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 4 — No name provided
  // -------------------------------------------------------------------------
  it("should send empty firstname and no lastname when name is omitted", async () => {
    const mockRes = new Response("{}", { status: 200 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockRes);
    const env = makeEnv();

    await pushLeadToHubSpot(env, { email: "noname@test.com" });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    // name is "" → split gives [""] → firstName = "" → falsy → undefined
    expect(sent.properties.firstname).toBeUndefined();
    expect(sent.properties.lastname).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 5 — HTTP 409 (duplicate in HubSpot)
  // -------------------------------------------------------------------------
  it("should log info and return without error when HubSpot returns 409", async () => {
    const mockRes = new Response("Contact already exists", { status: 409 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes);
    const env = makeEnv();

    await expect(
      pushLeadToHubSpot(env, { email: "dup@test.com" })
    ).resolves.toBeUndefined();

    expect(consoleSpy.info).toHaveBeenCalledOnce();
    expect(consoleSpy.info.mock.calls[0]?.[0]).toContain("already exists");
    expect(consoleSpy.error).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6 — Other non-ok HTTP (e.g., 500)
  // -------------------------------------------------------------------------
  it("should log error and return without throwing when HubSpot returns 5xx", async () => {
    const mockRes = new Response("Internal Server Error", { status: 500 });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockRes);
    const env = makeEnv();

    await expect(
      pushLeadToHubSpot(env, { email: "err@test.com" })
    ).resolves.toBeUndefined();

    expect(consoleSpy.error).toHaveBeenCalledOnce();
    const errArgs = consoleSpy.error.mock.calls[0] as string[];
    expect(errArgs[0]).toContain("failed");
    expect(consoleSpy.info).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7 — fetch throws (network error)
  // -------------------------------------------------------------------------
  it("should log error and return without throwing when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("network failure")
    );
    const env = makeEnv();

    await expect(
      pushLeadToHubSpot(env, { email: "net@test.com" })
    ).resolves.toBeUndefined();

    expect(consoleSpy.error).toHaveBeenCalledOnce();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 8 — Authorization header is set correctly
  // -------------------------------------------------------------------------
  it("should send Authorization Bearer header with HUBSPOT_TOKEN", async () => {
    const mockRes = new Response("{}", { status: 200 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockRes);
    const env = makeEnv({ HUBSPOT_TOKEN: "secret-abc-123" });

    await pushLeadToHubSpot(env, { email: "auth@test.com" });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer secret-abc-123");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  // -------------------------------------------------------------------------
  // 9 — Multi-word name (first + rest joined as lastname)
  // -------------------------------------------------------------------------
  it("should join remaining words as lastname when name has more than two words", async () => {
    const mockRes = new Response("{}", { status: 200 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockRes);
    const env = makeEnv();

    await pushLeadToHubSpot(env, {
      email: "full@test.com",
      name: "Maria Das Graças",
    });

    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.properties.firstname).toBe("Maria");
    expect(sent.properties.lastname).toBe("Das Graças");
  });
});
