import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, vi } from 'vitest'

import ptBR from '@/i18n/locales/pt-BR.json'
import en from '@/i18n/locales/en.json'

// A test-scoped i18n instance using the same messages as production.
// Defaulting to pt-BR mirrors the app's primary locale.
const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'en',
  messages: { 'pt-BR': ptBR, en }
})

config.global.plugins = [i18n]

// Reset Pinia between tests so stores don't leak state across cases.
beforeEach(() => {
  setActivePinia(createPinia())
})

// Stub matchMedia (PrimeVue's theme handling reads it for prefers-color-scheme).
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
}
