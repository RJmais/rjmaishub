import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import Loading from "./Loading";
import ConsentBanner from "./ConsentBanner";
import { useAuth } from "../hooks/useAuth";

interface Props {
  children: ReactNode;
}

/**
 * Wrapper de rotas privadas:
 * 1. Verifica auth (/auth/me) ao montar
 * 2. Se não autenticado → /login
 * 3. Renderiza children + ErrorBoundary + ConsentBanner
 */
export default function AppShell({ children }: Props) {
  const { user, status, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "idle") void refresh();
  }, [status, refresh]);

  useEffect(() => {
    if (status === "unauthenticated") navigate("/login", { replace: true });
  }, [status, navigate]);

  if (status === "loading" || status === "idle") return <Loading />;
  if (!user) return null;

  return (
    <ErrorBoundary>
      {children}
      <ConsentBanner />
    </ErrorBoundary>
  );
}
