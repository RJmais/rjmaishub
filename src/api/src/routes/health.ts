import { Hono } from "hono";
import type { Env } from "../index";

export const health = new Hono<{ Bindings: Env }>().get("/", (c) =>
  c.json({
    ok: true,
    service: "rjmais-hub-api",
    env: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  })
);
