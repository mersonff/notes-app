import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import NoteFormDialog from './NoteFormDialog.vue'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types/note'

const sampleNote = (overrides: Partial<Note> = {}): Note => ({
  id: 1,
  title: 'Reunião',
  content: 'Pauta',
  created_at: '2026-05-03T10:00:00Z',
  updated_at: '2026-05-03T10:00:00Z',
  ...overrides
})

function mountDialog(props: { visible: boolean; note: Note | null }): VueWrapper {
  // attachTo body so PrimeVue's Dialog teleport target exists and the
  // rendered content can be queried via the wrapper.
  return mount(NoteFormDialog, {
    props,
    attachTo: document.body
  })
}

function findInput(testId: string): HTMLInputElement | HTMLTextAreaElement | null {
  return document.body.querySelector(`[data-testid="${testId}"]`) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null
}

async function setInput(testId: string, value: string) {
  const el = findInput(testId)
  if (!el) throw new Error(`Input ${testId} not found`)
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function clickByTestId(testId: string) {
  const el = document.body.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  if (!el) throw new Error(`Element ${testId} not found`)
  el.click()
  await flushPromises()
}

describe('NoteFormDialog.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('create mode (note=null)', () => {
    it('renders the "Nova anotação" header', async () => {
      mountDialog({ visible: true, note: null })
      await flushPromises()

      expect(document.body.textContent).toContain('Nova anotação')
    })

    it('starts with empty inputs', async () => {
      mountDialog({ visible: true, note: null })
      await flushPromises()

      expect(findInput('note-title')?.value).toBe('')
      expect(findInput('note-content')?.value).toBe('')
    })

    it('shows the required-title error after submit and does not call store.create', async () => {
      const wrapper = mountDialog({ visible: true, note: null })
      const store = useNotesStore()
      const spy = vi.spyOn(store, 'create')
      await flushPromises()

      await clickByTestId('note-save')

      expect(document.body.textContent).toContain('Título é obrigatório')
      expect(spy).not.toHaveBeenCalled()
      expect(wrapper.emitted('update:visible')).toBeUndefined()
    })

    it('calls store.create with normalised payload and closes on success', async () => {
      const wrapper = mountDialog({ visible: true, note: null })
      const store = useNotesStore()
      const spy = vi
        .spyOn(store, 'create')
        .mockResolvedValueOnce(sampleNote({ id: 5, title: 'Nova', content: null }))
      await flushPromises()

      await setInput('note-title', 'Nova')
      await clickByTestId('note-save')

      expect(spy).toHaveBeenCalledWith({ title: 'Nova', content: null })
      expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
      expect(wrapper.emitted('saved')).toBeTruthy()
    })

    it('sends content as a string when filled', async () => {
      mountDialog({ visible: true, note: null })
      const store = useNotesStore()
      const spy = vi.spyOn(store, 'create').mockResolvedValueOnce(sampleNote())
      await flushPromises()

      await setInput('note-title', 'Reunião')
      await setInput('note-content', 'Pauta')
      await clickByTestId('note-save')

      expect(spy).toHaveBeenCalledWith({ title: 'Reunião', content: 'Pauta' })
    })

    it('keeps the dialog open and surfaces server validation errors', async () => {
      const wrapper = mountDialog({ visible: true, note: null })
      const store = useNotesStore()
      vi.spyOn(store, 'create').mockImplementationOnce(async () => {
        store.validationErrors = { title: ['Título já existe'] }
        return null
      })
      await flushPromises()

      await setInput('note-title', 'Reunião')
      await clickByTestId('note-save')

      expect(wrapper.emitted('update:visible')).toBeUndefined()
      expect(document.body.textContent).toContain('Título já existe')
    })
  })

  describe('edit mode (note provided)', () => {
    it('renders the "Editar anotação" header', async () => {
      mountDialog({ visible: true, note: sampleNote() })
      await flushPromises()

      expect(document.body.textContent).toContain('Editar anotação')
    })

    it('pre-fills inputs with the note values', async () => {
      mountDialog({ visible: true, note: sampleNote({ title: 'Original', content: 'Body' }) })
      await flushPromises()

      expect(findInput('note-title')?.value).toBe('Original')
      expect(findInput('note-content')?.value).toBe('Body')
    })

    it('treats null content as an empty string in the textarea', async () => {
      mountDialog({ visible: true, note: sampleNote({ content: null }) })
      await flushPromises()

      expect(findInput('note-content')?.value).toBe('')
    })

    it('calls store.update with the id and payload on save', async () => {
      const wrapper = mountDialog({ visible: true, note: sampleNote({ id: 42 }) })
      const store = useNotesStore()
      const spy = vi
        .spyOn(store, 'update')
        .mockResolvedValueOnce(sampleNote({ id: 42, title: 'Changed' }))
      await flushPromises()

      await setInput('note-title', 'Changed')
      await clickByTestId('note-save')

      expect(spy).toHaveBeenCalledWith(42, { title: 'Changed', content: 'Pauta' })
      expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
    })

    it('does not call store.create in edit mode', async () => {
      mountDialog({ visible: true, note: sampleNote({ id: 42 }) })
      const store = useNotesStore()
      const createSpy = vi.spyOn(store, 'create')
      vi.spyOn(store, 'update').mockResolvedValueOnce(sampleNote())
      await flushPromises()

      await clickByTestId('note-save')

      expect(createSpy).not.toHaveBeenCalled()
    })

    it('clears inputs when closed and reopened in create mode', async () => {
      const wrapper = mountDialog({ visible: true, note: sampleNote({ title: 'Old' }) })
      await flushPromises()
      expect(findInput('note-title')?.value).toBe('Old')

      // Close + reopen as create
      await wrapper.setProps({ visible: false, note: null })
      await flushPromises()
      await wrapper.setProps({ visible: true, note: null })
      await flushPromises()

      expect(findInput('note-title')?.value).toBe('')
    })
  })

  describe('cancel', () => {
    it('closes the dialog without calling any store action', async () => {
      const wrapper = mountDialog({ visible: true, note: null })
      const store = useNotesStore()
      const createSpy = vi.spyOn(store, 'create')
      const updateSpy = vi.spyOn(store, 'update')
      await flushPromises()

      await clickByTestId('note-cancel')

      expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
      expect(createSpy).not.toHaveBeenCalled()
      expect(updateSpy).not.toHaveBeenCalled()
    })
  })

  describe('client-side length validation', () => {
    it('shows a too-long error when the title exceeds the max', async () => {
      mountDialog({ visible: true, note: null })
      await flushPromises()

      await setInput('note-title', 'T'.repeat(121))

      expect(document.body.textContent).toMatch(/120 caracteres/)
    })

    it('shows a too-long error when the content exceeds the max', async () => {
      mountDialog({ visible: true, note: null })
      await flushPromises()

      await setInput('note-content', 'C'.repeat(5001))

      expect(document.body.textContent).toMatch(/5000 caracteres/)
    })
  })
})
