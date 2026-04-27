import { Phone, Mail, CalendarPlus } from "lucide-react";

export default function Assessor() {
  return (
    <section className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      <h1 className="font-display text-3xl text-rj-green-dark mb-2">
        Falar com seu assessor
      </h1>
      <p className="text-rj-black/70 mb-6">
        Escolha o canal mais conveniente — nosso time RJ+ responde rapidamente.
      </p>
      <ul className="space-y-3">
        <li>
          <a
            href="https://wa.me/5521982259446?text=Ol%C3%A1!%20Quero%20falar%20com%20meu%20assessor%20RJ%2B."
            className="flex items-center gap-3 p-4 rounded-md bg-rj-green-primary text-rj-white hover:bg-rj-green-dark"
          >
            <Phone /> WhatsApp · +55 21 98225-9446
          </a>
        </li>
        <li>
          <a
            href="mailto:relacionamento@rjmais.com"
            className="flex items-center gap-3 p-4 rounded-md border border-rj-beige-accent hover:bg-rj-beige-bg"
          >
            <Mail /> relacionamento@rjmais.com
          </a>
        </li>
        <li>
          <a
            href="https://rjmais.com/agendar"
            className="flex items-center gap-3 p-4 rounded-md border border-rj-beige-accent hover:bg-rj-beige-bg"
          >
            <CalendarPlus /> Agendar reunião online
          </a>
        </li>
      </ul>
    </section>
  );
}
