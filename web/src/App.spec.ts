import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from './App.vue'

describe('App.vue', () => {
  it('renders the localized application title', () => {
    const wrapper = mount(App)
    expect(wrapper.find('h1').text()).toBe('Anotações')
  })

  it('renders the localized subtitle', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Sistema simples de anotações')
  })
})
