import { initReactI18next } from "react-i18next/initReactI18next";
import { createInstance } from "i18next";

import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";

import { defaultNS, fallbackLng, type Language } from "./settings";

const resources = { en: { common: en }, es: { common: es } };

async function initI18next(lng: Language) {
  const i18nInstance = createInstance();

  await i18nInstance.use(initReactI18next).init({
    lng,
    fallbackLng,
    defaultNS,
    resources,
    interpolation: { escapeValue: false },
  });

  return i18nInstance;
}

export async function getTranslation(lng: Language, ns: string = defaultNS) {
  const i18nextInstance = await initI18next(lng);

  return {
    t: i18nextInstance.getFixedT(lng, ns),
    i18n: i18nextInstance,
  };
}
