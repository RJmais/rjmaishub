/**
 * Wrapper Resend — assinatura `sendEmail(apiKey, { to, subject, html })`.
 * Sem-op (apenas log) se apiKey ausente, pra rodar em dev sem Resend.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(
  apiKey: string | undefined,
  params: SendEmailParams
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!apiKey) {
    console.log("[email stub]", params.to, "·", params.subject);
    return { ok: true, id: "stub" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from ?? "RJ+ Hub <relacionamento@rjmais.com>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("resend error", res.status, text);
    return { ok: false, error: text };
  }
  const data = (await res.json()) as { id: string };
  return { ok: true, id: data.id };
}

/* ─────── Templates (PT-BR, brand RJ+) ─────── */

const HEADER = `
  <div style="background:#2A3820;padding:24px;text-align:center;">
    <img src="https://chat.rjpeoplecare.com/rjplus-logo-white.png" alt="RJ+" height="32" />
  </div>`;
const FOOTER = `
  <div style="background:#EEE8DC;padding:16px;font-size:12px;color:#1d1d1d;text-align:center;">
    RJ+ Assessoria de Investimentos · Luxury is Security<br/>
    Você recebeu este email porque possui uma conta no RJ+ Hub.
  </div>`;

function wrap(body: string): string {
  return `<!doctype html><html><body style="margin:0;font-family:Verdana,sans-serif;color:#1d1d1d;background:#EEE8DC;">${HEADER}<div style="background:#fff;max-width:560px;margin:0 auto;padding:24px;">${body}</div>${FOOTER}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const emailTemplates = {
  verifyEmail(name: string, link: string) {
    return wrap(`
      <h1 style="font-family:Verdana,Geneva,sans-serif;color:#2A3820;">Bem-vinda(o) à RJ+</h1>
      <p>Olá, ${escapeHtml(name)}.</p>
      <p>Confirme seu email clicando no botão abaixo:</p>
      <p><a href="${link}" style="display:inline-block;background:#B8923E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Confirmar email</a></p>
      <p style="font-size:12px;color:#666">Se não foi você, ignore este email.</p>
    `);
  },
  resetPassword(name: string, link: string) {
    return wrap(`
      <h1 style="font-family:Verdana,Geneva,sans-serif;color:#2A3820;">Redefinir senha</h1>
      <p>Olá, ${escapeHtml(name)}.</p>
      <p>Clique no botão abaixo para criar uma nova senha. O link é válido por 1 hora.</p>
      <p><a href="${link}" style="display:inline-block;background:#B8923E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Redefinir senha</a></p>
      <p style="font-size:12px;color:#666">Se não foi você, ignore — sua senha continua a mesma.</p>
    `);
  },
  securityAlert(name: string, eventLabel: string, ip: string) {
    return wrap(`
      <h1 style="font-family:Verdana,Geneva,sans-serif;color:#2A3820;">Alerta de segurança</h1>
      <p>Olá, ${escapeHtml(name)}.</p>
      <p>Detectamos: <strong>${escapeHtml(eventLabel)}</strong> · IP ${escapeHtml(ip)}.</p>
      <p>Se foi você, pode ignorar. Se não, recomendamos trocar sua senha imediatamente.</p>
    `);
  },
};
