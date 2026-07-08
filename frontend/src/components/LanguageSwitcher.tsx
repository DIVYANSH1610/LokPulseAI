"use client";

import { useState, useRef, useEffect } from "react";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
        aria-label="Switch language"
      >
        <span aria-hidden>🌐</span>
        <span>{current.label}</span>
        <span className="text-xs opacity-70">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-lg">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              disabled={!l.available}
              onClick={() => {
                if (!l.available) return;
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                l.code === lang
                  ? "bg-[var(--teal-100)] text-[var(--teal-600)]"
                  : "text-[var(--ink)] hover:bg-[var(--paper)]"
              } ${!l.available ? "cursor-not-allowed opacity-40" : ""}`}
            >
              <span style={{ fontFamily: l.fontStack }}>{l.label}</span>
              {!l.available && (
                <span className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
