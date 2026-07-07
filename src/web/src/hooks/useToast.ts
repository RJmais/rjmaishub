import { create } from "zustand";
import type { Toast } from "../components/Toaster";

interface ToastState {
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"], duration?: number) => void;
  remove: (id: string) => void;
}

let nextId = 0;

export const useToast = create<ToastState>((set) => ({
  toasts: [],

  toast(message, type = "info", duration) {
    nextId += 1;
    set((s) => ({
      toasts: [...s.toasts, { id: `toast-${nextId}`, message, type, duration }],
    }));
  },

  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
