import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";

export default function VerificarEmail() {
  const { token } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    apiFetch(`/auth/verify-email/${encodeURIComponent(token)}`, { method: "POST" })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8 text-center">
      {state === "loading" && (
        <p className="text-rj-black/70">Verificando seu email…</p>
      )}
      {state === "ok" && (
        <>
          <h1 className="font-display text-3xl text-rj-green-dark mb-3">
            Email confirmado ✓
          </h1>
          <p className="text-rj-black/70 mb-4">
            Sua conta está pronta. Bem-vinda(o) ao RJ+ Hub.
          </p>
          <Link
            to="/login"
            className="inline-block bg-rj-gold text-rj-white px-6 py-2.5 rounded-md"
          >
            Entrar
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="font-display text-3xl text-rj-green-dark mb-3">
            Link inválido
          </h1>
          <p className="text-rj-black/70">
            Este link expirou ou já foi usado. Entre na sua conta para reenviar.
          </p>
          <Link to="/login" className="text-rj-gold underline mt-3 inline-block">
            Ir para login
          </Link>
        </>
      )}
    </section>
  );
}
