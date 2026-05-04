import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import NotesList from './NotesList.vue'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types/note'

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 1,
  title: 'Reunião',
  content: 'Pauta',
  created_at: '2026-05-03T10:00:00Z',
  updated_at: '2026-05-03T10:00:00Z',
  ...overrides
})

describe('NotesList.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('triggers fetchPage on mount when notes are empty', () => {
    const store = useNotesStore()
    const spy = vi.spyOn(store, 'fetchPage').mockResolvedValueOnce(undefined)

    mount(NotesList)
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('does not refetch on mount when notes are already loaded', () => {
    const store = useNotesStore()
    store.notes = [note()]
    const spy = vi.spyOn(store, 'fetchPage').mockResolvedValueOnce(undefined)

    mount(NotesList)
    expect(spy).not.toHaveBeenCalled()
  })

  it('shows the empty-state message when there are no notes', async () => {
    const store = useNotesStore()
    vi.spyOn(store, 'fetchPage').mockResolvedValueOnce(undefined)

    const wrapper = mount(NotesList)
    await flushPromises()

    expect(wrapper.find('[data-testid="notes-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nenhuma anotação ainda')
  })

  it('renders one row per note when data is present', async () => {
    const store = useNotesStore()
    store.notes = [note({ id: 1, title: 'A' }), note({ id: 2, title: 'B' })]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 2, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesList)
    await flushPromises()

    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
  })

  it('shows an em dash placeholder when content is null', async () => {
    const store = useNotesStore()
    store.notes = [note({ content: null })]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesList)
    await flushPromises()

    expect(wrapper.text()).toContain('—')
  })

  it('surfaces a load error to the user', async () => {
    const store = useNotesStore()
    store.loadError = 'Could not connect'
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesList)
    await flushPromises()

    expect(wrapper.find('[data-testid="notes-load-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Não foi possível carregar')
  })

  it('translates DataTable page events into 1-indexed fetchPage calls', async () => {
    const store = useNotesStore()
    store.notes = [note()]
    store.pagination = { page: 1, limit: 20, pages: 5, count: 100, prev: null, next: 2 }
    const spy = vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesList)
    await flushPromises()
    spy.mockClear()

    // Simulate the DataTable emitting a page-change event for page 3 (PrimeVue
    // is 0-indexed) with 10 rows per page; the store should be called with
    // 1-indexed page 4 and the chosen rows.
    const table = wrapper.findComponent({ name: 'DataTable' })
    expect(table.exists()).toBe(true)
    table.vm.$emit('page', { page: 3, rows: 10, first: 30, pageCount: 10 })
    await flushPromises()

    expect(spy).toHaveBeenCalledWith(4, 10)
  })
})
