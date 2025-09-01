import en from "./locales/en";
import ko from "./locales/ko";

export type SupportedLocale = "en" | "ko";

const dictionaries = {
  en,
  ko,
};

export const getDictionary = (locale: SupportedLocale) =>
  dictionaries[locale] || en;
