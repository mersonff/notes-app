<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { ApiError } from '@/api/notes'
import { useCreateNoteMutation, useUpdateNoteMutation } from '@/composables/useNotesMutations'
import { NOTE_LIMITS, type Note } from '@/types/note'

const props = defineProps<{
  visible: boolean
  /** When provided, the dialog is in edit mode and pre-fills with the note. */
  note: Note | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: [note: Note]
}>()

const { t } = useI18n()
const toast = useToast()

const createMutation = useCreateNoteMutation()
const updateMutation = useUpdateNoteMutation()

const title = ref('')
const content = ref('')
const submitted = ref(false)

const isEditing = computed(() => props.note !== null)
const dialogHeader = computed(() => (isEditing.value ? t('form.editNote') : t('form.newNote')))
const submitting = computed(() => createMutation.isLoading.value || updateMutation.isLoading.value)

// Pull per-field validation errors from whichever mutation is active.
// ApiError carries `validationErrors: Record<string, string[]>` on 422.
const validationErrors = computed<Record<string, string[]>>(() => {
  const err = isEditing.value ? updateMutation.error.value : createMutation.error.value
  return err instanceof ApiError && err.validationErrors ? err.validationErrors : {}
})

const titleMessages = computed<string[]>(() => {
  const msgs: string[] = []
  if (submitted.value && !title.value.trim()) {
    msgs.push(t('form.validation.titleRequired'))
  }
  if (title.value.length > NOTE_LIMITS.TITLE_MAX) {
    msgs.push(t('form.validation.titleTooLong', { max: NOTE_LIMITS.TITLE_MAX }))
  }
  validationErrors.value.title?.forEach((m) => msgs.push(m))
  return msgs
})

const contentMessages = computed<string[]>(() => {
  const msgs: string[] = []
  if (content.value.length > NOTE_LIMITS.CONTENT_MAX) {
    msgs.push(t('form.validation.contentTooLong', { max: NOTE_LIMITS.CONTENT_MAX }))
  }
  validationErrors.value.content?.forEach((m) => msgs.push(m))
  return msgs
})

const isClientValid = computed(
  () =>
    title.value.trim().length > 0 &&
    title.value.length <= NOTE_LIMITS.TITLE_MAX &&
    content.value.length <= NOTE_LIMITS.CONTENT_MAX
)

// When the dialog opens (or the editing target changes), seed the inputs from
// props.note. Reset stale errors from the previous mutation attempt so they
// don't surface against a fresh form.
watch(
  () => [props.visible, props.note?.id] as const,
  ([visible]) => {
    if (visible) {
      title.value = props.note?.title ?? ''
      content.value = props.note?.content ?? ''
      submitted.value = false
      createMutation.reset()
      updateMutation.reset()
    }
  },
  { immediate: true }
)

function close() {
  emit('update:visible', false)
}

async function submit() {
  submitted.value = true
  if (!isClientValid.value) return

  const payload = {
    title: title.value,
    content: content.value.length > 0 ? content.value : null
  }

  try {
    const result = isEditing.value
      ? await updateMutation.mutateAsync({ id: props.note!.id, input: payload })
      : await createMutation.mutateAsync(payload)

    toast.add({
      severity: 'success',
      summary: t(isEditing.value ? 'toast.updatedTitle' : 'toast.createdTitle'),
      detail: t(isEditing.value ? 'toast.updatedDetail' : 'toast.createdDetail'),
      life: 3000
    })
    emit('saved', result)
    close()
  } catch (err) {
    if (err instanceof ApiError && err.validationErrors) {
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
        detail: err instanceof Error && err.message ? err.message : t('toast.networkErrorDetail'),
        life: 4000
      })
    }
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="dialogHeader"
    modal
    :closable="!submitting"
    :close-on-escape="!submitting"
    :dismissable-mask="!submitting"
    :style="{ width: '32rem', maxWidth: '95vw' }"
    data-testid="note-form-dialog"
    @update:visible="close"
  >
    <form class="note-form" @submit.prevent="submit">
      <div class="field">
        <label for="note-title">{{ t('note.title') }}</label>
        <InputText
          id="note-title"
          v-model="title"
          :placeholder="t('note.placeholders.title')"
          :maxlength="NOTE_LIMITS.TITLE_MAX"
          :invalid="titleMessages.length > 0"
          autocomplete="off"
          autofocus
          data-testid="note-title"
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
          rows="5"
          auto-resize
          data-testid="note-content"
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
    </form>

    <template #footer>
      <Button
        :label="t('actions.cancel')"
        severity="secondary"
        variant="text"
        :disabled="submitting"
        data-testid="note-cancel"
        @click="close"
      />
      <Button
        type="submit"
        :label="submitting ? t('actions.saving') : t('actions.save')"
        :loading="submitting"
        icon="pi pi-check"
        data-testid="note-save"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.note-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-weight: 500;
  font-size: 0.95rem;
}

.field :deep(.p-inputtext),
.field :deep(.p-textarea) {
  width: 100%;
}
</style>
