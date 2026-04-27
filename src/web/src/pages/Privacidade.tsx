export default function Privacidade() {
  return (
    <article className="prose max-w-3xl mx-auto bg-white shadow-md rounded-lg p-6 md:p-8">
      <h1 className="font-display text-3xl text-rj-green-dark">
        Política de Privacidade
      </h1>
      <p className="text-sm text-rj-black/60">
        Versão 0.1 — Atualizada em 26/04/2026. Em revisão jurídica.
      </p>

      <h2 className="font-display text-2xl text-rj-green-dark mt-6">
        Quem somos
      </h2>
      <p>
        RJ+ Assessoria de Investimentos (CNPJ 09.397.435/0001-96) — controladora
        dos seus dados pessoais nesse aplicativo.
      </p>

      <h2 className="font-display text-2xl text-rj-green-dark mt-6">
        Quais dados coletamos
      </h2>
      <ul>
        <li>Cadastrais: nome, email, telefone, CPF.</li>
        <li>Conversas com Sofia e Ana (assistentes de IA).</li>
        <li>Indicações que você fizer.</li>
        <li>Logs técnicos (IP, user-agent, timestamp).</li>
      </ul>

      <h2 className="font-display text-2xl text-rj-green-dark mt-6">
        Por que coletamos (LGPD)
      </h2>
      <p>
        Execução de contrato (você é cliente RJ+), legítimo interesse (segurança
        e melhoria do app), consentimento (marketing, opcional).
      </p>

      <h2 className="font-display text-2xl text-rj-green-dark mt-6">
        Seus direitos
      </h2>
      <p>
        Acesso, correção, portabilidade, exclusão, anonimização, revogação do
        consentimento, oposição. Solicite por{" "}
        <a href="mailto:dpo@rjmais.com" className="text-rj-gold underline">
          dpo@rjmais.com
        </a>
        .
      </p>

      <h2 className="font-display text-2xl text-rj-green-dark mt-6">
        Retenção
      </h2>
      <p>
        Conversas Sofia/Ana: 12 meses. Documentos fiscais: 5 anos. Logs de
        auditoria: 2 anos. Conta encerrada: anonimizamos em até 30 dias.
      </p>

      <h2 className="font-display text-2xl text-rj-green-dark mt-6">
        Compartilhamento
      </h2>
      <p>
        Anthropic (modelo de IA dos chatbots), Cloudflare (hospedagem),
        HubSpot (CRM), Resend (email). Todos sob acordos de proteção de dados.
      </p>

      <p className="text-xs text-rj-black/60 mt-8">
        Esta página é placeholder. Versão final será revisada pela área jurídica
        antes de GA.
      </p>
    </article>
  );
}
