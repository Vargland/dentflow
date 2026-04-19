'use client'

import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from '@/locales/en/common.json'
import esCommon from '@/locales/es/common.json'

import { cookieName, defaultNS, fallbackLng, languages } from './settings'

const runsOnServerSide = typeof window === 'undefined'

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    lng: undefined, // let detector handle it
    fallbackLng,
    supportedLngs: languages,
    defaultNS,
    resources: {
      en: { common: enCommon },
      es: { common: esCommon },
    },
    detection: {
      order: ['cookie', 'navigator'],
      caches: ['cookie'],
      cookieOptions: { path: '/', sameSite: 'strict' },
      lookupCookie: cookieName,
    },
    interpolation: { escapeValue: false },
    preload: runsOnServerSide ? languages : [],
  })

export function useTranslation(namespace = defaultNS) {
  return useTranslationOrg(namespace)
}

export { i18next }
