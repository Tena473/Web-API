
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import VueApexCharts from "vue3-apexcharts";
import axios from 'axios'

import App from './App.vue'
import router from './router'
import './style.css'


// Production serves Vue and the API from the same origin. During local
// development, Vite proxies /api to the Express server.
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''
axios.defaults.withCredentials = true


const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueApexCharts);

app.mount('#app')
