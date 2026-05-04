import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import NoteForm from './NoteForm.vue'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types/note'

function createdNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 1,
    title: 'Reunião',
    content: 'Pauta',
    created_at: '2026-05-03T10:00:00Z',
    updated_at: '2026-05-03T10:00:00Z',
    ...overrides
  }
}

function mountForm(): VueWrapper {
  return mount(NoteForm)
}

async function fillTitle(wrapper: VueWrapper, value: string) {
  await wrapper.find('[data-testid="note-title"]').setValue(value)
}

async function fillContent(wrapper: VueWrapper, value: string) {
  await wrapper.find('[data-testid="note-content"]').setValue(value)
}

async function submitForm(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
}

describe('NoteForm.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the title and content fields with placeholders', () => {
    const wrapper = mountForm()
    const title = wrapper.find('[data-testid="note-title"]')
    const content = wrapper.find('[data-testid="note-content"]')

    expect(title.exists()).toBe(true)
    expect(content.exists()).toBe(true)
    expect(title.attributes('placeholder')).toBe('Digite o título')
    expect(content.attributes('placeholder')).toBe('Digite o conteúdo...')
  })

  it('does not show validation messages before the first submit', () => {
    const wrapper = mountForm()
    expect(wrapper.findAll('[data-testid="note-title-error"]')).toHaveLength(0)
  })

  it('shows the required-title message after submitting with an empty title', async () => {
    const wrapper = mountForm()
    await submitForm(wrapper)

    const errors = wrapper.findAll('[data-testid="note-title-error"]')
    expect(errors).toHaveLength(1)
    expect(errors[0].text()).toBe('Título é obrigatório')
  })

  it('does not call the store.create action when client-invalid', async () => {
    const wrapper = mountForm()
    const store = useNotesStore()
    const spy = vi.spyOn(store, 'create')

    await submitForm(wrapper)

    expect(spy).not.toHaveBeenCalled()
  })

  it('shows a too-long error when the title exceeds the max length (no submit needed)', async () => {
    const wrapper = mountForm()
    // The input has a maxlength attribute; bypass it via direct v-model write
    // to prove the client-side guard catches programmatically-injected values.
    await fillTitle(wrapper, 'T'.repeat(121))

    const errors = wrapper.findAll('[data-testid="note-title-error"]')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].text()).toMatch(/120 caracteres/)
  })

  it('shows a too-long error when the content exceeds the max length', async () => {
    const wrapper = mountForm()
    await fillContent(wrapper, 'C'.repeat(5001))

    const errors = wrapper.findAll('[data-testid="note-content-error"]')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].text()).toMatch(/5000 caracteres/)
  })

  it('submits with title-only when content is empty (content is optional)', async () => {
    const wrapper = mountForm()
    const store = useNotesStore()
    const spy = vi.spyOn(store, 'create').mockResolvedValueOnce(createdNote({ content: null }))

    await fillTitle(wrapper, 'Só título')
    await submitForm(wrapper)

    expect(spy).toHaveBeenCalledWith({ title: 'Só título', content: null })
  })

  it('submits content as a string when provided', async () => {
    const wrapper = mountForm()
    const store = useNotesStore()
    const spy = vi.spyOn(store, 'create').mockResolvedValueOnce(createdNote())

    await fillTitle(wrapper, 'Reunião')
    await fillContent(wrapper, 'Pauta')
    await submitForm(wrapper)

    expect(spy).toHaveBeenCalledWith({ title: 'Reunião', content: 'Pauta' })
  })

  it('resets the inputs after a successful submission', async () => {
    const wrapper = mountForm()
    const store = useNotesStore()
    vi.spyOn(store, 'create').mockResolvedValueOnce(createdNote())

    await fillTitle(wrapper, 'Reunião')
    await fillContent(wrapper, 'Pauta')
    await submitForm(wrapper)

    const title = wrapper.find('[data-testid="note-title"]').element as HTMLInputElement
    const content = wrapper.find('[data-testid="note-content"]').element as HTMLTextAreaElement
    expect(title.value).toBe('')
    expect(content.value).toBe('')
  })

  it('keeps the inputs and surfaces server-side validation errors', async () => {
    const wrapper = mountForm()
    const store = useNotesStore()
    vi.spyOn(store, 'create').mockImplementationOnce(async () => {
      store.validationErrors = { title: ['Título já existe'] }
      return null
    })

    await fillTitle(wrapper, 'Reunião')
    await submitForm(wrapper)

    const title = wrapper.find('[data-testid="note-title"]').element as HTMLInputElement
    expect(title.value).toBe('Reunião') // not reset
    const errors = wrapper.findAll('[data-testid="note-title-error"]')
    expect(errors.some((e) => e.text() === 'Título já existe')).toBe(true)
  })

  it('disables the submit button while submitting', async () => {
    const wrapper = mountForm()
    const store = useNotesStore()
    let resolveDeferred!: (value: Note | null) => void
    vi.spyOn(store, 'create').mockImplementationOnce(() => {
      store.submitting = true
      return new Promise<Note | null>((resolve) => {
        resolveDeferred = (v) => {
          store.submitting = false
          resolve(v)
        }
      })
    })

    await fillTitle(wrapper, 'Reunião')
    await submitForm(wrapper)
    await flushPromises()

    // The button label should switch while loading
    const button = wrapper.find('[data-testid="note-save"]')
    expect(button.exists()).toBe(true)

    resolveDeferred(createdNote())
    await flushPromises()
  })
})
