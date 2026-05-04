<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import NotesGrid from '@/components/NotesGrid.vue'
import NoteFormDialog from '@/components/NoteFormDialog.vue'
import { useNotesQuery } from '@/composables/useNotesQuery'
import type { Note } from '@/types/note'

const { t } = useI18n()

// UI state owned by the view (would map cleanly to URL query params if
// we ever introduced a router): current page, page size, edit target.
const page = ref(1)
const limit = ref(20)
const dialogVisible = ref(false)
const editingNote = ref<Note | null>(null)

const { state, asyncStatus } = useNotesQuery({ page, limit })

const notes = computed(() => state.value.data?.data ?? [])
const pagination = computed(() => state.value.data?.pagination ?? null)
const loading = computed(() => asyncStatus.value === 'loading')
const loadError = computed(() =>
  state.value.status === 'error' ? state.value.error.message : null
)

const totalCount = computed(() => pagination.value?.count ?? 0)
const showCount = computed(() => totalCount.value > 0)

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
</script>

<template>
  <div class="notes-view">
    <div class="notes-view__toolbar">
      <span v-if="showCount" class="notes-view__count" data-testid="notes-count">
        {{ t('list.totalCount', totalCount) }}
      </span>
      <span v-else aria-hidden="true" />
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
      @create="openCreate"
      @edit="openEdit"
      @page="onPageChange"
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
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.notes-view__count {
  font-size: 0.9rem;
  color: var(--p-text-muted-color, #888);
}
</style>
