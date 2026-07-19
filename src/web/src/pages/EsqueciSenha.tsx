import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Turnstile } from "react-turnstile";
import { apiFetch } from "../lib/api";

const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "0x4AAAAAAD5TkU2cC3N1hJfV";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email, turnstileToken: token }),
      });
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      <h1 className="font-display text-3xl text-rj-green-dark mb-2">
        Esqueci minha senha
      </h1>
      {sent ? (
        <p className="text-rj-black/80">
          Se houver uma conta com este email, enviamos as instruções para
          redefinir sua senha. Verifique sua caixa de entrada e a pasta de spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-rj-black/70">
            Informe seu email cadastrado e enviaremos um link para criar uma
            nova senha.
          </p>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
            />
          </label>
          <Turnstile sitekey={SITE_KEY} onVerify={setToken} />
          <button
            type="submit"
            disabled={loading || !token || !email}
            className="w-full bg-rj-gold text-rj-white font-medium py-2.5 rounded-md hover:bg-rj-gold-deep disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="text-rj-gold underline">
          Voltar para login
        </Link>
      </p>
    </section>
  );
}
