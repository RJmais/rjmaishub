import { useState } from "react";

export default function Indicar() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <section className="max-w-md mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      <h1 className="font-display text-3xl text-rj-green-dark mb-2">
        Indicar e ganhar
      </h1>
      <p className="text-rj-black/70 mb-6">
        Convide um amigo. Quando virar cliente RJ+, você ganha um mimo.
      </p>
      {sent ? (
        <p className="text-rj-green-primary">
          Convite enviado para <strong>{email}</strong>. Obrigada!
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // TODO Fase 2: POST /api/referrals
            setSent(true);
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium">Email do convidado</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-rj-beige-accent px-3 py-2 focus:border-rj-gold"
            />
          </label>
          <button
            type="submit"
            className="w-full bg-rj-gold text-rj-white font-medium py-2.5 rounded-md hover:bg-rj-gold-deep"
          >
            Enviar convite
          </button>
        </form>
      )}
    </section>
  );
}
