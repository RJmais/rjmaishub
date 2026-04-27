import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

interface Consent {
  category: string;
  status: "granted" | "revoked";
}

const CATEGORIES = [
  { key: "ai_chat", label: "Conversas com Sofia/Ana usadas pra melhorar o serviço" },
  { key: "marketing", label: "Newsletter e convites RJ+ Experience" },
  { key: "analytics_cookies", label: "Cookies de analytics (anônimos)" },
  { key: "marketing_cookies", label: "Cookies de marketing" },
];

type Tab = "conta" | "seguranca" | "privacidade";

export default function Configuracoes() {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>("conta");
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "privacidade") return;
    apiFetch<{ items: Consent[] }>("/consents")
      .then((r) => setConsents(r.items ?? []))
      .catch(() => setConsents([]));
  }, [tab]);

  function isGranted(cat: string) {
    const c = consents.find((x) => x.category === cat);
    return c?.status === "granted";
  }

  async function toggleConsent(cat: string, granted: boolean) {
    setLoading(true);
    try {
      await apiFetch("/consents", {
        method: "POST",
        body: JSON.stringify({
          category: cat,
          status: granted ? "granted" : "revoked",
        }),
      });
      const r = await apiFetch<{ items: Consent[] }>("/consents");
      setConsents(r.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function exportData() {
    setMsg("Preparando seu pacote LGPD…");
    try {
      const res = await fetch("/api/data/export", { credentials: "include" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meus-dados-rjmais.zip";
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Download iniciado.");
    } catch {
      setMsg("Não foi possível exportar agora — tente novamente.");
    }
  }

  async function deleteAccount() {
    const confirm1 = window.confirm(
      "Tem certeza que quer excluir sua conta? Você terá 30 dias para cancelar."
    );
    if (!confirm1) return;
    const confirm2 = window.prompt(
      "Para confirmar, digite EXCLUIR (em maiúsculas):"
    );
    if (confirm2 !== "EXCLUIR") return;
    await apiFetch("/data/delete", { method: "POST" });
    setMsg("Sua conta foi marcada para exclusão. Email de confirmação enviado.");
  }

  if (!user) return null;

  return (
    <section className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-3xl text-rj-green-dark">Configurações</h1>
        <p className="text-rj-black/70">{user.email}</p>
      </header>

      <nav role="tablist" className="flex gap-2 border-b border-rj-beige-accent">
        {(["conta", "seguranca", "privacidade"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "px-4 py-2 border-b-2 border-rj-gold text-rj-green-dark font-medium"
                : "px-4 py-2 text-rj-black/60 hover:text-rj-green-dark"
            }
          >
            {t === "conta" && "Conta"}
            {t === "seguranca" && "Segurança"}
            {t === "privacidade" && "Privacidade (LGPD)"}
          </button>
        ))}
      </nav>

      {tab === "conta" && (
        <div className="bg-white rounded-md shadow-sm p-6 space-y-3">
          <p>
            <span className="text-sm text-rj-black/60">Nome:</span>{" "}
            <strong>{user.name}</strong>
          </p>
          <p>
            <span className="text-sm text-rj-black/60">Email:</span>{" "}
            <strong>{user.email}</strong>{" "}
            {!user.emailVerified && (
              <span className="text-amber-700 text-sm">(não verificado)</span>
            )}
          </p>
          <p>
            <span className="text-sm text-rj-black/60">Plano:</span>{" "}
            <strong className="capitalize">{user.tier}</strong>
          </p>
          <p className="text-xs text-rj-black/50 mt-4">
            Para alterar nome ou telefone, fale com seu assessor (Fase 2.1 — em
            implementação).
          </p>
        </div>
      )}

      {tab === "seguranca" && (
        <div className="bg-white rounded-md shadow-sm p-6 space-y-4">
          <div>
            <p className="font-medium mb-1">Verificação em duas etapas (2FA)</p>
            <p className="text-sm text-rj-black/70 mb-3">
              {user.has2fa
                ? "Ativada. Recomendamos manter."
                : "Recomendado. Adiciona uma camada extra de segurança."}
            </p>
            <button
              type="button"
              className={
                user.has2fa
                  ? "border border-rj-green-dark text-rj-green-dark px-4 py-2 rounded-md"
                  : "bg-rj-gold text-rj-white px-4 py-2 rounded-md"
              }
              onClick={() => alert("Fluxo 2FA em desenvolvimento — Fase 2.1")}
            >
              {user.has2fa ? "Desativar 2FA" : "Ativar 2FA"}
            </button>
          </div>
          <hr className="border-rj-beige-accent" />
          <button
            type="button"
            onClick={() => alert("Lista de sessões — Fase 2.1")}
            className="text-rj-gold underline text-sm"
          >
            Ver sessões ativas
          </button>
        </div>
      )}

      {tab === "privacidade" && (
        <div className="space-y-4">
          <div className="bg-white rounded-md shadow-sm p-6 space-y-4">
            <p className="font-medium">Suas escolhas de consentimento</p>
            <ul className="space-y-3">
              {CATEGORIES.map((cat) => (
                <li
                  key={cat.key}
                  className="flex items-start gap-3 justify-between"
                >
                  <label className="flex-1 text-sm">{cat.label}</label>
                  <input
                    type="checkbox"
                    checked={isGranted(cat.key)}
                    disabled={loading}
                    onChange={(e) => toggleConsent(cat.key, e.target.checked)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-md shadow-sm p-6 space-y-3">
            <p className="font-medium">Seus direitos LGPD</p>
            <button
              type="button"
              onClick={exportData}
              className="block bg-rj-green-primary text-rj-white px-4 py-2 rounded-md"
            >
              Exportar todos os meus dados (.zip)
            </button>
            <button
              type="button"
              onClick={deleteAccount}
              className="block border border-red-700 text-red-700 px-4 py-2 rounded-md"
            >
              Excluir minha conta
            </button>
            <a
              href="mailto:dpo@rjmais.com"
              className="block text-rj-gold underline"
            >
              Falar com o DPO
            </a>
          </div>

          {msg && (
            <p role="status" className="text-sm text-rj-green-dark">
              {msg}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
