<script setup lang="ts">
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useI18n } from 'vue-i18n'
import NotesView from '@/views/NotesView.vue'

const { t } = useI18n()
</script>

<template>
  <main class="notes-layout">
    <header class="app-header">
      <h1>{{ t('app.title') }}</h1>
      <p>{{ t('app.subtitle') }}</p>
    </header>

    <NotesView />

    <Toast position="top-right" />
    <ConfirmDialog />
  </main>
</template>

<style scoped>
.app-header {
  margin-bottom: 8px;
}

.app-header h1 {
  margin: 0 0 4px;
  font-size: 1.6rem;
  font-weight: 700;
}

.app-header p {
  margin: 0;
  color: var(--p-text-muted-color, #888);
  font-size: 0.95rem;
}
</style>
