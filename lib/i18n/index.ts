import en, { Dictionary } from "./en";
import hi from "./hi";
import type { LanguageCode } from "./languages";

const DICTIONARIES: Partial<Record<LanguageCode, Dictionary>> = {
  en,
  hi,
};

export function getDictionary(lang: LanguageCode): Dictionary {
  return DICTIONARIES[lang] ?? en;
}

export type { Dictionary };
export { LANGUAGES, DEFAULT_LANGUAGE } from "./languages";
export type { LanguageCode, LanguageMeta } from "./languages";
