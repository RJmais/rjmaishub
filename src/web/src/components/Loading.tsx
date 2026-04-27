export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-dvh bg-rj-beige-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-rj-green-primary border-t-rj-gold rounded-full animate-spin" />
        <p className="text-rj-green-dark font-body">Carregando…</p>
      </div>
    </div>
  );
}
