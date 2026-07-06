import EmbeddedFrame from "../components/EmbeddedFrame";

export default function Noticias() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="font-display text-3xl text-rj-green-dark">RJ+ News</h1>
        <p className="text-rj-black/70">
          Revista digital semanal — investimentos, real estate, luxo, crédito,
          experience.
        </p>
      </header>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <EmbeddedFrame src="https://rjmais.com/noticias/" title="RJ+ News" />
      </div>
    </section>
  );
}
