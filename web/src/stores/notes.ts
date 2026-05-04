import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError, createNote, listNotes } from '@/api/notes'
import type { Note, NoteInput, PaginationMeta } from '@/types/note'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const pagination = ref<PaginationMeta | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const loadError = ref<string | null>(null)
  const submitError = ref<string | null>(null)
  const validationErrors = ref<Record<string, string[]>>({})

  async function fetchPage(page = 1, limit?: number): Promise<void> {
    loading.value = true
    loadError.value = null
    try {
      const result = await listNotes({
        page,
        limit: limit ?? pagination.value?.limit
      })
      notes.value = result.data
      pagination.value = result.pagination
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  /**
   * Returns the persisted Note on success, or null on failure.
   * On 422 the per-field messages are stored in `validationErrors` for
   * the form to surface; on any other failure the flat message goes
   * into `submitError`.
   */
  async function create(input: NoteInput): Promise<Note | null> {
    submitting.value = true
    submitError.value = null
    validationErrors.value = {}

    try {
      const created = await createNote(input)
      // Refresh from the server rather than splicing locally — the new
      // note may not belong on the current page (different sort order,
      // page boundary), and re-fetching keeps the displayed pagination
      // metadata accurate.
      await fetchPage(pagination.value?.page ?? 1)
      return created
    } catch (err) {
      if (err instanceof ApiError && err.validationErrors) {
        validationErrors.value = err.validationErrors
      } else {
        submitError.value = err instanceof Error ? err.message : 'Unknown error'
      }
      return null
    } finally {
      submitting.value = false
    }
  }

  function clearValidationErrors(): void {
    validationErrors.value = {}
  }

  return {
    notes,
    pagination,
    loading,
    submitting,
    loadError,
    submitError,
    validationErrors,
    fetchPage,
    create,
    clearValidationErrors
  }
})
