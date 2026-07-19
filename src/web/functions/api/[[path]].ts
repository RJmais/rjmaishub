/**
 * Pages Function — ponte /api/* → Worker rjmaishub-api.
 *
 * O SPA (src/web/src/lib/api.ts) chama `fetch("/api" + path)` relativo, mas o
 * Worker (src/api/src/index.ts) monta as rotas SEM prefixo /api (/auth/login,
 * /health, /chat, ...). Em dev isso é resolvido pelo proxy do Vite
 * (src/web/vite.config.ts, rewrite: `path.replace(/^\/api/, "")`); em produção,
 * como o SPA (Pages "rjmaishub") e a API (Worker "rjmaishub-api") são dois
 * deploys Cloudflare separados sem custom domain compartilhado, esta Pages
 * Function faz o mesmo papel: remove o prefixo /api e encaminha pro Worker.
 *
 * Ordem de resolução do destino:
 *   1. Service Binding `API` (context.env.API — ver src/web/wrangler.toml,
 *      [[services]] binding = "API" -> service = "rjmaishub-api"). Chamada
 *      interna entre Worker/Pages Function, sem sair pra internet.
 *   2. Fallback: fetch HTTP direto pro Worker publicado em *.workers.dev — só
 *      entra em jogo se o binding não estiver configurado (ex.: alguém rodar
 *      `wrangler pages dev` neste diretório sem o wrangler.toml, ou ambiente
 *      onde o binding ainda não foi provisionado).
 *
 * Passthrough total: método, headers (Cookie/Set-Cookie inclusos), querystring
 * e body são preservados via `new Request(url, request)` — o padrão oficial da
 * Cloudflare pra reescrever a URL de um Request imutável, ver
 * https://developers.cloudflare.com/workers/runtime-apis/request/#background
 * ("You may also want to construct a Request yourself when you need to modify
 * a request object... const modifiedRequest = new Request(url, request)").
 * O body NÃO é bufferizado — continua como stream, o que é exigido pelo SSE
 * do chat (Sofia/Ana) em `apiStream()` (src/web/src/lib/api.ts): a Response do
 * Worker é devolvida como veio, sem reconstrução.
 */

/**
 * Fetcher mínimo — mesmo shape do tipo oficial em `@cloudflare/workers-types`
 * (usado em src/api), declarado localmente aqui porque o workspace src/web
 * não tem essa dependência instalada. Evita adicionar uma devDependency nova
 * só pra tipar este arquivo; o formato do export (`onRequest`) é o que
 * importa em runtime — o wrangler/esbuild removem os tipos no bundle.
 */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  /** Service Binding opcional → Worker "rjmaishub-api" (ver src/web/wrangler.toml). */
  API?: Fetcher;
}

interface EventContext<E> {
  request: Request;
  env: E;
  params: Record<string, string | string[]>;
  waitUntil(promise: Promise<unknown>): void;
  next(input?: Request | string, init?: RequestInit): Promise<Response>;
  passThroughOnException(): void;
}

/** Shape local equivalente ao `PagesFunction<Env>` oficial (mesma razão acima). */
type PagesFunction<E = unknown> = (
  context: EventContext<E>
) => Response | Promise<Response>;

/** Só usado se o Service Binding `API` não existir (ver comentário no topo). */
const FALLBACK_WORKER_ORIGIN = "https://rjmaishub-api.pilarmoret.workers.dev";

/**
 * Marca por onde a requisição passou (`X-Hub-Proxy: binding | fallback`).
 * O caminho fallback NÃO é equivalente ao binding: o Worker passa a enxergar
 * o IP de egress compartilhado da Cloudflare em CF-Connecting-IP, o que
 * globaliza o rate-limit de auth (signup 3/h, login 5/min PARA TODOS os
 * clientes juntos) e polui o audit log — por isso o header precisa existir,
 * para o smoke test pós-deploy exigir `binding` e denunciar provisionamento
 * incompleto do service binding no primeiro minuto.
 */
function withProxyMarker(res: Response, via: "binding" | "fallback"): Response {
  const marked = new Response(res.body, res);
  marked.headers.set("X-Hub-Proxy", via);
  return marked;
}

/**
 * Remove o prefixo /api do pathname (mesma regra do proxy Vite) e,
 * opcionalmente, troca o origin pelo do worker de fallback. Preserva
 * querystring (fica intacta em url.search, não tocamos nela).
 */
function rewriteTarget(requestUrl: string, workerOrigin?: string): string {
  const url = new URL(requestUrl);
  url.pathname = url.pathname.replace(/^\/api/, "") || "/";
  if (workerOrigin) {
    const origin = new URL(workerOrigin);
    url.protocol = origin.protocol;
    url.host = origin.host;
  }
  return url.toString();
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (env.API) {
    // Service Binding já resolve o destino — só precisamos ajustar o path.
    const target = rewriteTarget(request.url);
    const res = await env.API.fetch(new Request(target, request));
    return withProxyMarker(res, "binding");
  }

  // Sem binding: reescreve path E troca origin pro worker publicado.
  console.warn(
    "[hub-proxy] Service binding API ausente — usando fallback workers.dev; " +
      "rate-limit degradado (IP de egress compartilhado). Provisionar o " +
      "binding via src/web/wrangler.toml ([[services]] API -> rjmaishub-api)."
  );
  const target = rewriteTarget(request.url, FALLBACK_WORKER_ORIGIN);
  const res = await fetch(new Request(target, request));
  return withProxyMarker(res, "fallback");
};
