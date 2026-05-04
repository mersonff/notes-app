import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import App from './App.vue'

// Shallow-mount to keep this spec narrowly about the App shell — the
// NotesView/NoteForm/NotesList components have their own dedicated tests.
describe('App.vue', () => {
  it('renders the localized application title', () => {
    const wrapper = shallowMount(App)
    expect(wrapper.find('h1').text()).toBe('Anotações')
  })

  it('renders the localized subtitle', () => {
    const wrapper = shallowMount(App)
    expect(wrapper.text()).toContain('Sistema simples de anotações')
  })
})
