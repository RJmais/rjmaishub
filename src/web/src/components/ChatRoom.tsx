import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { apiStream } from "../lib/api";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  assistantId: "sofia" | "ana";
  title: string;
  subtitle: string;
  welcome: string;
}

export default function ChatRoom({
  assistantId,
  title,
  subtitle,
  welcome,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: welcome },
  ]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    if (!draft.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: draft.trim() };
    const history = messages.slice(1);
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setDraft("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      let buf = "";
      for await (const chunk of apiStream(
        `/chat/${assistantId}`,
        { message: userMsg.content, history },
        ctrl.signal
      )) {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed?.delta?.text) {
            buf += parsed.delta.text;
          } else if (parsed?.content_block?.text) {
            buf += parsed.content_block.text;
          }
        } catch {
          buf += chunk;
        }
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: buf };
          return copy;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            "Desculpe, tive um problema agora. Tente novamente em instantes.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <section className="max-w-2xl mx-auto bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-[80dvh]">
      <header className="bg-rj-green-dark text-rj-white p-4">
        <p className="font-display text-2xl">{title}</p>
        <p className="text-xs text-rj-white/70">{subtitle}</p>
      </header>

      <ol
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-rj-beige-cream"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <li
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-rj-green-primary text-rj-white px-3 py-2 rounded-lg"
                : "mr-auto max-w-[85%] bg-white border border-rj-beige-accent px-3 py-2 rounded-lg"
            }
          >
            {m.content || "…"}
          </li>
        ))}
      </ol>

      <form
        className="flex gap-2 p-3 border-t border-rj-beige-accent bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="msg" className="sr-only">
          Sua mensagem
        </label>
        <input
          id="msg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Escreva para ${title}…`}
          disabled={streaming}
          className="flex-1 rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          className="bg-rj-gold text-rj-white px-4 rounded-md disabled:opacity-60"
          aria-label="Enviar"
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}
