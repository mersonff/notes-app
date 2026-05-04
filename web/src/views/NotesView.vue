<script setup lang="ts">
import NoteForm from '@/components/NoteForm.vue'
import NotesList from '@/components/NotesList.vue'
</script>

<template>
  <div class="notes-view">
    <NoteForm />
    <NotesList />
  </div>
</template>

<style scoped>
.notes-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
