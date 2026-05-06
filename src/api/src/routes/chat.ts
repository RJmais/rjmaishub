import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { requireAuth } from "../middleware/auth";
import type { AuthUser } from "../middleware/auth";
import type { Context } from "hono";
import { rateLimit, clientIp } from "../middleware/rateLimit";
import { logAudit } from "../lib/audit";
import { randomToken } from "../lib/crypto";
import { getDb } from "../db/client";
import { userConsents, chatMessages } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      })
    )
    .max(40)
    .optional(),
});

const ASSISTANTS = {
  sofia: {
    name: "Sofia",
    system:
      "Você é Sofia, concierge premium da RJ+ People Care para clientes estrangeiros relocando para o Brasil. Tom: caloroso, sofisticado, confiável. Idioma padrão: o do cliente; se não detectar, português. Filosofia: 'Luxury is Security'. Responda de forma clara e útil, sem jargão financeiro pesado.",
    model: "claude-sonnet-4-20250514",
  },
  ana: {
    name: "Ana",
    system:
      "Você é Ana, assistente de investimentos da RJ+ Assessoria. Tom: profissional, calmo, sofisticado. Idioma padrão: português brasileiro. Filosofia: 'Luxury is Security'. Nunca dê recomendação personalizada de investimento sem antes recomendar conversa com assessor humano (CVM exige).",
    model: "claude-sonnet-4-20250514",
  },
} as const;

type AssistantId = keyof typeof ASSISTANTS;

async function streamAssistant(
  c: Context<{ Bindings: Env; Variables: { user: AuthUser; userId: string } }>,
  assistantId: AssistantId,
  body: z.infer<typeof chatSchema>,
  userId: string,
  env: Env
) {
  const assistant = ASSISTANTS[assistantId];
  const ip = clientIp(c);
  const ok = await rateLimit(c, `chat:${userId}:${ip}`, 30, 60);
  if (!ok) return c.json({ error: "rate_limited" }, 429);

  // Verificar consentimento ai_chat (linha mais recente da categoria)
  const db = getDb(env);
  const [consentCheck] = await db
    .select({ status: userConsents.status })
    .from(userConsents)
    .where(
      and(
        eq(userConsents.userId, userId),
        eq(userConsents.category, "ai_chat")
      )
    )
    .orderBy(desc(userConsents.grantedAt))
    .limit(1);
  const hasConsent = consentCheck?.status === "granted";

  const messages = [
    ...(body.history ?? []),
    { role: "user", content: body.message },
  ];

  // Persistir mensagem do user ANTES do call (não bloqueia stream)
  const userMsgId = randomToken(16);
  if (hasConsent) {
    db.insert(chatMessages)
      .values({
        id: userMsgId,
        userId,
        assistant: assistantId,
        role: "user",
        content: body.message,
        createdAt: Math.floor(Date.now() / 1000),
      })
      .catch((e: unknown) => console.error("chat_messages persist error:", e));
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: assistant.model,
      max_tokens: 1024,
      system: assistant.system,
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    console.error("anthropic error", upstream.status, text);
    return c.json({ error: "upstream_error" }, 502);
  }

  // Acumular stream + persistir resposta ao final.
  // Uso ctx.waitUntil pra GARANTIR que o INSERT completa mesmo após resposta terminar
  // (sem isso, Worker pode terminar e abortar a Promise → perda de dado).
  let fullText = "";
  const assistantMsgId = randomToken(16);
  const reader = upstream.body.getReader();
  const stream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
        if (hasConsent && fullText) {
          // Wrap in async IIFE to ensure Promise<void> type for waitUntil
          const persistPromise = (async () => {
            try {
              await db.insert(chatMessages).values({
                id: assistantMsgId,
                userId,
                assistant: assistantId,
                role: "assistant",
                content: fullText,
                createdAt: Math.floor(Date.now() / 1000),
              });
            } catch (e) {
              console.error("chat_messages assistant persist error:", e);
            }
          })();
          // ctx.waitUntil mantém Worker vivo até o INSERT completar
          c.executionCtx.waitUntil(persistPromise);
        }
        return;
      }
      // Extrair texto dos chunks Anthropic (format: data: {json})
      const text = new TextDecoder().decode(value);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            if (
              json.type === "content_block_delta" &&
              json.delta?.type === "text_delta"
            ) {
              fullText += json.delta.text;
            }
          } catch {
            // Ignorar parse errors de chunks incompletos
          }
        }
      }
      controller.enqueue(value);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export const chat = new Hono<{
  Bindings: Env;
  Variables: { user: AuthUser; userId: string };
}>()
  .use("*", requireAuth)
  .post("/sofia", zValidator("json", chatSchema), (c) =>
    streamAssistant(c, "sofia", c.req.valid("json"), c.var.userId, c.env)
  )
  .post("/ana", zValidator("json", chatSchema), (c) =>
    streamAssistant(c, "ana", c.req.valid("json"), c.var.userId, c.env)
  )
  .get("/:assistant/history", async (c) => {
    const a = c.req.param("assistant");
    if (a !== "sofia" && a !== "ana") return c.json({ error: "not_found" }, 404);
    const db = getDb(c.env);
    const msgs = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.userId, c.var.userId),
          eq(chatMessages.assistant, a),
          eq(chatMessages.anonymized, 0)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(50);
    return c.json({ messages: msgs.reverse() });
  })
  .delete("/:assistant/history", async (c) => {
    const a = c.req.param("assistant");
    if (a !== "sofia" && a !== "ana") return c.json({ error: "not_found" }, 404);
    const db = getDb(c.env);
    await db
      .update(chatMessages)
      .set({ content: "[anonymized]", anonymized: 1 })
      .where(
        and(
          eq(chatMessages.userId, c.var.userId),
          eq(chatMessages.assistant, a)
        )
      );
    await logAudit(c.env, {
      userId: c.var.userId,
      action: "chat.history.clear",
      resource: `assistant:${a}`,
    });
    return c.json({ status: "ok" });
  });
