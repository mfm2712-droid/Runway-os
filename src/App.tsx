import { useEffect, useState } from "react";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";

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

  if (path === "/app") return <Dashboard onNavigate={navigate} />;
  if (path === "/privacy") return <Privacy onNavigate={navigate} />;
  if (path === "/terms") return <Terms onNavigate={navigate} />;
  return <Landing onNavigate={navigate} />;
}
