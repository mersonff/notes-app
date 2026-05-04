<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Paginator, { type PageState } from 'primevue/paginator'
import NoteCard from './NoteCard.vue'
import { useNotesStore } from '@/stores/notes'
import type { Note } from '@/types/note'

const emit = defineEmits<{
  create: []
  edit: [note: Note]
}>()

const { t } = useI18n()
const store = useNotesStore()
const confirm = useConfirm()
const toast = useToast()

onMounted(() => {
  if (store.notes.length === 0 && !store.loading) {
    store.fetchPage(1)
  }
})

const totalRecords = computed(() => store.pagination?.count ?? 0)
const rows = computed(() => store.pagination?.limit ?? 20)
const first = computed(() => ((store.pagination?.page ?? 1) - 1) * rows.value)
const showPaginator = computed(() => totalRecords.value > rows.value)
const showSkeletons = computed(() => store.loading && store.notes.length === 0)
const showEmpty = computed(() => !store.loading && !store.loadError && store.notes.length === 0)

function onPage(event: PageState) {
  store.fetchPage(event.page + 1, event.rows)
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
      const ok = await store.destroy(note.id)
      if (ok) {
        toast.add({
          severity: 'success',
          summary: t('toast.deletedTitle'),
          detail: t('toast.deletedDetail'),
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: t('toast.errorTitle'),
          detail: store.submitError ?? t('toast.deleteErrorDetail'),
          life: 4000
        })
      }
    }
  })
}
</script>

<template>
  <section class="notes-grid-wrapper">
    <Message
      v-if="store.loadError"
      severity="error"
      :closable="false"
      data-testid="notes-load-error"
    >
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

    <!-- Empty state -->
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

    <!-- Cards grid -->
    <div v-else class="notes-grid" data-testid="notes-grid">
      <NoteCard
        v-for="note in store.notes"
        :key="note.id"
        :note="note"
        @edit="emit('edit', note)"
        @delete="confirmDelete"
      />
    </div>

    <Paginator
      v-if="showPaginator"
      :rows="rows"
      :total-records="totalRecords"
      :first="first"
      :rows-per-page-options="[6, 12, 24, 48]"
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
  border: 2px dashed var(--p-content-border-color, rgba(0, 0, 0, 0.1));
  border-radius: 12px;
  background: var(--p-surface-50, rgba(0, 0, 0, 0.02));
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
