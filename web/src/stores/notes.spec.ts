import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotesStore } from './notes'
import * as api from '@/api/notes'
import { ApiError } from '@/api/notes'
import type { Note, NotesPage } from '@/types/note'

vi.mock('@/api/notes', async () => {
  const actual = await vi.importActual<typeof import('@/api/notes')>('@/api/notes')
  return {
    ...actual,
    listNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn()
  }
})

const mockedListNotes = vi.mocked(api.listNotes)
const mockedCreateNote = vi.mocked(api.createNote)
const mockedUpdateNote = vi.mocked(api.updateNote)
const mockedDeleteNote = vi.mocked(api.deleteNote)

const samplePage = (overrides: Partial<NotesPage> = {}): NotesPage => ({
  data: [
    { id: 1, title: 'one', content: null, created_at: '', updated_at: '' },
    { id: 2, title: 'two', content: 'x', created_at: '', updated_at: '' }
  ],
  pagination: { page: 1, limit: 20, pages: 1, count: 2, prev: null, next: null },
  ...overrides
})

describe('useNotesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedListNotes.mockReset()
    mockedCreateNote.mockReset()
    mockedUpdateNote.mockReset()
    mockedDeleteNote.mockReset()
  })

  describe('fetchPage', () => {
    it('populates notes and pagination on success', async () => {
      mockedListNotes.mockResolvedValueOnce(samplePage())
      const store = useNotesStore()

      await store.fetchPage(1)

      expect(store.notes).toHaveLength(2)
      expect(store.pagination?.count).toBe(2)
      expect(store.loading).toBe(false)
      expect(store.loadError).toBeNull()
    })

    it('toggles loading around the call', async () => {
      let resolveDeferred!: (value: NotesPage) => void
      mockedListNotes.mockImplementationOnce(
        () =>
          new Promise<NotesPage>((resolve) => {
            resolveDeferred = resolve
          })
      )
      const store = useNotesStore()

      const promise = store.fetchPage(1)
      expect(store.loading).toBe(true)

      resolveDeferred(samplePage())
      await promise
      expect(store.loading).toBe(false)
    })

    it('captures the error message when the API fails', async () => {
      mockedListNotes.mockRejectedValueOnce(new ApiError('Connection refused'))
      const store = useNotesStore()

      await store.fetchPage(1)

      expect(store.loadError).toBe('Connection refused')
      expect(store.notes).toEqual([])
    })

    it('reuses the current limit when called without arguments', async () => {
      mockedListNotes
        .mockResolvedValueOnce(
          samplePage({
            pagination: { page: 1, limit: 5, pages: 4, count: 18, prev: null, next: 2 }
          })
        )
        .mockResolvedValueOnce(samplePage())
      const store = useNotesStore()

      await store.fetchPage(1, 5)
      await store.fetchPage(2)

      expect(mockedListNotes).toHaveBeenLastCalledWith({ page: 2, limit: 5 })
    })
  })

  describe('create', () => {
    const created: Note = {
      id: 10,
      title: 'New',
      content: 'C',
      created_at: '',
      updated_at: ''
    }

    it('returns the created note and refreshes the current page on success', async () => {
      mockedCreateNote.mockResolvedValueOnce(created)
      mockedListNotes.mockResolvedValueOnce(samplePage())
      const store = useNotesStore()

      const result = await store.create({ title: 'New', content: 'C' })

      expect(result).toEqual(created)
      expect(mockedListNotes).toHaveBeenCalledOnce()
      expect(store.submitError).toBeNull()
      expect(store.validationErrors).toEqual({})
    })

    it('populates validationErrors on a 422 and returns null', async () => {
      mockedCreateNote.mockRejectedValueOnce(
        new ApiError('Validation failed', {
          status: 422,
          validationErrors: { title: ["can't be blank"] }
        })
      )
      const store = useNotesStore()

      const result = await store.create({ title: '' })

      expect(result).toBeNull()
      expect(store.validationErrors).toEqual({ title: ["can't be blank"] })
      expect(store.submitError).toBeNull()
    })

    it('sets submitError on a non-validation failure', async () => {
      mockedCreateNote.mockRejectedValueOnce(new ApiError('Network down'))
      const store = useNotesStore()

      const result = await store.create({ title: 'x' })

      expect(result).toBeNull()
      expect(store.submitError).toBe('Network down')
      expect(store.validationErrors).toEqual({})
    })

    it('clears any previous validationErrors before a new attempt', async () => {
      const store = useNotesStore()
      store.validationErrors = { title: ['stale'] }

      mockedCreateNote.mockResolvedValueOnce(created)
      mockedListNotes.mockResolvedValueOnce(samplePage())

      await store.create({ title: 'x' })

      expect(store.validationErrors).toEqual({})
    })

    it('toggles submitting around the call', async () => {
      let resolveCreate!: (value: Note) => void
      mockedCreateNote.mockImplementationOnce(
        () =>
          new Promise<Note>((resolve) => {
            resolveCreate = resolve
          })
      )
      mockedListNotes.mockResolvedValueOnce(samplePage())
      const store = useNotesStore()

      const promise = store.create({ title: 'x' })
      expect(store.submitting).toBe(true)

      resolveCreate(created)
      await promise
      expect(store.submitting).toBe(false)
    })
  })

  describe('update', () => {
    const updated: Note = {
      id: 7,
      title: 'Updated',
      content: 'New content',
      created_at: '',
      updated_at: ''
    }

    it('returns the updated note and refreshes the current page on success', async () => {
      mockedUpdateNote.mockResolvedValueOnce(updated)
      mockedListNotes.mockResolvedValueOnce(samplePage())
      const store = useNotesStore()

      const result = await store.update(7, { title: 'Updated', content: 'New content' })

      expect(result).toEqual(updated)
      expect(mockedUpdateNote).toHaveBeenCalledWith(7, { title: 'Updated', content: 'New content' })
      expect(mockedListNotes).toHaveBeenCalledOnce()
      expect(store.submitError).toBeNull()
      expect(store.validationErrors).toEqual({})
    })

    it('populates validationErrors on a 422 and returns null', async () => {
      mockedUpdateNote.mockRejectedValueOnce(
        new ApiError('Validation failed', {
          status: 422,
          validationErrors: { title: ['too long'] }
        })
      )
      const store = useNotesStore()

      const result = await store.update(7, { title: '' })

      expect(result).toBeNull()
      expect(store.validationErrors).toEqual({ title: ['too long'] })
      expect(store.submitError).toBeNull()
    })

    it('sets submitError on a 404 (note disappeared between page-load and edit)', async () => {
      mockedUpdateNote.mockRejectedValueOnce(
        new ApiError('Recurso não encontrado.', { status: 404 })
      )
      const store = useNotesStore()

      const result = await store.update(7, { title: 'x' })

      expect(result).toBeNull()
      expect(store.submitError).toBe('Recurso não encontrado.')
    })

    it('clears any previous validationErrors before a new attempt', async () => {
      const store = useNotesStore()
      store.validationErrors = { title: ['stale'] }

      mockedUpdateNote.mockResolvedValueOnce(updated)
      mockedListNotes.mockResolvedValueOnce(samplePage())

      await store.update(7, { title: 'x' })

      expect(store.validationErrors).toEqual({})
    })
  })

  describe('destroy', () => {
    it('returns true and refreshes the current page on success', async () => {
      mockedDeleteNote.mockResolvedValueOnce(undefined)
      mockedListNotes.mockResolvedValueOnce(samplePage())
      const store = useNotesStore()

      const ok = await store.destroy(7)

      expect(ok).toBe(true)
      expect(mockedDeleteNote).toHaveBeenCalledWith(7)
      expect(mockedListNotes).toHaveBeenCalledOnce()
      expect(store.submitError).toBeNull()
    })

    it('returns false and sets submitError on failure', async () => {
      mockedDeleteNote.mockRejectedValueOnce(
        new ApiError('Recurso não encontrado.', { status: 404 })
      )
      const store = useNotesStore()

      const ok = await store.destroy(7)

      expect(ok).toBe(false)
      expect(store.submitError).toBe('Recurso não encontrado.')
    })

    it('toggles deleting around the call', async () => {
      let resolveDelete!: () => void
      mockedDeleteNote.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve
          })
      )
      mockedListNotes.mockResolvedValueOnce(samplePage())
      const store = useNotesStore()

      const promise = store.destroy(7)
      expect(store.deleting).toBe(true)

      resolveDelete()
      await promise
      expect(store.deleting).toBe(false)
    })

    it('falls back to the previous page when the current page becomes empty', async () => {
      mockedDeleteNote.mockResolvedValueOnce(undefined)
      // First refresh after delete returns 0 items on the current page
      mockedListNotes.mockResolvedValueOnce(
        samplePage({
          data: [],
          pagination: { page: 2, limit: 20, pages: 1, count: 0, prev: 1, next: null }
        })
      )
      // Second refresh (page-back) returns the previous page with data
      mockedListNotes.mockResolvedValueOnce(samplePage())

      const store = useNotesStore()
      // Pretend the user is currently on page 2
      store.pagination = { page: 2, limit: 20, pages: 2, count: 21, prev: 1, next: null }

      await store.destroy(7)

      expect(mockedListNotes).toHaveBeenCalledTimes(2)
      expect(mockedListNotes).toHaveBeenNthCalledWith(1, { page: 2, limit: 20 })
      expect(mockedListNotes).toHaveBeenNthCalledWith(2, { page: 1, limit: 20 })
    })
  })
})
