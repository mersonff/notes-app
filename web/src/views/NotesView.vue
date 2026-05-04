<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import NotesGrid from '@/components/NotesGrid.vue'
import NoteFormDialog from '@/components/NoteFormDialog.vue'
import { useNotesQuery } from '@/composables/useNotesQuery'
import type { Note } from '@/types/note'

const { t } = useI18n()

// UI state owned by the view (would map cleanly to URL query params if
// we ever introduced a router): current page, page size, search.
const page = ref(1)
const limit = ref(20)
const dialogVisible = ref(false)
const editingNote = ref<Note | null>(null)

// Two refs for search:
//   - searchInput  → bound to the v-model so typing feels instant
//   - searchActive → what useNotesQuery actually keys/queries on
// watchDebounced copies input → active after 300ms of silence so we
// don't fire a request per keystroke.
const searchInput = ref('')
const searchActive = ref('')

watchDebounced(
  searchInput,
  (next) => {
    searchActive.value = next
  },
  { debounce: 300 }
)

// Reset to page 1 whenever the active search term changes — page N may
// not exist for the new (smaller) result set.
watch(searchActive, () => {
  page.value = 1
})

const { state, asyncStatus } = useNotesQuery({ page, limit, search: searchActive })

const notes = computed(() => state.value.data?.data ?? [])
const pagination = computed(() => state.value.data?.pagination ?? null)
const loading = computed(() => asyncStatus.value === 'loading')
const loadError = computed(() =>
  state.value.status === 'error' ? state.value.error.message : null
)

const totalCount = computed(() => pagination.value?.count ?? 0)
const hasActiveSearch = computed(() => searchActive.value.trim().length > 0)
const showCount = computed(() => totalCount.value > 0)

// Two phases of "search in progress" worth feedback for:
//   - debouncing: user typed but the watch hasn't fired yet
//   - fetching:   query dispatched, awaiting the API
// We don't show the spinner for unrelated fetches (initial page load,
// pagination) — only for explicit user search activity.
const isSearching = computed(() => {
  const debouncing = searchInput.value.length > 0 && searchInput.value !== searchActive.value
  const fetchingSearch = loading.value && hasActiveSearch.value
  return debouncing || fetchingSearch
})

// Different copy when there's a search filter active (e.g. "3 resultados
// para 'reunião'" vs "3 anotações").
const countLabel = computed(() => {
  if (!showCount.value) return ''
  return hasActiveSearch.value
    ? t('list.totalCountFiltered', totalCount.value, { named: { query: searchActive.value } })
    : t('list.totalCount', totalCount.value)
})

function openCreate() {
  editingNote.value = null
  dialogVisible.value = true
}

function openEdit(note: Note) {
  editingNote.value = note
  dialogVisible.value = true
}

function onPageChange(event: { page: number; rows: number }) {
  page.value = event.page
  limit.value = event.rows
}

function clearSearch() {
  searchInput.value = ''
  searchActive.value = ''
}
</script>

<template>
  <div class="notes-view">
    <div class="notes-view__toolbar">
      <IconField class="notes-view__search">
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="searchInput"
          :placeholder="t('note.placeholders.search')"
          aria-label="Buscar"
          data-testid="notes-search"
        />
        <!--
          Right-side trailing icon: spinner while a search is in flight,
          clickable X otherwise. Both use <InputIcon> so PrimeVue's
          IconField positions them consistently (no custom absolute
          positioning needed; that's what made the previous spinner look
          off-axis).
        -->
        <InputIcon
          v-if="isSearching"
          class="pi pi-spin pi-spinner notes-view__search-trailing"
          aria-hidden="true"
          data-testid="notes-search-spinner"
        />
        <InputIcon
          v-else-if="searchInput.length > 0"
          class="pi pi-times notes-view__search-trailing notes-view__search-trailing--clickable"
          role="button"
          tabindex="0"
          :aria-label="t('actions.clearSearch')"
          data-testid="notes-search-clear"
          @click="clearSearch"
          @keydown.enter.prevent="clearSearch"
          @keydown.space.prevent="clearSearch"
        />
      </IconField>

      <span v-if="showCount" class="notes-view__count" data-testid="notes-count">
        {{ countLabel }}
      </span>

      <Button
        :label="t('actions.newNote')"
        icon="pi pi-plus"
        data-testid="open-new-note"
        @click="openCreate"
      />
    </div>

    <NotesGrid
      :notes="notes"
      :pagination="pagination"
      :loading="loading"
      :load-error="loadError"
      :search-query="searchActive"
      @create="openCreate"
      @edit="openEdit"
      @page="onPageChange"
      @clear-search="clearSearch"
    />

    <NoteFormDialog v-model:visible="dialogVisible" :note="editingNote" />
  </div>
</template>

<style scoped>
.notes-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.notes-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.notes-view__search {
  flex: 1 1 240px;
  min-width: 200px;
  position: relative;
}

.notes-view__search :deep(.p-inputtext) {
  width: 100%;
  /* Reserve space on the right for the trailing icon (PrimeVue places it
   * 0.75rem from the edge by default). Without this padding long values
   * scroll under the spinner/X. */
  padding-right: 2.25rem;
}

/* Move PrimeVue's left-positioned InputIcon to the right when our class
 * is applied (IconField defaults all InputIcons to left). */
.notes-view__search :deep(.notes-view__search-trailing) {
  left: auto;
  right: 0.75rem;
}

.notes-view__search :deep(.notes-view__search-trailing--clickable) {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px;
  transition:
    color 120ms ease,
    background-color 120ms ease;
}

.notes-view__search :deep(.notes-view__search-trailing--clickable:hover),
.notes-view__search :deep(.notes-view__search-trailing--clickable:focus-visible) {
  color: var(--p-text-color);
  background: var(--p-surface-200, rgba(0, 0, 0, 0.06));
  outline: none;
}

.notes-view__count {
  font-size: 0.9rem;
  color: var(--p-text-muted-color, #888);
}
</style>
