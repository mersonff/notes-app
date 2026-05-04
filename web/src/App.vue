<script setup lang="ts">
import Toast from 'primevue/toast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <main class="notes-layout">
    <header>
      <h1>{{ t('app.title') }}</h1>
      <p>{{ t('app.subtitle') }}</p>
    </header>

    <!--
      Notes UI lands in the next iteration; for now this scaffold proves
      the app boots with PrimeVue, Pinia and vue-i18n wired together.
    -->

    <Toast position="top-right" />
  </main>
</template>
