import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { LANGUAGE_KEY } from "../storageKeys";
import { DICTIONARIES, EN, type Lang } from "./translations";

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useLocalStorage<Lang>(LANGUAGE_KEY, "en");
  const dict = DICTIONARIES[lang];

  const t = useMemo(
    () => (key: string, vars?: Record<string, string | number>) =>
      interpolate(dict[key] ?? EN[key] ?? key, vars),
    [dict],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
