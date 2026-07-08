"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  getDictionary,
  Dictionary,
  LanguageCode,
} from "@/lib/i18n";

const STORAGE_KEY = "lokpulse_lang";

type LanguageContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  // Restore saved preference on mount (client-only — avoids SSR/client
  // hydration mismatch since localStorage isn't available server-side).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && LANGUAGES.some((l) => l.code === saved && l.available)) {
      setLangState(saved);
    }
  }, []);

  // Apply <html lang="..."> and the per-language font stack whenever it changes.
  useEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.style.setProperty(
      "--font-active",
      meta?.fontStack ?? "var(--font-plex-sans)"
    );
  }, [lang]);

  function setLang(next: LanguageCode) {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: getDictionary(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
