"use server";

import { cookies } from "next/headers";

import { cookieName, type Language,languages } from "@/lib/i18n/settings";

export async function setLang(lang: Language) {
  if (!languages.includes(lang)) return;

  const cookieStore = await cookies();

  cookieStore.set(cookieName, lang, {
    path: "/",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}
