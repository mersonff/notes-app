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

export async function createNote(input: NoteInput): Promise<Note> {
  try {
    const { data } = await apiClient.post<{ data: Note }>('/notes', { note: input })
    return data.data
  } catch (err) {
    throw wrap(err, 'Could not create note')
  }
}
