import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AppShell from "./components/AppShell";
import Loading from "./components/Loading";
import DemoBanner from "./components/DemoBanner";
import Toaster from "./components/Toaster";
import { useToast } from "./hooks/useToast";

const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha"));
const RedefinirSenha = lazy(() => import("./pages/RedefinirSenha"));
const VerificarEmail = lazy(() => import("./pages/VerificarEmail"));
const Privacidade = lazy(() => import("./pages/Privacidade"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const SofiaChat = lazy(() => import("./pages/SofiaChat"));
const AnaChat = lazy(() => import("./pages/AnaChat"));
const Assessor = lazy(() => import("./pages/Assessor"));
const Eventos = lazy(() => import("./pages/Eventos"));
const Noticias = lazy(() => import("./pages/Noticias"));
const Ajuda = lazy(() => import("./pages/Ajuda"));
const Indicar = lazy(() => import("./pages/Indicar"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));

export default function App() {
  return (
    <div className="min-h-dvh flex flex-col bg-rj-beige-bg text-rj-black">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-rj-gold focus:text-rj-white focus:px-4 focus:py-2 focus:rounded-md focus:z-50"
      >
        Pular para o conteúdo principal
      </a>
      <DemoBanner />
      <Header />
      <main id="main" className="flex-1 container py-6 md:py-10">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/verificar-email/:token" element={<VerificarEmail />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/ajuda" element={<Ajuda />} />

            {/* Privadas (envolvidas por AppShell — auth + consent banner + error boundary) */}
            <Route
              path="/dashboard"
              element={
                <AppShell>
                  <Dashboard />
                </AppShell>
              }
            />
            <Route
              path="/sofia"
              element={
                <AppShell>
                  <SofiaChat />
                </AppShell>
              }
            />
            <Route
              path="/ana"
              element={
                <AppShell>
                  <AnaChat />
                </AppShell>
              }
            />
            <Route
              path="/assessor"
              element={
                <AppShell>
                  <Assessor />
                </AppShell>
              }
            />
            <Route
              path="/eventos"
              element={
                <AppShell>
                  <Eventos />
                </AppShell>
              }
            />
            <Route
              path="/noticias"
              element={
                <AppShell>
                  <Noticias />
                </AppShell>
              }
            />
            <Route
              path="/indicar"
              element={
                <AppShell>
                  <Indicar />
                </AppShell>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <AppShell>
                  <Configuracoes />
                </AppShell>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <GlobalToaster />
    </div>
  );
}

/* Componente separado para que novos toasts não re-renderizem a árvore inteira. */
function GlobalToaster() {
  const toasts = useToast((s) => s.toasts);
  const remove = useToast((s) => s.remove);
  return <Toaster toasts={toasts} onRemove={remove} />;
}

function NotFound() {
  return (
    <section className="text-center py-20">
      <h1 className="font-display text-4xl text-rj-green-dark mb-4">404</h1>
      <p className="text-rj-black/70">Página não encontrada.</p>
    </section>
  );
}
