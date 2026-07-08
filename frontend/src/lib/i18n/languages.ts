export type LanguageCode = "en" | "hi" | "bn" | "ta" | "te";

export type LanguageMeta = {
  code: LanguageCode;
  label: string; // shown in the switcher, in that language's own script
  englishLabel: string;
  fontStack: string; // CSS font-family value used site-wide when this language is active
  available: boolean; // false = shown greyed-out as "coming soon" in the switcher
};

/**
 * Section 9 spec: "the entire interface — not just submitted content —
 * switches instantly between languages." Font stacks are per-language
 * because Latin fonts render Devanagari/Bengali/Tamil/Telugu scripts
 * poorly (missing glyphs, wrong line-height) — each script needs its
 * own typeface, not just a translated string in the same font.
 *
 * Only English and Hindi have translation dictionaries wired up right
 * now (see lib/i18n/en.ts, hi.ts) per the project roadmap's "start with
 * English + Hindi, add regional languages as time allows." The other
 * three are listed here already so the switcher UI and font-loading
 * pattern don't need to change shape when they're added — just drop in
 * a new dictionary file and flip `available: true`.
 */
export const LANGUAGES: LanguageMeta[] = [
  {
    code: "en",
    label: "English",
    englishLabel: "English",
    fontStack: "var(--font-plex-sans), 'Segoe UI', Roboto, Arial, sans-serif",
    available: true,
  },
  {
    code: "hi",
    label: "हिन्दी",
    englishLabel: "Hindi",
    fontStack: "'Noto Sans Devanagari', var(--font-plex-sans), sans-serif",
    available: true,
  },
  {
    code: "bn",
    label: "বাংলা",
    englishLabel: "Bengali",
    fontStack: "'Noto Sans Bengali', var(--font-plex-sans), sans-serif",
    available: false,
  },
  {
    code: "ta",
    label: "தமிழ்",
    englishLabel: "Tamil",
    fontStack: "'Noto Sans Tamil', var(--font-plex-sans), sans-serif",
    available: false,
  },
  {
    code: "te",
    label: "తెలుగు",
    englishLabel: "Telugu",
    fontStack: "'Noto Sans Telugu', var(--font-plex-sans), sans-serif",
    available: false,
  },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";
