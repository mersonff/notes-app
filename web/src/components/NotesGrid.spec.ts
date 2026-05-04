import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NotesGrid from './NotesGrid.vue'
import * as api from '@/api/notes'
import type { Note, PaginationMeta } from '@/types/note'

// Mock the network layer only — the real useDeleteNoteMutation runs on
// top of Pinia Colada (installed in setup.ts) so we exercise the actual
// mutation pipeline.
vi.mock('@/api/notes', async () => {
  const actual = await vi.importActual<typeof import('@/api/notes')>('@/api/notes')
  return {
    ...actual,
    deleteNote: vi.fn(),
    listNotes: vi.fn()
  }
})

const mockedDelete = vi.mocked(api.deleteNote)

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

const meta = (overrides: Partial<PaginationMeta> = {}): PaginationMeta => ({
  page: 1,
  limit: 20,
  pages: 1,
  count: 1,
  prev: null,
  next: null,
  ...overrides
})

function defaultProps(
  overrides: Partial<{
    notes: readonly Note[]
    pagination: PaginationMeta | null
    loading: boolean
    loadError: string | null
  }> = {}
) {
  return {
    notes: [],
    pagination: null,
    loading: false,
    loadError: null,
    ...overrides
  }
}

describe('NotesGrid.vue', () => {
  beforeEach(() => {
    confirmRequireMock.mockReset()
    mockedDelete.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders 6 skeleton cards while loading the first page', () => {
    const wrapper = mount(NotesGrid, { props: defaultProps({ loading: true }) })

    expect(wrapper.find('[data-testid="notes-loading"]').exists()).toBe(true)
    expect(wrapper.findAll('.note-skeleton')).toHaveLength(6)
  })

  it('shows the empty state with a CTA button when there are no notes', () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({ pagination: meta({ count: 0 }) })
    })

    expect(wrapper.find('[data-testid="notes-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Nenhuma anotação ainda')
    expect(wrapper.find('[data-testid="notes-empty-cta"]').exists()).toBe(true)
  })

  it('emits "create" when the empty-state CTA is clicked', async () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({ pagination: meta({ count: 0 }) })
    })

    await wrapper.find('[data-testid="notes-empty-cta"]').trigger('click')

    expect(wrapper.emitted('create')).toBeTruthy()
  })

  it('renders one card per note when data is present', () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({
        notes: [note({ id: 1, title: 'A' }), note({ id: 2, title: 'B' })],
        pagination: meta({ count: 2 })
      })
    })

    expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(2)
  })

  it('emits "edit" with the note when a card emits edit', async () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({
        notes: [note({ id: 42, title: 'Edit me' })],
        pagination: meta({ count: 1 })
      })
    })

    await wrapper.find('[data-testid="note-card-edit"]').trigger('click')

    const events = wrapper.emitted('edit')
    expect(events).toBeTruthy()
    expect(events![0][0]).toMatchObject({ id: 42, title: 'Edit me' })
  })

  it('opens the confirm dialog when a card emits delete (does not call API directly)', async () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({
        notes: [note({ id: 7 })],
        pagination: meta({ count: 1 })
      })
    })

    await wrapper.find('[data-testid="note-card-delete"]').trigger('click')

    expect(confirmRequireMock).toHaveBeenCalledOnce()
    expect(mockedDelete).not.toHaveBeenCalled()
  })

  it('calls deleteNote(id) after the confirm dialog is accepted', async () => {
    mockedDelete.mockResolvedValueOnce(undefined)
    const wrapper = mount(NotesGrid, {
      props: defaultProps({
        notes: [note({ id: 7 })],
        pagination: meta({ count: 1 })
      })
    })

    await wrapper.find('[data-testid="note-card-delete"]').trigger('click')
    const accept = confirmRequireMock.mock.calls[0][0].accept
    await accept()
    await flushPromises()

    expect(mockedDelete).toHaveBeenCalledWith(7)
  })

  it('translates Paginator page events into 1-indexed page emissions', async () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({
        notes: [note()],
        pagination: meta({ pages: 5, count: 100 })
      })
    })

    const paginator = wrapper.findComponent({ name: 'Paginator' })
    expect(paginator.exists()).toBe(true)
    paginator.vm.$emit('page', { page: 3, rows: 12, first: 36, pageCount: 9 })
    await flushPromises()

    const events = wrapper.emitted('page')
    expect(events).toBeTruthy()
    expect(events![0][0]).toEqual({ page: 4, rows: 12 })
  })

  it('hides the paginator when total fits in a single page', () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({
        notes: [note()],
        pagination: meta({ count: 1, pages: 1, limit: 20 })
      })
    })

    expect(wrapper.find('[data-testid="notes-paginator"]').exists()).toBe(false)
  })

  it('surfaces a load error to the user', () => {
    const wrapper = mount(NotesGrid, {
      props: defaultProps({ loadError: 'Could not connect' })
    })

    expect(wrapper.find('[data-testid="notes-load-error"]').exists()).toBe(true)
  })

  describe('search states', () => {
    it('shows the no-results state (with the query) when search is active and notes are empty', () => {
      const wrapper = mount(NotesGrid, {
        props: defaultProps({
          pagination: meta({ count: 0 }),
          searchQuery: 'reunião'
        })
      })

      expect(wrapper.find('[data-testid="notes-no-results"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Nenhum resultado para "reunião"')
      // The "no notes ever" empty state must NOT show when there's an active search
      expect(wrapper.find('[data-testid="notes-empty"]').exists()).toBe(false)
    })

    it('emits "clearSearch" when the clear button in the no-results state is clicked', async () => {
      const wrapper = mount(NotesGrid, {
        props: defaultProps({
          pagination: meta({ count: 0 }),
          searchQuery: 'foo'
        })
      })

      await wrapper.find('[data-testid="notes-clear-search"]').trigger('click')

      expect(wrapper.emitted('clearSearch')).toBeTruthy()
    })

    it('shows the regular empty state when search is empty (no query passed)', () => {
      const wrapper = mount(NotesGrid, {
        props: defaultProps({ pagination: meta({ count: 0 }), searchQuery: '' })
      })

      expect(wrapper.find('[data-testid="notes-empty"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="notes-no-results"]').exists()).toBe(false)
    })

    it('treats whitespace-only search as no active search (shows empty, not no-results)', () => {
      const wrapper = mount(NotesGrid, {
        props: defaultProps({ pagination: meta({ count: 0 }), searchQuery: '   ' })
      })

      expect(wrapper.find('[data-testid="notes-empty"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="notes-no-results"]').exists()).toBe(false)
    })

    it('does not show either empty state when search is active but notes match', () => {
      const wrapper = mount(NotesGrid, {
        props: defaultProps({
          notes: [note({ id: 1, title: 'Match' })],
          pagination: meta({ count: 1 }),
          searchQuery: 'mat'
        })
      })

      expect(wrapper.find('[data-testid="notes-empty"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="notes-no-results"]').exists()).toBe(false)
      expect(wrapper.findAll('[data-testid="note-card"]')).toHaveLength(1)
    })
  })
})
