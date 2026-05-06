import { Hono } from "hono";
import type { Env } from "../index";
import { anaLead } from "./webhooks/anaLead";
import { sofiaLead } from "./webhooks/sofiaLead";

export const webhooks = new Hono<{ Bindings: Env }>()
  .route("/ana-lead", anaLead)
  .route("/sofia-lead", sofiaLead);
