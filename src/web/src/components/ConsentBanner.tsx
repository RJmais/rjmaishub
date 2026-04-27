import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const COOKIE_KEY = "rj_consent_v1";

interface Choices {
  analytics: boolean;
  marketing: boolean;
}

function readCookie(): Choices | null {
  const m = document.cookie.match(new RegExp(`${COOKIE_KEY}=([^;]+)`));
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1]!));
  } catch {
    return null;
  }
}

function writeCookie(c: Choices) {
  const expires = new Date(Date.now() + 365 * 86400 * 1000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(
    JSON.stringify(c)
  )}; Path=/; Expires=${expires}; SameSite=Strict`;
}

export default function ConsentBanner() {
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!readCookie()) setOpen(true);
  }, []);

  async function save(choices: Choices) {
    writeCookie(choices);
    setOpen(false);
    if (user) {
      await apiFetch("/consents", {
        method: "POST",
        body: JSON.stringify({
          category: "analytics_cookies",
          status: choices.analytics ? "granted" : "revoked",
        }),
      }).catch(() => {});
      await apiFetch("/consents", {
        method: "POST",
        body: JSON.stringify({
          category: "marketing_cookies",
          status: choices.marketing ? "granted" : "revoked",
        }),
      }).catch(() => {});
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed bottom-0 left-0 right-0 z-40 bg-rj-green-dark text-rj-white shadow-lg"
    >
      <div className="container py-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex-1 text-sm">
          <p className="font-display text-lg mb-1">Sua privacidade importa</p>
          <p>
            Usamos cookies essenciais sempre. Você pode permitir analytics e
            marketing —{" "}
            <a href="/privacidade" className="text-rj-gold underline">
              ler política
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            Analytics
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            Marketing
          </label>
          <button
            type="button"
            onClick={() => save({ analytics, marketing })}
            className="bg-rj-beige-bg text-rj-green-dark px-4 py-2 rounded-md font-medium"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => save({ analytics: true, marketing: true })}
            className="bg-rj-gold text-rj-white px-4 py-2 rounded-md font-medium"
          >
            Aceitar tudo
          </button>
          <button
            type="button"
            onClick={() => save({ analytics: false, marketing: false })}
            className="text-rj-white/80 underline"
          >
            Recusar opcionais
          </button>
        </div>
      </div>
    </div>
  );
}
