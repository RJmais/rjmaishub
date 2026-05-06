import { Hono } from "hono";
import type { Env } from "../index";
import { anaLead } from "./webhooks/anaLead";

export const webhooks = new Hono<{ Bindings: Env }>()
  .route("/ana-lead", anaLead);
