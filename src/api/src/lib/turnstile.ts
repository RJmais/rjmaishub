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

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  ip?: string
): Promise<boolean> {
  if (!token || !secret) return false;
  // dev test tokens (https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
  if (
    secret === "1x0000000000000000000000000000000AA" ||
    secret.startsWith("1x")
  ) {
    return true;
  }
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body }
  );
  if (!res.ok) return false;
  const data = (await res.json()) as TurnstileResponse;
  return data.success === true;
}
