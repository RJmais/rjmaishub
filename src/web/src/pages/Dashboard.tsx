import { Link } from "react-router-dom";
import {
  MessageCircle,
  Sparkles,
  Phone,
  CalendarDays,
  Newspaper,
  HelpCircle,
  Gift,
  TrendingUp,
} from "lucide-react";

const CARDS = [
  {
    to: "/sofia",
    title: "Sofia",
    desc: "Concierge premium · People Care",
    icon: Sparkles,
  },
  {
    to: "/ana",
    title: "Ana",
    desc: "Assistente de investimentos",
    icon: MessageCircle,
  },
  {
    to: "/assessor",
    title: "Falar com seu assessor",
    desc: "WhatsApp, email ou agenda",
    icon: Phone,
  },
  {
    to: "/eventos",
    title: "Experience",
    desc: "Calendário de eventos VIP",
    icon: CalendarDays,
  },
  {
    to: "/noticias",
    title: "RJ+ News",
    desc: "Revista digital semanal",
    icon: Newspaper,
  },
  {
    to: "/indicar",
    title: "Indicar e ganhar",
    desc: "Convide e seja recompensado",
    icon: Gift,
  },
  {
    to: "/ajuda",
    title: "Central de ajuda",
    desc: "FAQs e suporte",
    icon: HelpCircle,
  },
] as const;

export default function Dashboard() {
  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <p className="text-sm uppercase tracking-widest text-rj-gold">
          Boas-vindas
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-rj-green-dark">
          Sua área RJ+
        </h1>
        <p className="text-rj-black/70 max-w-xl">
          Tudo que importa, num só lugar — atendimento, eventos, conteúdo e seu
          patrimônio.
        </p>
      </header>

      <article className="bg-white rounded-lg shadow-md p-6 border-l-4 border-rj-gold">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="text-rj-green-primary" />
          <h2 className="font-display text-2xl text-rj-green-dark">
            Sua carteira
          </h2>
        </div>
        <p className="text-sm text-rj-black/70">
          Em breve seu dashboard de investimentos integrado. Por enquanto, fale
          com seu assessor para saber sua posição atualizada.
        </p>
      </article>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.to}>
              <Link
                to={c.to}
                className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 h-full focus-visible:outline-2 focus-visible:outline-rj-gold"
              >
                <Icon className="text-rj-green-primary mb-3" />
                <h3 className="font-display text-xl text-rj-green-dark">
                  {c.title}
                </h3>
                <p className="text-sm text-rj-black/70 mt-1">{c.desc}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
