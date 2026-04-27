const FAQS = [
  {
    q: "Como acesso minha carteira de investimentos?",
    a: "O dashboard nativo entra em produção na Fase 2. Por enquanto, fale com seu assessor pelo WhatsApp ou email.",
  },
  {
    q: "Sofia e Ana são humanas?",
    a: "Não — são assistentes de IA da RJ+. Sofia atende clientes de People Care (concierge premium), Ana atende investimentos. Para decisões personalizadas, sempre te direcionam para um assessor humano.",
  },
  {
    q: "Quero excluir meus dados (LGPD)",
    a: "Em Configurações → Privacidade você terá acesso ao botão de exclusão. Enquanto a função entra no ar, escreva para relacionamento@rjmais.com.",
  },
  {
    q: "Esqueci minha senha",
    a: "Na tela de login clique em 'Esqueci minha senha' (em breve) ou contate seu assessor.",
  },
];

export default function Ajuda() {
  return (
    <section className="space-y-6 max-w-2xl mx-auto">
      <header>
        <h1 className="font-display text-3xl text-rj-green-dark">
          Central de ajuda
        </h1>
        <p className="text-rj-black/70">Dúvidas frequentes.</p>
      </header>
      <ul className="space-y-3">
        {FAQS.map((f, i) => (
          <li key={i} className="bg-white rounded-md shadow-sm">
            <details className="p-4">
              <summary className="cursor-pointer font-medium text-rj-green-dark">
                {f.q}
              </summary>
              <p className="mt-2 text-rj-black/80 text-sm">{f.a}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
