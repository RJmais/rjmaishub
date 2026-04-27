export default function Eventos() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="font-display text-3xl text-rj-green-dark">
          RJ+ Experience
        </h1>
        <p className="text-rj-black/70">
          Calendário oficial de eventos VIP curados pela RJ+.
        </p>
      </header>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <iframe
          src="https://calendariorjmais.pages.dev"
          title="Calendário RJ+ Experience"
          className="w-full"
          style={{ height: "min(80dvh, 800px)", border: 0 }}
          loading="lazy"
        />
      </div>
      <p className="text-xs text-rj-black/60">
        Em breve integração nativa com confirmação de presença direto no app.
      </p>
    </section>
  );
}
