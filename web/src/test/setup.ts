import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import { beforeEach, vi } from 'vitest'

import ptBR from '@/i18n/locales/pt-BR.json'
import en from '@/i18n/locales/en.json'

const datetimeFormats = {
  'pt-BR': {
    short: {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    } as Intl.DateTimeFormatOptions
  },
  en: {
    short: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    } as Intl.DateTimeFormatOptions
  }
}

// A test-scoped i18n instance using the same messages as production.
// Defaulting to pt-BR mirrors the app's primary locale.
const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'en',
  messages: { 'pt-BR': ptBR, en },
  datetimeFormats
})

config.global.plugins = [i18n, [PrimeVue, { theme: 'none' }], ToastService, ConfirmationService]

// Reset Pinia (and Pinia Colada's query cache, which lives inside Pinia)
// between tests so caches don't leak state across cases.
beforeEach(() => {
  const pinia = createPinia()
  pinia.use(PiniaColada)
  setActivePinia(pinia)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'pt-BR'
  }
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
