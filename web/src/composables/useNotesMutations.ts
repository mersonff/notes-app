import { useMutation, useQueryCache } from '@pinia/colada'
import { createNote, deleteNote, updateNote } from '@/api/notes'
import type { Note, NoteInput } from '@/types/note'

const NOTES_KEY = ['notes'] as const

/**
 * Each mutation invalidates the entire `['notes']` prefix on settle so
 * any active list query (regardless of page/limit/search) refetches
 * with fresh data. Using `onSettled` (not `onSuccess`) means the cache
 * is also refreshed after a failed write — important if a 422 came back
 * because the server modified state via another path (rare, but cheap
 * to defend against).
 */

export function useCreateNoteMutation() {
  const cache = useQueryCache()
  return useMutation({
    mutation: (input: NoteInput): Promise<Note> => createNote(input),
    onSettled: () => cache.invalidateQueries({ key: NOTES_KEY })
  })
}

export interface UpdateNoteVars {
  id: number
  input: NoteInput
}

export function useUpdateNoteMutation() {
  const cache = useQueryCache()
  return useMutation({
    mutation: (vars: UpdateNoteVars): Promise<Note> => updateNote(vars.id, vars.input),
    onSettled: () => cache.invalidateQueries({ key: NOTES_KEY })
  })
}

export function useDeleteNoteMutation() {
  const cache = useQueryCache()
  return useMutation({
    mutation: (id: number): Promise<void> => deleteNote(id),
    onSettled: () => cache.invalidateQueries({ key: NOTES_KEY })
  })
}
