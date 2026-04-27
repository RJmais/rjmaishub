import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import Loading from "./Loading";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await apiFetch<{ id: string; name: string; email: string }>("/auth/me");
        setAuthenticated(true);
      } catch {
        setError("Não autenticado");
        setAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (authenticated === null) {
    return <Loading />;
  }

  if (!authenticated || error) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
