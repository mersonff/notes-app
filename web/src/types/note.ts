export interface Note {
  id: number
  title: string
  content: string | null
  created_at: string
  updated_at: string
}

export interface PaginationMeta {
  page: number
  limit: number
  pages: number
  count: number
  prev: number | null
  next: number | null
}

export interface NotesPage {
  data: Note[]
  pagination: PaginationMeta
}

export interface NoteInput {
  title: string
  content?: string | null
}

/**
 * Validation error envelope returned by the Rails API on 422 responses.
 * Keys are attribute names ("title", "content"); values are arrays of
 * already-translated, user-facing messages.
 */
export interface ValidationErrorPayload {
  errors: Record<string, string[]>
}

export interface GenericErrorPayload {
  error: string
}

export const NOTE_LIMITS = {
  TITLE_MAX: 120,
  CONTENT_MAX: 5_000
} as const
