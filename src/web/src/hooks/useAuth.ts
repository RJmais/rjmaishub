import { create } from "zustand";
import { apiFetch } from "../lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  tier: "cliente" | "parceiro" | "admin";
  has2fa: boolean;
}

interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<AuthUser | null>;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "idle",

  async refresh() {
    set({ status: "loading" });
    try {
      const res = await apiFetch<{ user: AuthUser }>("/auth/me");
      set({ user: res.user, status: "authenticated" });
      return res.user;
    } catch {
      set({ user: null, status: "unauthenticated" });
      return null;
    }
  },

  setUser(u) {
    set({ user: u, status: u ? "authenticated" : "unauthenticated" });
  },

  async logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, status: "unauthenticated" });
    }
  },
}));
