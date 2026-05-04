import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useNotesQuery } from './useNotesQuery'
import * as api from '@/api/notes'

vi.mock('@/api/notes', async () => {
  const actual = await vi.importActual<typeof import('@/api/notes')>('@/api/notes')
  return {
    ...actual,
    listNotes: vi.fn()
  }
})

const mockedList = vi.mocked(api.listNotes)

const samplePage = {
  data: [],
  pagination: { page: 1, limit: 20, pages: 1, count: 0, prev: null, next: null }
}

// Wraps the composable in a tiny component so it gets a setup() context
// and the Pinia/Pinia-Colada plugins from the test setup.
function mountQuery(params: {
  page: ReturnType<typeof ref<number>>
  limit: ReturnType<typeof ref<number>>
  search?: ReturnType<typeof ref<string>>
}) {
  let exposed!: ReturnType<typeof useNotesQuery>
  const Comp = defineComponent({
    setup() {
      exposed = useNotesQuery(params)
      return () => h('div')
    }
  })
  const wrapper = mount(Comp)
  return { wrapper, query: exposed }
}

describe('useNotesQuery', () => {
  beforeEach(() => {
    mockedList.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('calls listNotes with the current page/limit values', async () => {
    mockedList.mockResolvedValue(samplePage)
    const page = ref(2)
    const limit = ref(10)

    mountQuery({ page, limit })
    await flushPromises()

    expect(mockedList).toHaveBeenCalledWith({ page: 2, limit: 10, search: undefined })
  })

  it('refetches when the page ref changes', async () => {
    mockedList.mockResolvedValue(samplePage)
    const page = ref(1)
    const limit = ref(20)

    mountQuery({ page, limit })
    await flushPromises()
    expect(mockedList).toHaveBeenCalledTimes(1)

    page.value = 3
    await flushPromises()

    expect(mockedList).toHaveBeenCalledTimes(2)
    expect(mockedList).toHaveBeenLastCalledWith({ page: 3, limit: 20, search: undefined })
  })

  it('refetches when the limit ref changes', async () => {
    mockedList.mockResolvedValue(samplePage)
    const page = ref(1)
    const limit = ref(20)

    mountQuery({ page, limit })
    await flushPromises()
    limit.value = 5
    await flushPromises()

    expect(mockedList).toHaveBeenCalledTimes(2)
    expect(mockedList).toHaveBeenLastCalledWith({ page: 1, limit: 5, search: undefined })
  })

  it('forwards a search ref when provided', async () => {
    mockedList.mockResolvedValue(samplePage)
    const page = ref(1)
    const limit = ref(20)
    const search = ref('hello')

    mountQuery({ page, limit, search })
    await flushPromises()

    expect(mockedList).toHaveBeenCalledWith({ page: 1, limit: 20, search: 'hello' })
  })

  it('refetches when the search ref changes', async () => {
    mockedList.mockResolvedValue(samplePage)
    const page = ref(1)
    const limit = ref(20)
    const search = ref('')

    mountQuery({ page, limit, search })
    await flushPromises()

    search.value = 'novo'
    await flushPromises()

    expect(mockedList).toHaveBeenCalledTimes(2)
    expect(mockedList).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: 'novo' })
  })

  it('exposes data, error and asyncStatus from Pinia Colada', async () => {
    mockedList.mockResolvedValueOnce({
      data: [{ id: 1, title: 't', content: null, created_at: '', updated_at: '' }],
      pagination: { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
    })
    const page = ref(1)
    const limit = ref(20)

    const { query } = mountQuery({ page, limit })
    await flushPromises()

    expect(query.state.value.status).toBe('success')
    expect(query.state.value.data?.data).toHaveLength(1)
    expect(query.error.value).toBeNull()
  })

  it('exposes the error in state.value.error when the API rejects', async () => {
    mockedList.mockRejectedValueOnce(new Error('network'))
    const page = ref(1)
    const limit = ref(20)

    const { query } = mountQuery({ page, limit })
    await flushPromises()

    expect(query.state.value.status).toBe('error')
    expect(query.state.value.error?.message).toBe('network')
  })
})
