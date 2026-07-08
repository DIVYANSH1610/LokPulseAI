from .utils import write_file

def generate_language_system(base_dir: str):
    lang_content = """
"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, Search } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";

export function PremiumLanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const filteredLanguages = LANGUAGES.filter(l => l.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-slate-200/50 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 shadow-sm"
      >
        <Globe size={16} className="text-teal-400" />
        <span>{current.label}</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl glass-panel"
          >
            <div className="p-3 border-b border-slate-200/50">
              <div className="relative flex items-center">
                <Search size={14} className="absolute left-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search language..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-100/50 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 ring-teal-500/50 text-slate-700"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin">
              {filteredLanguages.map((l) => (
                <button
                  key={l.code}
                  disabled={!l.available}
                  onClick={() => {
                    if (!l.available) return;
                    setLang(l.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-all ${
                    l.code === lang
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  } ${!l.available ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span style={{ fontFamily: l.fontStack }} className="flex items-center gap-2">
                    {l.label} 
                  </span>
                  {l.code === lang && <Check size={16} className="text-teal-600" />}
                  {!l.available && <span className="text-[10px] uppercase tracking-wide bg-slate-200 px-2 py-0.5 rounded-md">Soon</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
"""
    write_file(f"{base_dir}/src/components/PremiumLanguageSwitcher.tsx", lang_content)