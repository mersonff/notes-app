<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useNotesStore } from '@/stores/notes'
import { NOTE_LIMITS } from '@/types/note'

const { t } = useI18n()
const toast = useToast()
const store = useNotesStore()

const title = ref('')
const content = ref('')
const submitted = ref(false)

const titleMessages = computed<string[]>(() => {
  const msgs: string[] = []
  if (submitted.value && !title.value.trim()) {
    msgs.push(t('form.validation.titleRequired'))
  }
  if (title.value.length > NOTE_LIMITS.TITLE_MAX) {
    msgs.push(t('form.validation.titleTooLong', { max: NOTE_LIMITS.TITLE_MAX }))
  }
  store.validationErrors.title?.forEach((m) => msgs.push(m))
  return msgs
})

const contentMessages = computed<string[]>(() => {
  const msgs: string[] = []
  if (content.value.length > NOTE_LIMITS.CONTENT_MAX) {
    msgs.push(t('form.validation.contentTooLong', { max: NOTE_LIMITS.CONTENT_MAX }))
  }
  store.validationErrors.content?.forEach((m) => msgs.push(m))
  return msgs
})

const isClientValid = computed(
  () =>
    title.value.trim().length > 0 &&
    title.value.length <= NOTE_LIMITS.TITLE_MAX &&
    content.value.length <= NOTE_LIMITS.CONTENT_MAX
)

function reset() {
  title.value = ''
  content.value = ''
  submitted.value = false
  store.clearValidationErrors()
}

async function submit() {
  submitted.value = true
  if (!isClientValid.value) return

  const created = await store.create({
    title: title.value,
    content: content.value.length > 0 ? content.value : null
  })

  if (created) {
    toast.add({
      severity: 'success',
      summary: t('toast.createdTitle'),
      detail: t('toast.createdDetail'),
      life: 3000
    })
    reset()
    return
  }

  if (Object.keys(store.validationErrors).length > 0) {
    toast.add({
      severity: 'error',
      summary: t('toast.errorTitle'),
      detail: t('toast.validationErrorDetail'),
      life: 4000
    })
  } else {
    toast.add({
      severity: 'error',
      summary: t('toast.errorTitle'),
      detail: store.submitError ?? t('toast.networkErrorDetail'),
      life: 4000
    })
  }
}
</script>

<template>
  <Card>
    <template #title>{{ t('form.newNote') }}</template>
    <template #content>
      <form class="note-form" @submit.prevent="submit">
        <div class="field">
          <label for="note-title">{{ t('note.title') }}</label>
          <InputText
            id="note-title"
            v-model="title"
            :placeholder="t('note.placeholders.title')"
            :maxlength="NOTE_LIMITS.TITLE_MAX"
            :invalid="titleMessages.length > 0"
            data-testid="note-title"
            autocomplete="off"
          />
          <Message
            v-for="(msg, i) in titleMessages"
            :key="`title-${i}`"
            severity="error"
            size="small"
            variant="simple"
            data-testid="note-title-error"
          >
            {{ msg }}
          </Message>
        </div>

        <div class="field">
          <label for="note-content">{{ t('note.content') }}</label>
          <Textarea
            id="note-content"
            v-model="content"
            :placeholder="t('note.placeholders.content')"
            :maxlength="NOTE_LIMITS.CONTENT_MAX"
            :invalid="contentMessages.length > 0"
            rows="3"
            data-testid="note-content"
            auto-resize
          />
          <Message
            v-for="(msg, i) in contentMessages"
            :key="`content-${i}`"
            severity="error"
            size="small"
            variant="simple"
            data-testid="note-content-error"
          >
            {{ msg }}
          </Message>
        </div>

        <div class="actions">
          <Button
            type="submit"
            :label="store.submitting ? t('actions.saving') : t('actions.save')"
            :loading="store.submitting"
            data-testid="note-save"
          />
        </div>
      </form>
    </template>
  </Card>
</template>

<style scoped>
.note-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-weight: 500;
}

.actions {
  display: flex;
  justify-content: flex-end;
}
</style>
