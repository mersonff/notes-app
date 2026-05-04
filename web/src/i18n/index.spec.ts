import { describe, expect, it } from 'vitest'
import { resolveLocale, DEFAULT_LOCALE } from './index'

describe('resolveLocale', () => {
  it('returns the exact match when supported', () => {
    expect(resolveLocale('pt-BR')).toBe('pt-BR')
    expect(resolveLocale('en')).toBe('en')
  })

  it('maps any pt-* tag to pt-BR', () => {
    expect(resolveLocale('pt-PT')).toBe('pt-BR')
    expect(resolveLocale('pt')).toBe('pt-BR')
    expect(resolveLocale('pt-AO')).toBe('pt-BR')
  })

  it('maps any en-* tag to en', () => {
    expect(resolveLocale('en-US')).toBe('en')
    expect(resolveLocale('en-GB')).toBe('en')
  })

  it('falls back to the default for unrelated locales', () => {
    expect(resolveLocale('ja')).toBe(DEFAULT_LOCALE)
    expect(resolveLocale('fr-FR')).toBe(DEFAULT_LOCALE)
  })

  it('falls back to the default when no tag is provided', () => {
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE)
    expect(resolveLocale('')).toBe(DEFAULT_LOCALE)
  })
})
