import { useEffect } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

interface ToasterProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function Toaster({ toasts, onRemove }: ToasterProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const duration = toast.duration ?? 3000;
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const bgColor = {
    success: "bg-rj-green-primary",
    error: "bg-rj-gold/90",
    info: "bg-rj-beige-accent",
  }[toast.type];

  const textColor = {
    success: "text-rj-white",
    error: "text-rj-green-dark",
    info: "text-rj-green-dark",
  }[toast.type];

  return (
    <div
      className={`${bgColor} ${textColor} px-4 py-3 rounded-md shadow-lg max-w-xs animate-pulse`}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}
