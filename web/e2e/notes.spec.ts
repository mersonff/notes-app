import { test, expect } from '@playwright/test'

/**
 * Smoke-only end-to-end suite.
 *
 * These specs exercise the full stack (Rails + DB + Vue) and complement
 * (don't replace) the unit-level tests on each side. We intentionally keep
 * the assertions tight and the data unique-per-run so the suite is robust
 * against accumulated state in the development database.
 */
test.describe('Notes app', () => {
  test('user creates a note and sees it appear at the top of the list', async ({ page }) => {
    await page.goto('/')

    const stamp = Date.now()
    const title = `E2E ${stamp}`
    const content = `Conteúdo end-to-end ${stamp}`

    await page.getByTestId('note-title').fill(title)
    await page.getByTestId('note-content').fill(content)
    await page.getByTestId('note-save').click()

    // Success toast (translated)
    await expect(page.getByText('Anotação criada')).toBeVisible()

    // The new note must appear in the list (most-recent-first ordering
    // guarantees it shows up on page 1).
    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByText(content)).toBeVisible()

    // The form should reset to empty after a successful submission.
    await expect(page.getByTestId('note-title')).toHaveValue('')
    await expect(page.getByTestId('note-content')).toHaveValue('')
  })

  test('user sees a translated validation error when submitting an empty title', async ({
    page
  }) => {
    await page.goto('/')

    await page.getByTestId('note-save').click()

    await expect(page.getByText('Título é obrigatório')).toBeVisible()

    // No success toast should appear; the API was never called.
    await expect(page.getByText('Anotação criada')).not.toBeVisible()
  })

  test('list shows the empty-state copy when no data is returned', async ({ page }) => {
    // Intercept GET /notes to force an empty page so the test is
    // independent of whatever data lives in the dev DB.
    await page.route('**/api/v1/notes**', async (route, request) => {
      if (request.method() !== 'GET') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          pagination: { page: 1, limit: 20, pages: 1, count: 0, prev: null, next: null }
        })
      })
    })

    await page.goto('/')
    await expect(page.getByTestId('notes-empty')).toBeVisible()
  })
})
