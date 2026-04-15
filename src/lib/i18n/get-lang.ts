import { cookies } from "next/headers";

import { cookieName, fallbackLng, type Language,languages } from "./settings";

export async function getLang(): Promise<Language> {
  const cookieStore = await cookies();

  const lang = cookieStore.get(cookieName)?.value;

  if (lang && languages.includes(lang as Language)) {
    return lang as Language;
  }

  return fallbackLng;
}
