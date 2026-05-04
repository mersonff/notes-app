<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Paginator, { type PageState } from 'primevue/paginator'
import NoteCard from './NoteCard.vue'
import { useDeleteNoteMutation } from '@/composables/useNotesMutations'
import type { Note, PaginationMeta } from '@/types/note'

const props = defineProps<{
  notes: readonly Note[]
  pagination: PaginationMeta | null
  loading: boolean
  loadError: string | null
  /** When non-empty, the empty state switches from "no notes ever" to "no results". */
  searchQuery?: string
}>()

const emit = defineEmits<{
  create: []
  edit: [note: Note]
  page: [{ page: number; rows: number }]
  clearSearch: []
}>()

const { t } = useI18n()
const confirm = useConfirm()
const toast = useToast()

const deleteMutation = useDeleteNoteMutation()

const totalRecords = computed(() => props.pagination?.count ?? 0)
const rows = computed(() => props.pagination?.limit ?? 20)
const first = computed(() => ((props.pagination?.page ?? 1) - 1) * rows.value)
const showPaginator = computed(() => totalRecords.value > rows.value)
const showSkeletons = computed(() => props.loading && props.notes.length === 0)
const isEmpty = computed(() => !props.loading && !props.loadError && props.notes.length === 0)
const hasActiveSearch = computed(() => (props.searchQuery ?? '').trim().length > 0)
const showNoResults = computed(() => isEmpty.value && hasActiveSearch.value)
const showEmpty = computed(() => isEmpty.value && !hasActiveSearch.value)

function onPage(event: PageState) {
  emit('page', { page: event.page + 1, rows: event.rows })
}

function confirmDelete(note: Note) {
  confirm.require({
    header: t('confirm.delete.header'),
    message: t('confirm.delete.message', { title: note.title?.trim() || t('note.untitled') }),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('actions.delete'),
    rejectLabel: t('actions.cancel'),
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', variant: 'text' },
    accept: async () => {
      try {
        await deleteMutation.mutateAsync(note.id)
        toast.add({
          severity: 'success',
          summary: t('toast.deletedTitle'),
          detail: t('toast.deletedDetail'),
          life: 3000
        })
      } catch (err) {
        toast.add({
          severity: 'error',
          summary: t('toast.errorTitle'),
          detail: err instanceof Error && err.message ? err.message : t('toast.deleteErrorDetail'),
          life: 4000
        })
      }
    }
  })
}
</script>

<template>
  <section class="notes-grid-wrapper">
    <Message v-if="loadError" severity="error" :closable="false" data-testid="notes-load-error">
      {{ t('list.loadError') }}
    </Message>

    <!-- Loading: 6 skeleton cards in the same grid -->
    <div v-if="showSkeletons" class="notes-grid" data-testid="notes-loading">
      <div v-for="n in 6" :key="n" class="note-skeleton">
        <Skeleton width="60%" height="1.2rem" />
        <Skeleton width="100%" height="0.8rem" />
        <Skeleton width="100%" height="0.8rem" />
        <Skeleton width="80%" height="0.8rem" />
        <Skeleton width="40%" height="0.7rem" class="note-skeleton__footer" />
      </div>
    </div>

    <!-- No-results state (search returned nothing) -->
    <div v-else-if="showNoResults" class="notes-empty" data-testid="notes-no-results">
      <i class="pi pi-search notes-empty__icon" aria-hidden="true" />
      <h2 class="notes-empty__title">
        {{ t('list.noResults.title', { query: searchQuery }) }}
      </h2>
      <p class="notes-empty__subtitle">{{ t('list.noResults.subtitle') }}</p>
      <Button
        :label="t('actions.clearSearch')"
        icon="pi pi-times"
        severity="secondary"
        variant="text"
        data-testid="notes-clear-search"
        @click="emit('clearSearch')"
      />
    </div>

    <!-- Empty-list state (no notes ever) -->
    <div v-else-if="showEmpty" class="notes-empty" data-testid="notes-empty">
      <i class="pi pi-inbox notes-empty__icon" aria-hidden="true" />
      <h2 class="notes-empty__title">{{ t('list.empty.title') }}</h2>
      <p class="notes-empty__subtitle">{{ t('list.empty.subtitle') }}</p>
      <Button
        :label="t('list.empty.cta')"
        icon="pi pi-plus"
        data-testid="notes-empty-cta"
        @click="emit('create')"
      />
    </div>

    <!--
      Cards grid: TransitionGroup gives us FLIP-style animation —
      cards fade+rise into the grid, fade+shrink out, and survivors
      slide to their new positions when others leave (e.g. after a
      delete or a search filter narrows the result set).
    -->
    <TransitionGroup v-else name="card" tag="div" class="notes-grid" data-testid="notes-grid">
      <NoteCard
        v-for="note in notes"
        :key="note.id"
        :note="note"
        @edit="emit('edit', note)"
        @delete="confirmDelete"
      />
    </TransitionGroup>

    <Paginator
      v-if="showPaginator"
      :rows="rows"
      :total-records="totalRecords"
      :first="first"
      :rows-per-page-options="[10, 20, 50, 100]"
      template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink RowsPerPageDropdown"
      :current-page-report-template="`{currentPage} / {totalPages}`"
      data-testid="notes-paginator"
      @page="onPage"
    />
  </section>
</template>

<style scoped>
.notes-grid-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

/*
 * TransitionGroup classes (name="card").
 *   - card-enter-active / card-leave-active: the timing curve.
 *   - card-enter-from / card-leave-to: the start / end visual states.
 *   - card-move: applied to surviving siblings during a layout reflow.
 *   - card-leave-active position:absolute removes the leaving element
 *     from the grid layout so the others can animate to their new
 *     spots (the FLIP technique).
 */
.card-enter-active,
.card-leave-active,
.card-move {
  transition:
    opacity 220ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.card-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}

.card-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

.card-leave-active {
  position: absolute;
  /* Constrain the absolutely-positioned leaving card to the grid track
   * width so it doesn't snap to its parent's full width during fade-out. */
  width: calc((100% - 32px) / 3);
  max-width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .card-enter-active,
  .card-leave-active,
  .card-move {
    transition: none;
  }
  .card-enter-from,
  .card-leave-to {
    opacity: 1;
    transform: none;
  }
}

.note-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--p-content-border-color, rgba(0, 0, 0, 0.06));
  border-radius: 10px;
  background: var(--p-content-background, #fff);
  min-height: 160px;
}

.note-skeleton__footer {
  margin-top: auto;
}

.notes-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
  text-align: center;
  /* Use tokens that flip with the theme. --p-content-background follows
   * the active surface (white in light mode, dark in dark mode). The
   * dashed border + transparent overlay give the "empty container" feel
   * without locking us to a single brightness. */
  border: 2px dashed var(--p-content-border-color, currentColor);
  border-radius: 12px;
  background: color-mix(in srgb, var(--p-content-background, transparent) 60%, transparent);
}

.notes-empty__icon {
  font-size: 3rem;
  color: var(--p-text-muted-color, #999);
}

.notes-empty__title {
  margin: 8px 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-text-color, #111);
}

.notes-empty__subtitle {
  margin: 0 0 8px;
  color: var(--p-text-muted-color, #666);
}
</style>
