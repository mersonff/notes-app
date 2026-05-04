import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import NotesGrid from './NotesGrid.vue'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types/note'

// Hoisted so the vi.mock factory below can reference it
const confirmRequireMock = vi.hoisted(() => vi.fn())

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: confirmRequireMock,
    close: vi.fn()
  })
}))

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 1,
  title: 'Reunião',
  content: 'Pauta',
  created_at: '2026-05-03T10:00:00Z',
  updated_at: '2026-05-03T10:00:00Z',
  ...overrides
})

describe('NotesGrid.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    confirmRequireMock.mockReset()
  })

  it('triggers fetchPage on mount when notes are empty', () => {
    const store = useNotesStore()
    const spy = vi.spyOn(store, 'fetchPage').mockResolvedValueOnce(undefined)

    mount(NotesGrid)
    expect(spy).toHaveBeenCalledWith(1)
  })

  it('does not refetch on mount when notes are already loaded', () => {
    const store = useNotesStore()
    store.notes = [note()]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
    const spy = vi.spyOn(store, 'fetchPage').mockResolvedValueOnce(undefined)

    mount(NotesGrid)
    expect(spy).not.toHaveBeenCalled()
  })

  it('renders 6 skeleton cards while loading the first page', () => {
    const store = useNotesStore()
    store.loading = true
    vi.spyOn(store, 'fetchPage').mockResolvedValueOnce(undefined)

    const wrapper = mount(NotesGrid)
    expect(wrapper.find('[data-testid="notes-loading"]').exists()).toBe(true)
    expect(wrapper.findAll('.note-skeleton')).toHaveLength(6)
  })

  it('shows the empty state with a CTA button when there are no notes', async () => {
    const store = useNotesStore()
    store.pagination = { page: 1, limit: 20, pages: 1, count: 0, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesGrid)
    await flushPromises()

    expect(wrapper.find('[data-testid="notes-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nenhuma anotação ainda')
    expect(wrapper.find('[data-testid="notes-empty-cta"]').exists()).toBe(true)
  })

  it('emits "create" when the empty-state CTA is clicked', async () => {
    const store = useNotesStore()
    store.pagination = { page: 1, limit: 20, pages: 1, count: 0, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesGrid)
    await flushPromises()
    await wrapper.find('[data-testid="notes-empty-cta"]').trigger('click')

    expect(wrapper.emitted('create')).toBeTruthy()
  })

  it('renders one card per note when data is present', async () => {
    const store = useNotesStore()
    store.notes = [note({ id: 1, title: 'A' }), note({ id: 2, title: 'B' })]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 2, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesGrid)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(2)
  })

  it('emits "edit" with the note when a card emits edit', async () => {
    const store = useNotesStore()
    store.notes = [note({ id: 42, title: 'Edit me' })]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesGrid)
    await flushPromises()
    await wrapper.find('[data-testid="note-card-edit"]').trigger('click')

    const events = wrapper.emitted('edit')
    expect(events).toBeTruthy()
    expect(events![0][0]).toMatchObject({ id: 42, title: 'Edit me' })
  })

  it('opens the confirm dialog when a card emits delete (does not destroy directly)', async () => {
    const store = useNotesStore()
    store.notes = [note({ id: 7 })]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)
    const destroySpy = vi.spyOn(store, 'destroy')

    const wrapper = mount(NotesGrid)
    await flushPromises()
    await wrapper.find('[data-testid="note-card-delete"]').trigger('click')

    expect(confirmRequireMock).toHaveBeenCalledOnce()
    expect(destroySpy).not.toHaveBeenCalled() // not until confirmed
  })

  it('actually calls store.destroy after the confirm dialog is accepted', async () => {
    const store = useNotesStore()
    store.notes = [note({ id: 7 })]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)
    const destroySpy = vi.spyOn(store, 'destroy').mockResolvedValueOnce(true)

    const wrapper = mount(NotesGrid)
    await flushPromises()
    await wrapper.find('[data-testid="note-card-delete"]').trigger('click')

    // Pull the accept callback out of the confirm.require call and run it
    const accept = confirmRequireMock.mock.calls[0][0].accept
    await accept()

    expect(destroySpy).toHaveBeenCalledWith(7)
  })

  it('translates DataTable page events into 1-indexed fetchPage calls', async () => {
    const store = useNotesStore()
    store.notes = [note()]
    store.pagination = { page: 1, limit: 20, pages: 5, count: 100, prev: null, next: 2 }
    const spy = vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesGrid)
    await flushPromises()
    spy.mockClear()

    const paginator = wrapper.findComponent({ name: 'Paginator' })
    expect(paginator.exists()).toBe(true)
    paginator.vm.$emit('page', { page: 3, rows: 12, first: 36, pageCount: 9 })
    await flushPromises()

    expect(spy).toHaveBeenCalledWith(4, 12)
  })

  it('hides the paginator when total fits in a single page', async () => {
    const store = useNotesStore()
    store.notes = [note()]
    store.pagination = { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesGrid)
    await flushPromises()

    expect(wrapper.find('[data-testid="notes-paginator"]').exists()).toBe(false)
  })

  it('surfaces a load error to the user', async () => {
    const store = useNotesStore()
    store.loadError = 'Could not connect'
    vi.spyOn(store, 'fetchPage').mockResolvedValue(undefined)

    const wrapper = mount(NotesGrid)
    await flushPromises()

    expect(wrapper.find('[data-testid="notes-load-error"]').exists()).toBe(true)
  })
})
