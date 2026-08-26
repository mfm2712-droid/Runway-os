import { lazy, Suspense, useEffect, useState } from "react";
import { Landing } from "./pages/Landing";
import { LanguageProvider } from "./lib/i18n/LanguageContext";

// Code-split everything past the landing page — a visitor who only loads "/"
// shouldn't pay for the dashboard, AI copilot, receipt scanner, Projection
// Lab, or the v2 prototype shell until they actually navigate there.
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Privacy = lazy(() => import("./pages/Privacy").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("./pages/Terms").then((m) => ({ default: m.Terms })));
const V2Shell = lazy(() => import("./v2/V2Shell").then((m) => ({ default: m.V2Shell })));

// Unstyled, background-matched — avoids a white flash on the lazy chunk
// fetch without introducing any new loading UI.
function RouteFallback() {
  return <div className="min-h-screen bg-obsidian-950" />;
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  };

  const page = path === "/app" ? (
    <Suspense fallback={<RouteFallback />}>
      <Dashboard onNavigate={navigate} />
    </Suspense>
  ) : path === "/v2" ? (
    <Suspense fallback={<RouteFallback />}>
      <V2Shell onExit={() => navigate("/app")} />
    </Suspense>
  ) : path === "/privacy" ? (
    <Suspense fallback={<RouteFallback />}>
      <Privacy onNavigate={navigate} />
    </Suspense>
  ) : path === "/terms" ? (
    <Suspense fallback={<RouteFallback />}>
      <Terms onNavigate={navigate} />
    </Suspense>
  ) : (
    <Landing onNavigate={navigate} />
  );

  return <LanguageProvider>{page}</LanguageProvider>;
}
