import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError("A senha deve ter ao menos 12 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      navigate("/login?reset=ok", { replace: true });
    } catch {
      setError("Token inválido ou expirado. Solicite um novo link.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
        <p className="text-rj-black/80">Link inválido.</p>
        <Link to="/esqueci-senha" className="text-rj-gold underline">
          Solicitar novo link
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      <h1 className="font-display text-3xl text-rj-green-dark mb-4">
        Criar nova senha
      </h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Nova senha (mín. 12 caracteres)</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Confirmar senha</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rj-gold text-rj-white font-medium py-2.5 rounded-md hover:bg-rj-gold-deep disabled:opacity-60"
        >
          {loading ? "Salvando…" : "Definir senha"}
        </button>
      </form>
    </section>
  );
}
