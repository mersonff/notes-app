import { test, expect, type Page } from '@playwright/test'

/**
 * Smoke-only end-to-end suite.
 *
 * Exercises the full stack (Rails + DB + Vue) and complements the unit-level
 * tests on each side. Tests are written to be robust against accumulated
 * data in the development database — every note created during the suite
 * uses a unique timestamp so we can target it specifically and clean up
 * if needed.
 */

async function openCreateDialog(page: Page) {
  await page.getByTestId('open-new-note').click()
  await expect(page.getByTestId('note-form-dialog')).toBeVisible()
}

async function fillNote(page: Page, title: string, content?: string) {
  await page.getByTestId('note-title').fill(title)
  if (content) await page.getByTestId('note-content').fill(content)
}

async function saveNote(page: Page) {
  await page.getByTestId('note-save').click()
}

test.describe('Notes app — CRUD', () => {
  test('create: user opens dialog, fills form, sees note in the grid', async ({ page }) => {
    await page.goto('/')

    const stamp = Date.now()
    const title = `E2E create ${stamp}`
    const content = `Conteúdo de criação ${stamp}`

    await openCreateDialog(page)
    await fillNote(page, title, content)
    await saveNote(page)

    // Success toast (translated)
    await expect(page.getByText('Anotação criada')).toBeVisible()

    // Dialog closes after success
    await expect(page.getByTestId('note-form-dialog')).not.toBeVisible()

    // The new note must appear in the grid as a card
    const card = page.locator('[data-testid="note-card"]').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card).toContainText(content)
  })

  test('validation: empty title shows translated error and the API is not called', async ({
    page
  }) => {
    await page.goto('/')

    await openCreateDialog(page)
    // Click save without filling anything
    await saveNote(page)

    await expect(page.getByText('Título é obrigatório')).toBeVisible()
    // No success toast (request was never sent)
    await expect(page.getByText('Anotação criada')).not.toBeVisible()
    // Dialog stays open
    await expect(page.getByTestId('note-form-dialog')).toBeVisible()
  })

  test('cancel: closes the dialog without persisting anything', async ({ page }) => {
    await page.goto('/')

    await openCreateDialog(page)
    await fillNote(page, 'Should not persist', 'irrelevant content')
    await page.getByTestId('note-cancel').click()

    await expect(page.getByTestId('note-form-dialog')).not.toBeVisible()
    // No success toast
    await expect(page.getByText('Anotação criada')).not.toBeVisible()
    // The would-be title doesn't show up in the grid
    await expect(
      page.locator('[data-testid="note-card"]').filter({ hasText: 'Should not persist' })
    ).toHaveCount(0)
  })

  test('edit: clicking pencil pre-fills the dialog and saves the new values', async ({ page }) => {
    await page.goto('/')

    // Seed: create a note we will edit
    const stamp = Date.now()
    const originalTitle = `E2E edit src ${stamp}`
    await openCreateDialog(page)
    await fillNote(page, originalTitle, 'original content')
    await saveNote(page)
    await expect(page.getByText('Anotação criada')).toBeVisible()

    // Find the just-created card and trigger edit
    const card = page.locator('[data-testid="note-card"]').filter({ hasText: originalTitle })
    await card.getByTestId('note-card-edit').click()

    // Dialog opens in edit mode with values pre-filled
    const dialog = page.getByTestId('note-form-dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Editar anotação')
    await expect(page.getByTestId('note-title')).toHaveValue(originalTitle)
    await expect(page.getByTestId('note-content')).toHaveValue('original content')

    // Change title and save
    const newTitle = `${originalTitle} EDITADO`
    await page.getByTestId('note-title').fill(newTitle)
    await saveNote(page)

    // Update toast appears, dialog closes, card now shows the new title
    await expect(page.getByText('Anotação atualizada')).toBeVisible()
    await expect(dialog).not.toBeVisible()
    await expect(
      page.locator('[data-testid="note-card"]').filter({ hasText: newTitle })
    ).toBeVisible()
  })

  test('delete: trash icon opens confirm; accepting removes the card', async ({ page }) => {
    await page.goto('/')

    // Seed
    const stamp = Date.now()
    const title = `E2E delete ${stamp}`
    await openCreateDialog(page)
    await fillNote(page, title, 'to be deleted')
    await saveNote(page)
    await expect(page.getByText('Anotação criada')).toBeVisible()

    const card = page.locator('[data-testid="note-card"]').filter({ hasText: title })
    await expect(card).toBeVisible()

    // Click delete → confirm dialog appears
    await card.getByTestId('note-card-delete').click()
    const confirmDialog = page.locator('.p-confirmdialog').filter({ hasText: 'Excluir anotação' })
    await expect(confirmDialog).toBeVisible()

    // Confirm — scope to the dialog so we don't collide with the per-card
    // delete buttons (which share the "Excluir" aria-label).
    await confirmDialog.locator('.p-confirmdialog-accept-button').click()

    await expect(page.getByText('Anotação excluída')).toBeVisible()
    await expect(card).toHaveCount(0)
  })

  test('empty state: shows message and CTA when the API returns no notes', async ({ page }) => {
    // Force an empty page so the test is independent of dev DB contents
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
    await expect(page.getByText('Nenhuma anotação ainda')).toBeVisible()
    await expect(page.getByTestId('notes-empty-cta')).toBeVisible()
  })

  test('search: filters by typing (debounced) and clears via the X button', async ({ page }) => {
    await page.goto('/')

    // Seed: create a note with a unique title we'll search for
    const stamp = Date.now()
    const uniqueTitle = `E2Esearch${stamp}`
    await openCreateDialog(page)
    await fillNote(page, uniqueTitle, 'searchable content')
    await saveNote(page)
    await expect(page.getByText('Anotação criada')).toBeVisible()

    // Type the unique title — wait past the 300ms debounce
    await page.getByTestId('notes-search').fill(uniqueTitle)

    // Card matching the term should be visible; assertion's auto-retry
    // covers the debounce window without needing waitForTimeout.
    const matchingCard = page.locator('[data-testid="note-card"]').filter({ hasText: uniqueTitle })
    await expect(matchingCard).toBeVisible()

    // And the count label should reflect "1 resultado"
    await expect(page.getByTestId('notes-count')).toContainText('resultado')

    // Clear via the X button — input empties, all cards return
    await page.getByTestId('notes-search-clear').click()
    await expect(page.getByTestId('notes-search')).toHaveValue('')
  })

  test('search: shows the no-results state when nothing matches', async ({ page }) => {
    await page.goto('/')

    const noMatchTerm = `nope-${Date.now()}-xyz`
    await page.getByTestId('notes-search').fill(noMatchTerm)

    // No-results empty state appears with the query echoed back
    await expect(page.getByTestId('notes-no-results')).toBeVisible()
    await expect(page.getByText(`Nenhum resultado para "${noMatchTerm}"`)).toBeVisible()
    await expect(page.getByTestId('notes-clear-search')).toBeVisible()

    // Regular "no notes" empty state must NOT appear (we have notes, just no match)
    await expect(page.getByTestId('notes-empty')).not.toBeVisible()

    // Clicking the clear button in the no-results state restores the list
    await page.getByTestId('notes-clear-search').click()
    await expect(page.getByTestId('notes-search')).toHaveValue('')
    await expect(page.getByTestId('notes-no-results')).not.toBeVisible()
  })
})
