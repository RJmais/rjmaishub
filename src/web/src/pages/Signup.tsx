import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Turnstile } from "react-turnstile";
import { apiFetch, isCaptchaError } from "../lib/api";

const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "0x4AAAAAAD5TkU2cC3N1hJfV";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [token, setToken] = useState("");
  // Remonta o widget do captcha a cada erro: o token do Turnstile é de uso
  // único e expira em ~5min, então reenviar o mesmo token depois de uma falha
  // é sempre recusado ("timeout-or-duplicate") — clicar de novo nunca resolvia.
  const [widgetKey, setWidgetKey] = useState(0);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [aiChat, setAiChat] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    name.length >= 2 &&
    email.includes("@") &&
    password.length >= 12 &&
    password === confirm &&
    privacy &&
    terms &&
    !!token &&
    !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone || undefined,
          consents: { privacy: true, terms: true, aiChat, marketing },
          turnstileToken: token,
        }),
      });
      setDone(true);
    } catch (err) {
      setError(
        isCaptchaError(err)
          ? "A verificação de segurança expirou. Ela já foi renovada — clique em “Criar conta” de novo."
          : err instanceof Error
            ? err.message
            : "Não foi possível criar sua conta agora."
      );
      setToken("");
      setWidgetKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8 text-center">
        <h1 className="font-display text-3xl text-rj-green-dark mb-3">
          Quase lá ✓
        </h1>
        <p className="text-rj-black/70 mb-6">
          Enviamos um email para <strong>{email}</strong>. Confirme seu email
          para entrar no RJ+ Hub.
        </p>
        <Link to="/login" className="text-rj-gold underline">
          Ir para login
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      <h1 className="font-display text-3xl text-rj-green-dark mb-2">
        Criar conta RJ+
      </h1>
      <p className="text-sm text-rj-black/70 mb-6">
        Acesso exclusivo para clientes RJ+.
      </p>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <label className="block">
          <span className="text-sm font-medium">Nome completo *</span>
          <input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Email *</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Telefone</span>
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Senha (mín. 12 caracteres) *</span>
          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Confirmar senha *</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
          />
        </label>

        <Turnstile
          key={widgetKey}
          sitekey={SITE_KEY}
          onVerify={setToken}
          onExpire={() => setToken("")}
          onError={() => setToken("")}
          refreshExpired="auto"
        />

        <fieldset className="border border-rj-beige-accent rounded-md p-3 space-y-2 text-sm">
          <legend className="px-1 text-rj-green-dark font-medium">
            Consentimentos
          </legend>
          <label className="flex gap-2 items-start">
            <input
              type="checkbox"
              required
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Li e aceito a{" "}
              <Link to="/privacidade" className="text-rj-gold underline">
                Política de Privacidade
              </Link>{" "}
              <span className="text-red-700">*</span>
            </span>
          </label>
          <label className="flex gap-2 items-start">
            <input
              type="checkbox"
              required
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Li e aceito os Termos de Uso{" "}
              <span className="text-red-700">*</span>
            </span>
          </label>
          <label className="flex gap-2 items-start">
            <input
              type="checkbox"
              checked={aiChat}
              onChange={(e) => setAiChat(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Permito que minhas conversas com Sofia e Ana sejam usadas para
              melhorar o serviço.
            </span>
          </label>
          <label className="flex gap-2 items-start">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Quero receber newsletter RJ+ News e convites RJ+ Experience.
            </span>
          </label>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-rj-gold text-rj-white font-medium py-2.5 rounded-md hover:bg-rj-gold-deep disabled:opacity-60"
        >
          {loading ? "Criando…" : "Criar conta"}
        </button>
      </form>

      <p className="text-sm text-center mt-6">
        Já tem conta?{" "}
        <Link to="/login" className="text-rj-gold underline">
          Entrar
        </Link>
      </p>
    </section>
  );
}
