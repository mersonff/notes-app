<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import NotesGrid from '@/components/NotesGrid.vue'
import NoteFormDialog from '@/components/NoteFormDialog.vue'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types/note'

const { t } = useI18n()
const store = useNotesStore()

const dialogVisible = ref(false)
const editingNote = ref<Note | null>(null)

const totalCount = computed(() => store.pagination?.count ?? 0)
const showCount = computed(() => totalCount.value > 0)

function openCreate() {
  editingNote.value = null
  dialogVisible.value = true
}

function openEdit(note: Note) {
  editingNote.value = note
  dialogVisible.value = true
}
</script>

<template>
  <div class="notes-view">
    <header class="notes-view__header">
      <div class="notes-view__heading">
        <h2>{{ t('list.heading') }}</h2>
        <span v-if="showCount" class="notes-view__count" data-testid="notes-count">
          {{ t('list.totalCount', totalCount) }}
        </span>
      </div>
      <Button
        :label="t('actions.newNote')"
        icon="pi pi-plus"
        data-testid="open-new-note"
        @click="openCreate"
      />
    </header>

    <NotesGrid @create="openCreate" @edit="openEdit" />

    <NoteFormDialog v-model:visible="dialogVisible" :note="editingNote" />
  </div>
</template>

<style scoped>
.notes-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.notes-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.notes-view__heading {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.notes-view__heading h2 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
}

.notes-view__count {
  font-size: 0.85rem;
  color: var(--p-text-muted-color, #888);
}
</style>
