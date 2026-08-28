<script setup>
import { computed, onMounted, ref } from 'vue'
import axios from 'axios'
import AdminLayout from '@/layouts/AdminLayout.vue'

const calendarTimeZone = 'Asia/Vientiane'

const today = new Date()
const currentMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const events = ref([])
const calendarName = ref('Google Calendar')
const loading = ref(false)
const errorMessage = ref('')

const monthTitle = computed(() =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth.value)
)

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const calendarDays = computed(() => {
  const firstDay = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const daysFromMonday = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - daysFromMonday)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
})

const eventsByDate = computed(() => {
  const groupedEvents = {}

  events.value.forEach(event => {
    const key = event.start?.date || dateKey(event.start?.dateTime)
    if (!key) return

    if (!groupedEvents[key]) groupedEvents[key] = []
    groupedEvents[key].push(event)
  })

  return groupedEvents
})

function dateKey(date) {
  if (!date) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: calendarTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(date))

  const value = (type) => parts.find(part => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function eventsForDay(date) {
  return eventsByDate.value[localDateKey(date)] || []
}

function isCurrentMonth(date) {
  return date.getMonth() === currentMonth.value.getMonth()
}

function isToday(date) {
  return localDateKey(date) === localDateKey(today)
}

function eventTime(event) {
  if (event.start?.date) return 'All day'

  return new Intl.DateTimeFormat('en-US', {
    timeZone: calendarTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(event.start?.dateTime))
}

function eventClasses(event) {
  if (event.type === 'laos-holiday') {
    return 'bg-error/15 text-error hover:bg-error/25'
  }
  if (event.type === 'us-holiday') {
    return 'bg-info/15 text-info hover:bg-info/25'
  }
  return 'bg-primary/15 text-primary hover:bg-primary/25'
}

function gridRange() {
  const firstDay = calendarDays.value[0]
  const lastDay = calendarDays.value[calendarDays.value.length - 1]
  const endExclusive = new Date(lastDay)
  endExclusive.setDate(lastDay.getDate() + 1)

  return {
    timeMin: firstDay.toISOString(),
    timeMax: endExclusive.toISOString()
  }
}

async function loadEvents() {
  errorMessage.value = ''
  loading.value = true
  try {
    const { timeMin, timeMax } = gridRange()
    const response = await axios.get('/api/calendar/events', { params: { timeMin, timeMax } })
    calendarName.value = response.data.calendarName || 'Google Calendar'
    events.value = Array.isArray(response.data.events) ? response.data.events : []
    if (response.data.failedCalendars?.length) errorMessage.value = `Unable to load: ${response.data.failedCalendars.join(', ')}.`
  } catch (error) {
    events.value = []
    errorMessage.value = error.response?.data?.error || 'Unable to load calendar events.'
  } finally {
    loading.value = false
  }
}

function changeMonth(offset) {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + offset,
    1
  )
  loadEvents()
}

function goToToday() {
  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  loadEvents()
}

onMounted(loadEvents)
</script>

<template>
  <AdminLayout>
    <main class="mx-auto my-6 max-w-screen-2xl px-4">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold sm:text-3xl">Calendar</h1>
          <p class="mt-1 text-base-content/60">{{ calendarName }}</p>
        </div>
        <button class="btn btn-outline" :disabled="loading" @click="loadEvents">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          Refresh
        </button>
      </div>

      <div class="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <span class="font-semibold">Events:</span>
        <span class="flex items-center gap-2"><i class="h-3 w-3 rounded bg-primary"></i> My calendar</span>
        <span class="flex items-center gap-2"><i class="h-3 w-3 rounded bg-error"></i> Lao holidays</span>
        <span class="flex items-center gap-2"><i class="h-3 w-3 rounded bg-info"></i> US holidays</span>
      </div>

      <div v-if="errorMessage" class="alert alert-warning mb-6">
        <span>{{ errorMessage }}</span>
      </div>

      <section class="overflow-x-auto">
        <div class="min-w-[700px] overflow-hidden rounded-xl bg-base-100 shadow-xl">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 p-4">
          <div class="join">
            <button class="btn join-item btn-sm" aria-label="Previous month" @click="changeMonth(-1)">‹</button>
            <button class="btn join-item btn-sm" @click="goToToday">Today</button>
            <button class="btn join-item btn-sm" aria-label="Next month" @click="changeMonth(1)">›</button>
          </div>
          <h2 class="text-xl font-semibold">{{ monthTitle }}</h2>
        </header>

        <div class="grid grid-cols-7 border-b border-base-300 bg-base-200 text-center text-xs font-semibold uppercase">
          <div v-for="weekday in weekdayLabels" :key="weekday" class="p-3">{{ weekday }}</div>
        </div>

        <div class="grid grid-cols-7">
          <article v-for="date in calendarDays" :key="date.toISOString()"
            class="min-h-28 border-b border-r border-base-300 p-2"
            :class="{ 'bg-base-200/40 text-base-content/40': !isCurrentMonth(date) }">
            <div class="mb-1 flex justify-end">
              <span class="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                :class="isToday(date) ? 'bg-primary font-bold text-primary-content' : ''">
                {{ date.getDate() }}
              </span>
            </div>

            <div class="space-y-1">
              <div v-for="event in eventsForDay(date)" :key="event.id" class="block truncate rounded px-1.5 py-1 text-xs"
                :class="eventClasses(event)" :title="`${event.source}: ${event.summary || 'Untitled event'}`">
                <span class="font-semibold">{{ eventTime(event) }}</span>
                {{ event.summary || 'Untitled event' }}
              </div>
            </div>
          </article>
        </div>
        </div>
      </section>
    </main>
  </AdminLayout>
</template>
