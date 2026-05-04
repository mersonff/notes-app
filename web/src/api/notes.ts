import { AxiosError } from 'axios'
import { apiClient } from './client'
import type { Note, NoteInput, NotesPage } from '@/types/note'

/**
 * Domain-friendly error wrapping the various shapes the Rails API can
 * return so callers can branch on `validationErrors` vs a flat message
 * without inspecting raw axios internals.
 */
export class ApiError extends Error {
  status?: number
  validationErrors?: Record<string, string[]>

  constructor(
    message: string,
    opts: { status?: number; validationErrors?: Record<string, string[]> } = {}
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = opts.status
    this.validationErrors = opts.validationErrors
  }
}

function wrap(err: unknown, fallbackMessage: string): ApiError {
  if (err instanceof AxiosError) {
    const status = err.response?.status
    const data = err.response?.data as
      | { error?: string; errors?: Record<string, string[]> }
      | undefined

    if (data?.errors) {
      return new ApiError('Validation failed', {
        status,
        validationErrors: data.errors
      })
    }
    return new ApiError(data?.error ?? err.message ?? fallbackMessage, { status })
  }
  return new ApiError(err instanceof Error ? err.message : fallbackMessage)
}

export interface ListParams {
  page?: number
  limit?: number
}

export async function listNotes(params: ListParams = {}): Promise<NotesPage> {
  try {
    const { data } = await apiClient.get<NotesPage>('/notes', { params })
    return data
  } catch (err) {
    throw wrap(err, 'Could not list notes')
  }
}

export async function getNote(id: number): Promise<Note> {
  try {
    const { data } = await apiClient.get<{ data: Note }>(`/notes/${id}`)
    return data.data
  } catch (err) {
    throw wrap(err, 'Could not load note')
  }
}

export async function createNote(input: NoteInput): Promise<Note> {
  try {
    const { data } = await apiClient.post<{ data: Note }>('/notes', { note: input })
    return data.data
  } catch (err) {
    throw wrap(err, 'Could not create note')
  }
}

export async function updateNote(id: number, input: NoteInput): Promise<Note> {
  try {
    const { data } = await apiClient.patch<{ data: Note }>(`/notes/${id}`, { note: input })
    return data.data
  } catch (err) {
    throw wrap(err, 'Could not update note')
  }
}

export async function deleteNote(id: number): Promise<void> {
  try {
    await apiClient.delete(`/notes/${id}`)
  } catch (err) {
    throw wrap(err, 'Could not delete note')
  }
}
