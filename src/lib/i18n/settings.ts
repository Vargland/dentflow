export const fallbackLng = "en";

export const languages = ["en", "es"] as const;

export type Language = (typeof languages)[number];

export const defaultNS = "common";

export const cookieName = "dentflow-lang";
