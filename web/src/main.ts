import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Aura from '@primeuix/themes/aura'

import 'primeicons/primeicons.css'
import './style.css'

import App from './App.vue'
import { i18n } from '@/i18n'

// Mirror the active locale onto <html lang>. The api client reads this
// to set Accept-Language without having to import the i18n instance
// (avoids circular dependencies and keeps tests easy).
document.documentElement.lang = i18n.global.locale.value

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: 'system'
    }
  }
})
app.use(ToastService)
app.use(ConfirmationService)

app.mount('#app')
