import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ApiError, createNote, deleteNote, listNotes, updateNote } from '@/api/notes'
import type { Note, NoteInput, PaginationMeta } from '@/types/note'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const pagination = ref<PaginationMeta | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const deleting = ref(false)
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
   * Refresh the current page after a successful mutation. If the page we're
   * on no longer has any items (e.g. we just deleted the last note on it),
   * step back one page so the user doesn't stare at an empty grid.
   */
  async function refreshAfterMutation(): Promise<void> {
    const currentPage = pagination.value?.page ?? 1
    await fetchPage(currentPage)
    if (notes.value.length === 0 && currentPage > 1) {
      await fetchPage(currentPage - 1)
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
      await refreshAfterMutation()
      return created
    } catch (err) {
      return handleSubmitError(err)
    } finally {
      submitting.value = false
    }
  }

  /** Same contract as create; returns the updated note or null. */
  async function update(id: number, input: NoteInput): Promise<Note | null> {
    submitting.value = true
    submitError.value = null
    validationErrors.value = {}

    try {
      const updated = await updateNote(id, input)
      await refreshAfterMutation()
      return updated
    } catch (err) {
      return handleSubmitError(err)
    } finally {
      submitting.value = false
    }
  }

  /** Returns true on success, false on failure (with submitError populated). */
  async function destroy(id: number): Promise<boolean> {
    deleting.value = true
    submitError.value = null

    try {
      await deleteNote(id)
      await refreshAfterMutation()
      return true
    } catch (err) {
      submitError.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      deleting.value = false
    }
  }

  function handleSubmitError(err: unknown): null {
    if (err instanceof ApiError && err.validationErrors) {
      validationErrors.value = err.validationErrors
    } else {
      submitError.value = err instanceof Error ? err.message : 'Unknown error'
    }
    return null
  }

  function clearValidationErrors(): void {
    validationErrors.value = {}
    submitError.value = null
  }

  return {
    notes,
    pagination,
    loading,
    submitting,
    deleting,
    loadError,
    submitError,
    validationErrors,
    fetchPage,
    create,
    update,
    destroy,
    clearValidationErrors
  }
})
