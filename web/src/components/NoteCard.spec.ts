import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteCard from './NoteCard.vue'
import type { Note } from '@/types/note'

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 1,
  title: 'Reunião com time',
  content: 'Alinhar próximos passos',
  created_at: '2026-05-03T10:00:00Z',
  updated_at: '2026-05-03T10:00:00Z',
  ...overrides
})

describe('NoteCard.vue', () => {
  it('renders title and content', () => {
    const wrapper = mount(NoteCard, { props: { note: note() } })

    expect(wrapper.find('[data-testid="note-card-title"]').text()).toBe('Reunião com time')
    expect(wrapper.find('[data-testid="note-card-content"]').text()).toBe('Alinhar próximos passos')
  })

  it('falls back to a (sem título) placeholder when title is whitespace-only', () => {
    const wrapper = mount(NoteCard, { props: { note: note({ title: '   ' }) } })

    expect(wrapper.find('[data-testid="note-card-title"]').text()).toBe('(sem título)')
  })

  it('shows a (sem conteúdo) placeholder when content is null', () => {
    const wrapper = mount(NoteCard, { props: { note: note({ content: null }) } })

    expect(wrapper.find('[data-testid="note-card-content"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('(sem conteúdo)')
  })

  it('shows a (sem conteúdo) placeholder when content is whitespace-only', () => {
    const wrapper = mount(NoteCard, { props: { note: note({ content: '   ' }) } })

    expect(wrapper.text()).toContain('(sem conteúdo)')
  })

  it('renders the created_at as a localized datetime in pt-BR', () => {
    const wrapper = mount(NoteCard, { props: { note: note() } })

    // pt-BR short format: dd/MM/yyyy HH:mm
    expect(wrapper.find('time').text()).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('emits "edit" with the note when the edit button is clicked', async () => {
    const n = note()
    const wrapper = mount(NoteCard, { props: { note: n } })

    await wrapper.find('[data-testid="note-card-edit"]').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[n]])
  })

  it('emits "delete" with the note when the delete button is clicked', async () => {
    const n = note()
    const wrapper = mount(NoteCard, { props: { note: n } })

    await wrapper.find('[data-testid="note-card-delete"]').trigger('click')

    expect(wrapper.emitted('delete')).toEqual([[n]])
  })

  it('keeps the original date string when created_at is invalid', () => {
    const wrapper = mount(NoteCard, { props: { note: note({ created_at: 'not-a-date' }) } })

    expect(wrapper.find('time').text()).toBe('not-a-date')
  })

  it('exposes the note id on the article element for e2e selection', () => {
    const wrapper = mount(NoteCard, { props: { note: note({ id: 42 }) } })

    expect(wrapper.find('article').attributes('data-note-id')).toBe('42')
  })
})
