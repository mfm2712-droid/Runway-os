import { useEffect, useState } from "react";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { LanguageProvider } from "./lib/i18n/LanguageContext";

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
    <Dashboard onNavigate={navigate} />
  ) : path === "/privacy" ? (
    <Privacy onNavigate={navigate} />
  ) : path === "/terms" ? (
    <Terms onNavigate={navigate} />
  ) : (
    <Landing onNavigate={navigate} />
  );

  return <LanguageProvider>{page}</LanguageProvider>;
}
