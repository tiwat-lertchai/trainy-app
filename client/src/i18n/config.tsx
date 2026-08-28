/* eslint-disable react-refresh/only-export-components -- The provider and its hook share one context boundary. */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { messages, type Locale, type MessageKey } from "./messages";

const STORAGE_KEY = "trainy-locale";

export function resolveLocale(value: string | null): Locale {
	return value === "en" ? "en" : "th";
}

type LanguageContextValue = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: MessageKey) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [locale, setLocale] = useState<Locale>(() =>
		resolveLocale(localStorage.getItem(STORAGE_KEY)),
	);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, locale);
		document.documentElement.lang = locale;
	}, [locale]);

	const value = useMemo<LanguageContextValue>(
		() => ({ locale, setLocale, t: (key) => messages[locale][key] }),
		[locale],
	);
	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (!context) throw new Error("useLanguage must be used within LanguageProvider");
	return context;
}
