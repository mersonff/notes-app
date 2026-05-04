import { createI18n } from 'vue-i18n'

import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'

export type SupportedLocale = 'pt-BR' | 'en'
export const SUPPORTED_LOCALES: SupportedLocale[] = ['pt-BR', 'en']
export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR'

/**
 * Resolves a locale tag against the locales we ship.
 * Falls back to pt-BR for any pt-* (pt-PT, pt-AO, ...).
 */
export function resolveLocale(tag?: string | null): SupportedLocale {
  if (!tag) return DEFAULT_LOCALE
  if ((SUPPORTED_LOCALES as string[]).includes(tag)) return tag as SupportedLocale
  if (tag.toLowerCase().startsWith('pt')) return 'pt-BR'
  if (tag.toLowerCase().startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}

const browserLocale = typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE

export const i18n = createI18n<false>({
  legacy: false,
  locale: resolveLocale(browserLocale),
  fallbackLocale: 'en',
  messages: {
    'pt-BR': ptBR,
    en
  }
})
