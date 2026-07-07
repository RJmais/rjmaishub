import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../hooks/useAuth";

const NAV = [
  { to: "/dashboard", label: "Início" },
  { to: "/sofia", label: "Sofia" },
  { to: "/ana", label: "Ana" },
  { to: "/assessor", label: "Meu assessor" },
  { to: "/eventos", label: "Experience" },
  { to: "/noticias", label: "RJ+ News" },
  { to: "/configuracoes", label: "Configurações" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/login");
  }

  return (
    <header className="bg-rj-green-dark text-rj-white">
      <div className="container flex items-center justify-between h-16">
        <NavLink to="/dashboard" className="flex items-center gap-3">
          <img
            src="https://chat.rjpeoplecare.com/rjplus-logo-white.png"
            alt="RJ+"
            className="h-8 w-auto"
            width={100}
            height={32}
          />
          <span className="sr-only">RJ+ Hub</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-6" aria-label="Principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "text-sm font-body transition-colors",
                  isActive
                    ? "text-rj-gold"
                    : "text-rj-white/85 hover:text-rj-gold"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-rj-white/85 hover:text-rj-gold transition-colors"
            >
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          )}
        </nav>

        <button
          type="button"
          className="md:hidden p-2 rounded-md hover:bg-rj-green-primary"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="md:hidden bg-rj-green-primary border-t border-rj-green-dark/40"
          aria-label="Mobile"
        >
          <ul className="container py-4 flex flex-col gap-3">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "block py-2 text-base",
                      isActive ? "text-rj-gold" : "text-rj-white"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            {user && (
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 py-2 text-base text-rj-white"
                >
                  <LogOut size={18} aria-hidden="true" />
                  Sair
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
