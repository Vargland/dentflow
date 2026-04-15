"use client";

import { useTransition } from "react";

import { i18next } from "@/lib/i18n/client";
import { type Language,languages } from "@/lib/i18n/settings";
import { cn } from "@/lib/utils";
import { setLang } from "@/actions/set-lang";

const FLAG: Record<Language, string> = {
  en: "🇺🇸",
  es: "🇦🇷",
};

const LABEL: Record<Language, string> = {
  en: "EN",
  es: "ES",
};

export const LangSwitcher = ({ currentLang }: { currentLang: Language }) => {
  const [pending, startTransition] = useTransition();

  const handleChange = (lang: Language) => {
    if (lang === currentLang || pending) return;

    startTransition(async () => {
      await setLang(lang);

      i18next.changeLanguage(lang);

      // Reload to re-render server components with new lang
      window.location.reload();
    });
  };

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 bg-gray-50">
      {languages.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => handleChange(lang)}
          disabled={pending}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all",
            lang === currentLang
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
          title={lang === "en" ? "English" : "Español"}
        >
          <span>{FLAG[lang]}</span>
          <span>{LABEL[lang]}</span>
        </button>
      ))}
    </div>
  );
}
