import { useQuery } from '@pinia/colada'
import type { Ref } from 'vue'
import { listNotes } from '@/api/notes'

export interface NotesQueryParams {
  page: Ref<number>
  limit: Ref<number>
  search?: Ref<string>
}

/**
 * Reactive query for the paginated notes list. Re-runs whenever any of
 * `page`, `limit` or `search` change. Cache key is the full param set
 * so each (page, limit, search) tuple is cached independently — paging
 * back to a previously visited page hits the cache.
 *
 * Mutations elsewhere invalidate the `['notes']` prefix, which evicts
 * every variant and triggers an automatic refetch on the active query.
 */
export function useNotesQuery(params: NotesQueryParams) {
  return useQuery({
    key: () => [
      'notes',
      {
        page: params.page.value,
        limit: params.limit.value,
        search: params.search?.value?.trim() ?? ''
      }
    ],
    query: () =>
      listNotes({
        page: params.page.value,
        limit: params.limit.value,
        search: params.search?.value
      }),
    // Notes don't change without our knowledge in this single-user app —
    // 30s of staleness is plenty to dedupe pagination jitter and
    // tab-focus refetches without showing stale data after a mutation
    // (mutations explicitly invalidate the cache).
    staleTime: 30_000
  })
}
