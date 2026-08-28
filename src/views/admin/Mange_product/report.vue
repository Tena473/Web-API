<script setup>
import { RouterLink } from 'vue-router';
import { onMounted, ref, computed } from 'vue';
import axios from 'axios';

import AdminLayout from '@/layouts/AdminLayout.vue';
import Table from '@/components/Table.vue';
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue';
import { useEventStore } from '@/stores/event';
import { useAuthStore } from '@/stores/auth';

const orders = ref([])
const loading = ref(false)
const errorMessage = ref('')
const selectedOrder = ref(null)
const deletingOrderId = ref(null)
const eventStore = useEventStore()
const authStore = useAuthStore()
const canDeleteOrders = computed(() => authStore.isSuperAdmin)
const tableHeaders = computed(() => {
  const headers = ['Id', 'Order', 'Date', 'Time', 'Product', 'Category', 'Price', 'Quantity', 'Total']
  return canDeleteOrders.value ? [...headers, 'Actions'] : headers
})

const productSearch = ref('')
const startDate = ref('')
const endDate = ref('')

// order_date เก็บเป็น 'YYYY-MM-DD HH:mm:ss' — ตัดเอาเฉพาะส่วนวันไว้ใช้กรอง
const getDatePart = (orderDate) => String(orderDate || '').slice(0, 10)

const formatDate = (orderDate) => getDatePart(orderDate) || '-'

const formatTime = (orderDate) => String(orderDate || '').slice(11, 19) || '-'

const formatPrice = (price) => Number(price || 0).toLocaleString('en-US')

// แสดงทุกออเดอร์แยกรายการ ไม่รวมสินค้าเดียวกันเข้าด้วยกัน เรียงจากล่าสุดก่อน
const filteredOrders = computed(() =>
  orders.value
    .filter(order => {
      const matchSearch = (order.product_name || '').toLowerCase().includes(productSearch.value.toLowerCase())
      const date = getDatePart(order.order_date)
      const matchStart = !startDate.value || date >= startDate.value
      const matchEnd = !endDate.value || date <= endDate.value
      return matchSearch && matchStart && matchEnd
    })
    .sort((a, b) => String(b.order_date || '').localeCompare(String(a.order_date || '')))
)

const totalQuantity = computed(() =>
  filteredOrders.value.reduce((sum, order) => sum + Number(order.quantity || 0), 0)
)

const totalRevenue = computed(() =>
  filteredOrders.value.reduce((sum, order) => sum + Number(order.total || 0), 0)
)

const loadOrders = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await axios.get('/api/get/data_order')
    orders.value = Array.isArray(res.data) ? res.data : Object.values(res.data)
  } catch (err) {
    errorMessage.value = 'Failed to load order data'
  } finally {
    loading.value = false
  }
}

const clearFilter = () => {
  productSearch.value = ''
  startDate.value = ''
  endDate.value = ''
}

const openDeleteModal = (order) => {
  selectedOrder.value = order
}

const closeDeleteModal = () => {
  if (!deletingOrderId.value) selectedOrder.value = null
}

const deleteOrder = async () => {
  const orderId = selectedOrder.value?.order_id
  if (!orderId || deletingOrderId.value) return

  deletingOrderId.value = orderId
  try {
    await axios.delete(`/api/delete/data_order/${orderId}`)
    selectedOrder.value = null
    eventStore.popupMessage('success', `Order #${orderId} deleted successfully`)
    await loadOrders()
  } catch (err) {
    eventStore.popupMessage('error', `Unable to delete order #${orderId}`)
  } finally {
    deletingOrderId.value = null
  }
}

onMounted(async () => {
  await loadOrders()
})
</script>

<template>
  <AdminLayout>
    <div class="mx-auto max-w-screen-2xl px-4 py-6">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-2xl font-bold sm:text-3xl">Product sales report</div>
        <RouterLink :to="{ name: 'admin-product-list' }" class="btn btn-ghost w-full sm:w-auto">Back</RouterLink>
      </div>

      <!-- Filter -->
      <div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <label class="form-control w-full lg:w-auto">
          <div class="label"><span class="label-text">Product</span></div>
          <input class="input input-bordered w-full lg:w-[300px]" v-model="productSearch" placeholder="Find a Product"
            type="text" />
        </label>
        <label class="form-control w-full lg:w-auto">
          <div class="label"><span class="label-text">From</span></div>
          <input class="input input-bordered" v-model="startDate" type="date" />
        </label>
        <label class="form-control w-full lg:w-auto">
          <div class="label"><span class="label-text">To</span></div>
          <input class="input input-bordered" v-model="endDate" type="date" />
        </label>
        <button class="btn btn-ghost w-full sm:w-auto" @click="clearFilter()">Clear</button>
      </div>

      <!-- Summary -->
      <div class="stats stats-vertical w-full shadow mb-6 sm:stats-horizontal">
        <div class="stat">
          <div class="stat-title">Orders</div>
          <div class="stat-value text-primary">{{ filteredOrders.length }}</div>
          <div class="stat-desc">records</div>
        </div>
        <div class="stat">
          <div class="stat-title">Total quantity</div>
          <div class="stat-value">{{ formatPrice(totalQuantity) }}</div>
          <div class="stat-desc">units sold</div>
        </div>
        <div class="stat">
          <div class="stat-title">Total revenue</div>
          <div class="stat-value text-success">{{ formatPrice(totalRevenue) }}</div>
          <div class="stat-desc">ກີບ</div>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="errorMessage" class="alert alert-error">
        <span>{{ errorMessage }}</span>
      </div>

      <div v-else-if="filteredOrders.length === 0" class="text-center py-20 text-base-content/60">
        No sales data found
      </div>

      <div v-else class="overflow-x-auto">
        <Table :headers="tableHeaders">
          <tr v-for="(order, index) in filteredOrders" :key="order.order_id || index">
            <th>{{ index + 1 }}</th>
            <td>#{{ order.order_id }}</td>
            <td>{{ formatDate(order.order_date) }}</td>
            <td>{{ formatTime(order.order_date) }}</td>
            <th>{{ order.product_name }}</th>
            <td>{{ order.category }}</td>
            <td>{{ formatPrice(order.price) }}</td>
            <td>
              <span class="badge badge-primary badge-lg">{{ order.quantity }}</span>
            </td>
            <td class="font-bold text-success">{{ formatPrice(order.total) }}</td>
            <td v-if="canDeleteOrders">
              <button class="btn btn-error btn-sm" :disabled="Boolean(deletingOrderId)"
                @click="openDeleteModal(order)">
                Delete
              </button>
            </td>
          </tr>
        </Table>
      </div>

      <DeleteConfirmModal :show="Boolean(selectedOrder)" title="Delete order?"
        message="This action permanently removes the selected order from the sales report." :details="[
          { label: 'Order', value: selectedOrder ? `#${selectedOrder.order_id}` : '' },
          { label: 'Product', value: selectedOrder?.product_name },
          { label: 'Quantity', value: selectedOrder?.quantity },
          { label: 'Total', value: selectedOrder ? `${formatPrice(selectedOrder.total)} ກີບ` : '', emphasis: true }
        ]" confirm-label="Delete Order" :loading="Boolean(deletingOrderId)" @close="closeDeleteModal"
        @confirm="deleteOrder" />
    </div>
  </AdminLayout>
</template>
