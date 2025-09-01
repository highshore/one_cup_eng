"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDictionary, SupportedLocale } from "./index";

type I18nContextType = {
  locale: SupportedLocale;
  setLocale: (l: SupportedLocale) => void;
  t: ReturnType<typeof getDictionary>;
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocaleState] = useState<SupportedLocale>("ko");

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? (localStorage.getItem("locale") as SupportedLocale | null)
        : null;
    if (saved === "en" || saved === "ko") setLocaleState(saved);
    else {
      const browser =
        typeof navigator !== "undefined" ? navigator.language : "ko";
      setLocaleState(browser.startsWith("ko") ? "ko" : "en");
    }
  }, []);

  const setLocale = (l: SupportedLocale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("locale", l);
  };

  const t = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
