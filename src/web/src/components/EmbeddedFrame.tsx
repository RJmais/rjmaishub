import { useEffect, useState } from "react";

interface EmbeddedFrameProps {
  src: string;
  title: string;
}

const LOAD_TIMEOUT_MS = 15000;
const FRAME_HEIGHT = "min(80dvh, 800px)";

export default function EmbeddedFrame({ src, title }: EmbeddedFrameProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== "loading") return;
    const timer = setTimeout(() => setStatus("error"), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status, attempt]);

  if (status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ height: FRAME_HEIGHT }}
      >
        <p className="text-rj-black/70">
          Não foi possível carregar {title} agora.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAttempt((n) => n + 1);
              setStatus("loading");
            }}
            className="bg-rj-gold text-rj-white px-4 py-2 rounded-md hover:bg-rj-gold-deep"
          >
            Tentar novamente
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="border border-rj-green-dark text-rj-green-dark px-4 py-2 rounded-md"
          >
            Abrir em nova aba
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: FRAME_HEIGHT }}>
      {status === "loading" && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-rj-beige-bg/60"
        >
          <p className="text-sm text-rj-black/60">Carregando {title}…</p>
        </div>
      )}
      <iframe
        key={attempt}
        src={src}
        title={title}
        className="w-full h-full"
        style={{ border: 0 }}
        onLoad={() => setStatus("ready")}
      />
    </div>
  );
}
