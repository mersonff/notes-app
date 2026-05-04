<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import type { Note } from '@/types/note'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  edit: [note: Note]
  delete: [note: Note]
}>()

const { t, d } = useI18n()

const formattedDate = computed(() => {
  const parsed = new Date(props.note.created_at)
  if (Number.isNaN(parsed.getTime())) return props.note.created_at
  return d(parsed, 'short')
})

const displayTitle = computed(() => props.note.title?.trim() || t('note.untitled'))
const hasContent = computed(() => Boolean(props.note.content && props.note.content.trim()))
</script>

<template>
  <article class="note-card" :data-note-id="note.id" data-testid="note-card">
    <div class="note-card__body">
      <h3 class="note-card__title" data-testid="note-card-title">{{ displayTitle }}</h3>
      <p v-if="hasContent" class="note-card__content" data-testid="note-card-content">
        {{ note.content }}
      </p>
      <p v-else class="note-card__content note-card__content--empty">{{ t('note.noContent') }}</p>
    </div>

    <footer class="note-card__footer">
      <time class="note-card__date" :datetime="note.created_at">
        {{ formattedDate }}
      </time>
      <div class="note-card__actions">
        <Button
          severity="secondary"
          variant="text"
          rounded
          icon="pi pi-pencil"
          :aria-label="t('actions.edit')"
          :title="t('actions.edit')"
          data-testid="note-card-edit"
          @click="emit('edit', note)"
        />
        <Button
          severity="danger"
          variant="text"
          rounded
          icon="pi pi-trash"
          :aria-label="t('actions.delete')"
          :title="t('actions.delete')"
          data-testid="note-card-delete"
          @click="emit('delete', note)"
        />
      </div>
    </footer>
  </article>
</template>

<style scoped>
.note-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--p-content-background, #fff);
  border: 1px solid var(--p-content-border-color, rgba(0, 0, 0, 0.08));
  border-radius: 10px;
  transition:
    box-shadow 150ms ease,
    transform 150ms ease,
    border-color 150ms ease;
  min-height: 160px;
}

.note-card:hover,
.note-card:focus-within {
  border-color: var(--p-primary-color, #6366f1);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.06),
    0 1px 3px rgba(0, 0, 0, 0.04);
}

.note-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.note-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--p-text-color, #111);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-card__content {
  margin: 0;
  font-size: 0.9rem;
  color: var(--p-text-muted-color, #666);
  white-space: pre-wrap;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-card__content--empty {
  font-style: italic;
  opacity: 0.7;
}

.note-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed var(--p-content-border-color, rgba(0, 0, 0, 0.06));
}

.note-card__date {
  font-size: 0.78rem;
  color: var(--p-text-muted-color, #888);
}

.note-card__actions {
  display: flex;
  gap: 4px;
  opacity: 0.55;
  transition: opacity 150ms ease;
}

.note-card:hover .note-card__actions,
.note-card:focus-within .note-card__actions {
  opacity: 1;
}

/* Touch devices: don't rely on hover */
@media (hover: none) {
  .note-card__actions {
    opacity: 1;
  }
}
</style>
