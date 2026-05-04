import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { ApiError, createNote, listNotes } from './notes'
import { apiClient } from './client'

describe('api/notes', () => {
  beforeEach(() => {
    vi.spyOn(apiClient, 'get').mockReset()
    vi.spyOn(apiClient, 'post').mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function buildAxiosError(status: number, data: unknown): AxiosError {
    return new AxiosError('Request failed', String(status), undefined, undefined, {
      status,
      data,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() }
    })
  }

  describe('listNotes', () => {
    it('returns the parsed page on success', async () => {
      const page = {
        data: [
          {
            id: 1,
            title: 'a',
            content: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        ],
        pagination: { page: 1, limit: 20, pages: 1, count: 1, prev: null, next: null }
      }
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: page })

      await expect(listNotes({ page: 1, limit: 20 })).resolves.toEqual(page)
    })

    it('throws ApiError carrying the server message on a flat error', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(
        buildAxiosError(400, { error: 'Bad request' })
      )

      await expect(listNotes()).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: 'Bad request'
      })
    })

    it('throws ApiError on network failure (no response)', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network Error'))

      await expect(listNotes()).rejects.toBeInstanceOf(ApiError)
    })
  })

  describe('createNote', () => {
    it('returns the created note unwrapped from the data envelope', async () => {
      vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        data: {
          data: {
            id: 5,
            title: 'New',
            content: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z'
          }
        }
      })

      const note = await createNote({ title: 'New' })
      expect(note.id).toBe(5)
      expect(note.title).toBe('New')
    })

    it('preserves per-field validation errors on a 422', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(
        buildAxiosError(422, { errors: { title: ['não pode ficar em branco'] } })
      )

      try {
        await createNote({ title: '' })
        expect.fail('should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.status).toBe(422)
        expect(apiErr.validationErrors).toEqual({
          title: ['não pode ficar em branco']
        })
      }
    })

    it('falls back to a generic message when the server returns no body', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(buildAxiosError(500, undefined))

      await expect(createNote({ title: 'x' })).rejects.toBeInstanceOf(ApiError)
    })
  })
})
