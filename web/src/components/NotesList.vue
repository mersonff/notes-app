<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Card from 'primevue/card'
import DataTable, { type DataTablePageEvent } from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import { useNotesStore } from '@/stores/notes'

const { t, d } = useI18n()
const store = useNotesStore()

onMounted(() => {
  if (store.notes.length === 0 && !store.loading) {
    store.fetchPage(1)
  }
})

const totalRecords = computed(() => store.pagination?.count ?? 0)
const rows = computed(() => store.pagination?.limit ?? 20)
// PrimeVue DataTable uses 0-indexed `first` (offset); our API is 1-indexed pages.
const first = computed(() => ((store.pagination?.page ?? 1) - 1) * rows.value)

function onPage(event: DataTablePageEvent) {
  store.fetchPage(event.page + 1, event.rows)
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return d(parsed, 'short')
}
</script>

<template>
  <Card>
    <template #title>{{ t('list.heading') }}</template>
    <template #content>
      <Message
        v-if="store.loadError"
        severity="error"
        :closable="false"
        data-testid="notes-load-error"
      >
        {{ t('list.loadError') }}
      </Message>

      <DataTable
        :value="store.notes"
        :loading="store.loading"
        :lazy="true"
        :paginator="true"
        :rows="rows"
        :total-records="totalRecords"
        :first="first"
        :rows-per-page-options="[5, 10, 20, 50]"
        striped-rows
        data-key="id"
        data-testid="notes-table"
        @page="onPage"
      >
        <template #empty>
          <p data-testid="notes-empty">{{ t('list.empty') }}</p>
        </template>

        <Column :header="t('note.title')" field="title">
          <template #body="{ data }">
            <strong>{{ data.title }}</strong>
          </template>
        </Column>

        <Column :header="t('note.content')" field="content">
          <template #body="{ data }">
            <span class="content-cell">{{ data.content ?? '—' }}</span>
          </template>
        </Column>

        <Column :header="t('note.createdAt')" field="created_at">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
          </template>
        </Column>
      </DataTable>
    </template>
  </Card>
</template>

<style scoped>
.content-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--p-text-muted-color, #666);
}
</style>
