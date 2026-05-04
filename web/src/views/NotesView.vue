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
    <!--
      No section heading here — the page-level <h1> in App.vue already
      identifies the screen. This bar is purely a toolbar (count + the
      primary action).
    -->
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

    <NotesGrid @create="openCreate" @edit="openEdit" />

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
