import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Aura from '@primeuix/themes/aura'

import 'primeicons/primeicons.css'
import './style.css'

import App from './App.vue'
import { i18n } from '@/i18n'

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

app.mount('#app')
