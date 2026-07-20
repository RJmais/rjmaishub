/**
 * Verifica token Turnstile no servidor.
 * Skipa em ENVIRONMENT=development com token de teste.
 */

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export interface TurnstileResult {
  ok: boolean;
  /** error-codes do siteverify — vão pro audit_log p/ diagnóstico. */
  codes: string[];
}

/**
 * NÃO enviamos `remoteip`: é opcional na API da Cloudflare e é fonte de falso
 * negativo em rede dual-stack (o desafio pode ser resolvido por IPv4 enquanto a
 * conexão ao site chega por IPv6). O token já é ligado ao desafio e ao domínio.
 */
export async function verifyTurnstileToken(
  token: string,
  secret: string
): Promise<TurnstileResult> {
  if (!token || !secret) return { ok: false, codes: ["missing-input"] };
  // dev test tokens (https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
  if (
    secret === "1x0000000000000000000000000000000AA" ||
    secret.startsWith("1x")
  ) {
    return { ok: true, codes: [] };
  }
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body }
  );
  if (!res.ok) return { ok: false, codes: [`siteverify-http-${res.status}`] };
  const data = (await res.json()) as TurnstileResponse;
  const codes = data["error-codes"] ?? [];
  if (data.success !== true) {
    console.warn("[turnstile] verificação recusada:", codes.join(",") || "(sem código)");
  }
  return { ok: data.success === true, codes };
}
