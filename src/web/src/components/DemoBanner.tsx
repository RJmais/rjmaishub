/**
 * Mostra um banner se VITE_DEMO_MODE=true.
 * Avisa que backend não está conectado — login/chat não funcionam ainda.
 */
const isDemo =
  String(import.meta.env?.VITE_DEMO_MODE ?? "").toLowerCase() === "true";

export default function DemoBanner() {
  if (!isDemo) return null;
  return (
    <div
      role="status"
      className="bg-rj-gold text-rj-white text-center text-sm py-2 px-4"
    >
      🚧 <strong>Modo demonstração</strong> — backend ainda não conectado.
      Login, Sofia, Ana e dados não funcionam aqui. Você está vendo só o visual.
    </div>
  );
}
