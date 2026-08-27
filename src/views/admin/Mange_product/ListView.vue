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
    <div class="">
      <div class="flex items-center justify-between my-6 mx-4">
        <div class="flex items-center gap-2">
          <div class="text-3xl font-bold">Product list</div>
          <input class="input input-bordered w-[400px] mb-2" v-model="productSearch" placeholder="Find a Product"
            type="text" />
        </div>
        <div class="flex gap-2">
          <RouterLink v-if="canViewReport" :to="{ name: 'admin-product-report' }" class="btn btn-outline">Report
          </RouterLink>
          <RouterLink :to="{ name: 'admin-product-create' }" class="btn btn-neutral">Add New</RouterLink>
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
