import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useQueryCache } from '@pinia/colada'
import {
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation
} from './useNotesMutations'
import { useNotesQuery } from './useNotesQuery'
import * as api from '@/api/notes'
import type { Note } from '@/types/note'

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

const mockedList = vi.mocked(api.listNotes)
const mockedCreate = vi.mocked(api.createNote)
const mockedUpdate = vi.mocked(api.updateNote)
const mockedDelete = vi.mocked(api.deleteNote)

const sampleNote: Note = {
  id: 1,
  title: 't',
  content: 'c',
  created_at: '',
  updated_at: ''
}
const samplePage = {
  data: [],
  pagination: { page: 1, limit: 20, pages: 1, count: 0, prev: null, next: null }
}

function mountWith<T>(setup: () => T) {
  let exposed!: T
  const Comp = defineComponent({
    setup() {
      exposed = setup()
      return () => h('div')
    }
  })
  mount(Comp)
  return exposed
}

describe('useCreateNoteMutation', () => {
  beforeEach(() => {
    mockedCreate.mockReset()
    mockedList.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('calls createNote with the input on mutateAsync', async () => {
    mockedCreate.mockResolvedValueOnce(sampleNote)
    const { mutateAsync } = mountWith(() => useCreateNoteMutation())

    const result = await mutateAsync({ title: 'New', content: null })

    expect(mockedCreate).toHaveBeenCalledWith({ title: 'New', content: null })
    expect(result).toEqual(sampleNote)
  })

  it('rejects with the API error when the server returns 422', async () => {
    const { ApiError } = await import('@/api/notes')
    mockedCreate.mockRejectedValueOnce(
      new ApiError('Validation failed', { status: 422, validationErrors: { title: ['blank'] } })
    )
    const { mutateAsync } = mountWith(() => useCreateNoteMutation())

    await expect(mutateAsync({ title: '' })).rejects.toMatchObject({
      status: 422,
      validationErrors: { title: ['blank'] }
    })
  })

  it('invalidates the notes cache after settling, triggering refetch on active queries', async () => {
    mockedList.mockResolvedValue(samplePage)
    mockedCreate.mockResolvedValueOnce(sampleNote)

    // Mount a query first so something is subscribed to the ['notes'] key
    const page = ref(1)
    const limit = ref(20)
    mountWith(() => useNotesQuery({ page, limit }))
    await flushPromises()
    expect(mockedList).toHaveBeenCalledTimes(1)

    // Then perform the mutation
    const { mutateAsync } = mountWith(() => useCreateNoteMutation())
    await mutateAsync({ title: 'x' })
    await flushPromises()

    // Cache invalidation should have kicked off a refetch
    expect(mockedList).toHaveBeenCalledTimes(2)
  })
})

describe('useUpdateNoteMutation', () => {
  beforeEach(() => {
    mockedUpdate.mockReset()
    mockedList.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('calls updateNote with id and input', async () => {
    mockedUpdate.mockResolvedValueOnce({ ...sampleNote, id: 5 })
    const { mutateAsync } = mountWith(() => useUpdateNoteMutation())

    await mutateAsync({ id: 5, input: { title: 'Updated' } })

    expect(mockedUpdate).toHaveBeenCalledWith(5, { title: 'Updated' })
  })

  it('invalidates the notes cache on settle', async () => {
    mockedList.mockResolvedValue(samplePage)
    mockedUpdate.mockResolvedValueOnce(sampleNote)

    const page = ref(1)
    const limit = ref(20)
    mountWith(() => useNotesQuery({ page, limit }))
    await flushPromises()

    const { mutateAsync } = mountWith(() => useUpdateNoteMutation())
    await mutateAsync({ id: 1, input: { title: 'x' } })
    await flushPromises()

    expect(mockedList).toHaveBeenCalledTimes(2)
  })
})

describe('useDeleteNoteMutation', () => {
  beforeEach(() => {
    mockedDelete.mockReset()
    mockedList.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('calls deleteNote with the id', async () => {
    mockedDelete.mockResolvedValueOnce(undefined)
    const { mutateAsync } = mountWith(() => useDeleteNoteMutation())

    await mutateAsync(7)

    expect(mockedDelete).toHaveBeenCalledWith(7)
  })

  it('invalidates the notes cache on settle (so the deleted item disappears)', async () => {
    mockedList.mockResolvedValue(samplePage)
    mockedDelete.mockResolvedValueOnce(undefined)

    const page = ref(1)
    const limit = ref(20)
    mountWith(() => useNotesQuery({ page, limit }))
    await flushPromises()

    const { mutateAsync } = mountWith(() => useDeleteNoteMutation())
    await mutateAsync(1)
    await flushPromises()

    expect(mockedList).toHaveBeenCalledTimes(2)
  })

  it('invalidates the cache even when the mutation fails (onSettled, not onSuccess)', async () => {
    mockedList.mockResolvedValue(samplePage)
    mockedDelete.mockRejectedValueOnce(new Error('boom'))

    const page = ref(1)
    const limit = ref(20)
    mountWith(() => useNotesQuery({ page, limit }))
    await flushPromises()

    const { mutateAsync } = mountWith(() => useDeleteNoteMutation())
    await expect(mutateAsync(1)).rejects.toThrow('boom')
    await flushPromises()

    // List was refetched anyway — keeps the UI consistent if the failure
    // turns out to have been a transient error and the row actually exists.
    expect(mockedList).toHaveBeenCalledTimes(2)
  })
})

describe('useQueryCache integration', () => {
  beforeEach(() => {
    mockedList.mockReset()
  })

  it('exposes a cache that the mutations can target', () => {
    const cache = mountWith(() => useQueryCache())
    expect(cache.invalidateQueries).toBeTypeOf('function')
  })
})
