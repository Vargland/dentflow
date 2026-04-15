"use client";

import { useEffect } from "react";

import { i18next } from "@/lib/i18n/client";
import type { Language } from "@/lib/i18n/settings";

interface I18nProviderProps {
  lang: Language;
  children: React.ReactNode;
}

/**
 * Syncs the server-detected language into the client i18next instance.
 * This ensures SSR and client render start with the same language.
 */
export const I18nProvider = ({ lang, children }: I18nProviderProps) => {
  useEffect(() => {
    if (i18next.language !== lang) {
      i18next.changeLanguage(lang);
    }
  }, [lang]);

  // Set language synchronously on first render to avoid flicker
  if (i18next.language !== lang) {
    i18next.changeLanguage(lang);
  }

  return <>{children}</>;
}
