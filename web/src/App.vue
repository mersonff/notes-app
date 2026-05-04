<script setup lang="ts">
import Toast from 'primevue/toast'
import { useI18n } from 'vue-i18n'
import NotesView from '@/views/NotesView.vue'

const { t } = useI18n()
</script>

<template>
  <main class="notes-layout">
    <header>
      <h1>{{ t('app.title') }}</h1>
      <p>{{ t('app.subtitle') }}</p>
    </header>

    <NotesView />

    <Toast position="top-right" />
  </main>
</template>
