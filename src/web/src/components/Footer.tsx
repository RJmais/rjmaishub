import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-rj-green-dark text-rj-white/80 mt-12">
      <div className="container py-8 grid gap-6 md:grid-cols-3">
        <div>
          <p className="font-display text-xl text-rj-white mb-2">RJ+</p>
          <p className="text-sm">Luxury is Security.</p>
        </div>
        <div className="text-sm">
          <p className="font-display text-rj-gold mb-2">Atendimento</p>
          <p>relacionamento@rjmais.com</p>
          <p>+55 21 98225-9446</p>
        </div>
        <div className="text-sm">
          <p className="font-display text-rj-gold mb-2">Privacidade</p>
          <Link to="/privacidade" className="underline">
            Política de privacidade
          </Link>
          <p className="mt-1">CNPJ 09.397.435/0001-96</p>
        </div>
      </div>
      <div className="bg-rj-green-primary text-xs text-center py-3">
        © {new Date().getFullYear()} RJ+ Assessoria de Investimentos
      </div>
    </footer>
  );
}
