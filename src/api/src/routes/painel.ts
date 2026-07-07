import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../index";
import { timingSafeEqual } from "../lib/crypto";
import { getDb } from "../db/client";
import { painelIncidentes } from "../db/schema";
import { eq, desc, or, ilike } from "drizzle-orm";

/**
 * Painel de TI — RJ+ (painel-ti-rjmais.pages.dev)
 *
 * Endpoints que alimentam o painel com os formatos de `types.ts` do frontend:
 *  - GET  /painel/saude               → healthcheck ao vivo dos sistemas públicos
 *  - GET  /painel/incidentes?q=&estado= → histórico persistente com busca
 *  - POST /painel/incidentes          → cria/atualiza incidente
 *  - PATCH /painel/incidentes/:id     → muda estado e anexa evento à linha do tempo
 *
 * Autenticação: Bearer PAINEL_TOKEN (secret do Worker). O frontend nunca
 * fala com estes endpoints diretamente — a Pages Function do painel faz o
 * proxy server-side com o token, atrás do Basic auth do próprio painel.
 */

export const painel = new Hono<{ Bindings: Env }>();

// ── Autenticação ─────────────────────────────────────────────────────────────

painel.use("*", async (c, next) => {
  const token = c.env.PAINEL_TOKEN;
  if (!token) {
    // Fail closed: sem token configurado, o módulo fica indisponível.
    return c.json({ error: "Painel indisponível: PAINEL_TOKEN não configurado." }, 503);
  }
  const cabecalho = c.req.header("Authorization") ?? "";
  const fornecido = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
  if (!fornecido || !timingSafeEqual(fornecido, token)) {
    return c.json({ error: "Não autorizado." }, 401);
  }
  await next();
});

// ── Healthcheck ao vivo ──────────────────────────────────────────────────────

interface AlvoSaude {
  id: string;
  nome: string;
  categoria: string;
  url: string;
  dependeDe: string[];
}

const ALVOS_SAUDE: AlvoSaude[] = [
  { id: "ana", nome: "Ana — Chatbot RJ+", categoria: "Chatbot", url: "https://ana-rjmais.pages.dev", dependeDe: ["Cloudflare Pages", "API Anthropic", "HubSpot"] },
  { id: "sofia", nome: "Sofia — Chatbot People Care", categoria: "Chatbot", url: "https://chat.rjpeoplecare.com", dependeDe: ["Cloudflare Pages", "API Anthropic", "HubSpot"] },
  { id: "site-hq", nome: "HQ by Pilar", categoria: "Site", url: "https://hq-by-pilar.pages.dev", dependeDe: ["Cloudflare Pages"] },
  { id: "mercado", nome: "Fechamento de Mercado", categoria: "Site", url: "https://fechamento-de-mercado-rjmais.pages.dev", dependeDe: ["Cloudflare Pages"] },
  { id: "calendario", nome: "Calendário RJ+", categoria: "Site", url: "https://calendariorjmais.pages.dev", dependeDe: ["Cloudflare Pages"] },
  { id: "estudio", nome: "Estúdio RJ+ (Worker)", categoria: "Automação", url: "https://estudio-rjmais.pilarmoret.workers.dev", dependeDe: ["Cloudflare Workers"] },
];

interface ResultadoSaude {
  id: string;
  nome: string;
  categoria: string;
  status: "ok" | "atencao" | "critico" | "neutro";
  latenciaMs: number | null;
  httpStatus: number | null;
  dependeDe: string[];
  verificadoEm: number; // epoch ms
}

async function verificarAlvo(alvo: AlvoSaude): Promise<ResultadoSaude> {
  const inicio = Date.now();
  try {
    const resposta = await fetch(alvo.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "painel-ti-rjmais/1.0 (healthcheck)" },
    });
    const latenciaMs = Date.now() - inicio;
    // 401/403 contam como "no ar": o serviço respondeu, só exige credencial.
    const noAr = resposta.status < 500;
    return {
      id: alvo.id,
      nome: alvo.nome,
      categoria: alvo.categoria,
      status: noAr ? (latenciaMs > 4000 ? "atencao" : "ok") : "critico",
      latenciaMs,
      httpStatus: resposta.status,
      dependeDe: alvo.dependeDe,
      verificadoEm: Date.now(),
    };
  } catch {
    return {
      id: alvo.id,
      nome: alvo.nome,
      categoria: alvo.categoria,
      status: "critico",
      latenciaMs: null,
      httpStatus: null,
      dependeDe: alvo.dependeDe,
      verificadoEm: Date.now(),
    };
  }
}

painel.get("/saude", async (c) => {
  const resultados = await Promise.all(ALVOS_SAUDE.map(verificarAlvo));
  const comProblema = resultados.filter((r) => r.status !== "ok").length;
  return c.json({
    verificadoEm: Date.now(),
    total: resultados.length,
    comProblema,
    sistemas: resultados,
  });
});

// ── Incidentes: histórico persistente com busca ──────────────────────────────

const SEVERIDADES = ["critico", "alto", "medio", "baixo"] as const;
const ESTADOS = ["aberto", "em_andamento", "resolvido"] as const;

const esquemaIncidente = z.object({
  id: z.string().regex(/^INC-\d{3,}$/, "id no formato INC-000"),
  titulo: z.string().min(3).max(300),
  severidade: z.enum(SEVERIDADES),
  estado: z.enum(ESTADOS).default("aberto"),
  sistema: z.string().min(1).max(120),
  responsavel: z.string().min(1).max(120),
  impacto: z.string().min(1).max(2000),
  linhaDoTempo: z
    .array(z.object({ hora: z.string().max(40), evento: z.string().max(1000) }))
    .default([]),
  abertoEm: z.number().int().positive(),
  resolvidoEm: z.number().int().positive().nullable().default(null),
});

painel.get("/incidentes", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const estado = c.req.query("estado")?.trim() ?? "";
  const db = getDb(c.env);

  const filtros = [];
  if (q) {
    const padrao = `%${q}%`;
    filtros.push(
      or(
        ilike(painelIncidentes.titulo, padrao),
        ilike(painelIncidentes.impacto, padrao),
        ilike(painelIncidentes.sistema, padrao),
        ilike(painelIncidentes.id, padrao)
      )
    );
  }
  if (estado && (ESTADOS as readonly string[]).includes(estado)) {
    filtros.push(eq(painelIncidentes.estado, estado));
  }

  let consulta = db.select().from(painelIncidentes).$dynamic();
  for (const filtro of filtros) {
    consulta = consulta.where(filtro);
  }
  const linhas = await consulta.orderBy(desc(painelIncidentes.abertoEm)).limit(100);
  return c.json({ total: linhas.length, incidentes: linhas });
});

painel.post("/incidentes", zValidator("json", esquemaIncidente), async (c) => {
  const dados = c.req.valid("json");
  const agora = Date.now();
  const db = getDb(c.env);

  await db
    .insert(painelIncidentes)
    .values({ ...dados, criadoEm: agora, atualizadoEm: agora })
    .onConflictDoUpdate({
      target: painelIncidentes.id,
      set: { ...dados, atualizadoEm: agora },
    });

  return c.json({ ok: true, id: dados.id }, 201);
});

const esquemaAtualizacao = z.object({
  estado: z.enum(ESTADOS).optional(),
  evento: z.object({ hora: z.string().max(40), evento: z.string().max(1000) }).optional(),
  resolvidoEm: z.number().int().positive().nullable().optional(),
});

painel.patch("/incidentes/:id", zValidator("json", esquemaAtualizacao), async (c) => {
  const id = c.req.param("id");
  const dados = c.req.valid("json");
  const db = getDb(c.env);

  const [existente] = await db
    .select()
    .from(painelIncidentes)
    .where(eq(painelIncidentes.id, id))
    .limit(1);
  if (!existente) return c.json({ error: "Incidente não encontrado." }, 404);

  await db
    .update(painelIncidentes)
    .set({
      ...(dados.estado ? { estado: dados.estado } : {}),
      ...(dados.resolvidoEm !== undefined ? { resolvidoEm: dados.resolvidoEm } : {}),
      ...(dados.evento
        ? { linhaDoTempo: [...existente.linhaDoTempo, dados.evento] }
        : {}),
      atualizadoEm: Date.now(),
    })
    .where(eq(painelIncidentes.id, id));

  return c.json({ ok: true, id });
});
