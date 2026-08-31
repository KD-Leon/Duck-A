import { useMemo } from "react"
import { useStore } from "@/store"
import { en } from "./locales/en"
import { zh } from "./locales/zh"
import type { Language, Translations } from "./types"

export * from "./types"

const translations: Record<Language, Translations> = {
	en,
	zh,
}

export function getTranslation(lang?: Language): Translations {
	const currentLang = lang ?? useStore.getState().language ?? "en"
	return translations[currentLang] ?? en
}

export function useTranslation() {
	const language = useStore((state) => state.language)
	const setLanguage = useStore((state) => state.setLanguage)

	const t = useMemo(() => {
		return translations[language] ?? en
	}, [language])

	return {
		language,
		setLanguage,
		t,
	}
}

export const useI18n = useTranslation
