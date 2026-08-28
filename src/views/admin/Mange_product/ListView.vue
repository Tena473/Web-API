<script setup>
import { RouterLink } from 'vue-router';
import { onMounted, ref, computed } from 'vue';

import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAdminDataStore } from '@/stores/admin/data-CRUD';
import { useAuthStore } from '@/stores/auth';

import Table from '@/components/Table.vue';
import Edit from '@/components/icons/Edit.vue';
import Trash from '@/components/icons/Trash.vue';
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue';

const adminDataStore = useAdminDataStore()
const authStore = useAuthStore()
const productSearch = ref('')
const canViewReport = computed(() => authStore.hasPermission('view_product_report'))
const selectedProduct = ref(null)
const deleting = ref(false)

const filteredProductLists = computed(() =>
  adminDataStore.list.filter(p =>
    (p.product_name || '').toLowerCase().includes(productSearch.value.toLowerCase())
  )
)

const getProductIndex = (productId) => {
  return adminDataStore.list.findIndex(product => product.product_id === productId)
}

const formatPrice = (price) => Number(price || 0).toLocaleString('en-US')

const openDeleteModal = (product) => {
  selectedProduct.value = product
}

const closeDeleteModal = () => {
  if (!deleting.value) selectedProduct.value = null
}

const removeData = async () => {
  const productIndex = getProductIndex(selectedProduct.value?.product_id)
  if (productIndex === -1 || deleting.value) return

  deleting.value = true
  try {
    await adminDataStore.removeData(productIndex, 'data-product', 'data_product')
    selectedProduct.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await adminDataStore.loadData('data-product', 'data_product')
})
</script>

<template>
  <AdminLayout>
    <div class="mx-auto max-w-screen-2xl px-4 py-6">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="w-full sm:max-w-md">
          <div class="text-2xl font-bold sm:text-3xl">Product list</div>
          <input class="input input-bordered mt-3 w-full" v-model="productSearch" placeholder="Find a Product"
            type="text" />
        </div>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <RouterLink v-if="canViewReport" :to="{ name: 'admin-product-report' }" class="btn btn-outline w-full sm:w-auto">Report
          </RouterLink>
          <RouterLink :to="{ name: 'admin-product-create' }" class="btn btn-neutral w-full sm:w-auto">Add New</RouterLink>
        </div>
      </div>
      <div class="overflow-x-auto">
        <Table :headers="['Id', 'Image', 'Name', 'Category', 'Price', 'Actions']">
          <tr v-for="(data, index) in filteredProductLists" :key="data.product_id || index">
            <th>{{ index + 1 }}</th>
            <td>
              <div class="avatar">
                <div class="w-14 rounded bg-base-300">
                  <img v-if="data.image_url" :src="data.image_url" :alt="data.product_name" />
                </div>
              </div>
            </td>
            <th>{{ data.product_name }}</th>
            <td>{{ data.category }}</td>
            <td>{{ formatPrice(data.price) }}</td>
            <td>
              <div class="flex gap-2">
                <RouterLink class="btn btn-ghost"
                  :to="{ name: 'admin-product-update', params: { id: getProductIndex(data.product_id) } }">
                  <Edit class=""></Edit>
                </RouterLink>
                <button @click="openDeleteModal(data)" class="btn btn-ghost text-error" title="Delete Product">
                  <Trash class=""></Trash>
                </button>
              </div>
            </td>
          </tr>
        </Table>
      </div>
      <DeleteConfirmModal :show="Boolean(selectedProduct)" title="Delete product?"
        message="This action permanently removes the selected product." :details="[
          { label: 'Product', value: selectedProduct?.product_name },
          { label: 'Category', value: selectedProduct?.category },
          { label: 'Price', value: selectedProduct ? `${formatPrice(selectedProduct.price)} ກີບ` : '' }
        ]" confirm-label="Delete Product" :loading="deleting" @close="closeDeleteModal" @confirm="removeData" />
    </div>
  </AdminLayout>
</template>
