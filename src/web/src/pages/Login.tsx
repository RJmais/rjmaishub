import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Turnstile } from "react-turnstile";
import { apiFetch } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resetOk = params.get("reset") === "ok";

  const refresh = useAuth((s) => s.refresh);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<
        | { needs2fa: true; tempToken: string }
        | { user: { id: string; email: string; name: string; tier: string } }
      >("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, turnstileToken: token }),
      });
      if ("needs2fa" in res) {
        setTempToken(res.tempToken);
      } else {
        await refresh(); // pega user completo via /auth/me
        navigate("/dashboard", { replace: true });
      }
    } catch {
      setError("Email ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit2fa(e: React.FormEvent) {
    e.preventDefault();
    if (!tempToken) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/login/2fa", {
        method: "POST",
        body: JSON.stringify({ tempToken, code }),
      });
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      <h1 className="font-display text-3xl text-rj-green-dark mb-2">
        Entrar no RJ+ Hub
      </h1>
      {resetOk && (
        <p className="text-sm text-rj-green-primary mb-3">
          Senha redefinida. Faça login com sua nova senha.
        </p>
      )}

      {!tempToken ? (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
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
            <span className="text-sm font-medium">Senha</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
            />
          </label>
          <Turnstile sitekey={SITE_KEY} onVerify={setToken} />
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-rj-gold text-rj-white font-medium py-2.5 rounded-md hover:bg-rj-gold-deep disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <div className="flex justify-between text-sm">
            <Link to="/esqueci-senha" className="text-rj-gold underline">
              Esqueci minha senha
            </Link>
            <Link to="/signup" className="text-rj-gold underline">
              Criar conta
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={onSubmit2fa} className="space-y-4">
          <p className="text-sm text-rj-black/70">
            Sua conta tem verificação em 2 etapas. Digite o código do seu
            aplicativo autenticador (ou um backup code).
          </p>
          <label className="block">
            <span className="text-sm font-medium">Código (6 dígitos ou XXXX-XXXX)</span>
            <input
              type="text"
              required
              autoComplete="one-time-code"
              inputMode="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold tracking-widest"
              placeholder="123456"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !code}
            className="w-full bg-rj-gold text-rj-white font-medium py-2.5 rounded-md hover:bg-rj-gold-deep disabled:opacity-60"
          >
            {loading ? "Verificando…" : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => setTempToken(null)}
            className="w-full text-sm text-rj-black/60 underline"
          >
            Voltar
          </button>
        </form>
      )}
    </section>
  );
}
