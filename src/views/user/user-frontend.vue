<script setup>
import { onMounted, ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';

import { useProductStore } from '@/stores/user/product';

const productStore = useProductStore()

const search = ref('')
const selectedCategory = ref('')

const filteredProducts = computed(() =>
  productStore.list.filter(p => {
    const matchSearch = (p.product_name || '').toLowerCase().includes(search.value.toLowerCase())
    const matchCategory = !selectedCategory.value || p.category === selectedCategory.value
    return matchSearch && matchCategory
  })
)

const formatPrice = (price) => Number(price || 0).toLocaleString('en-US') + ' ກີບ'

onMounted(async () => {
  await productStore.loadProducts()
})
</script>

<template>
  <AdminLayout>
  <div class="min-h-screen bg-base-200">
    <div class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">Our Products</h1>
        <p class="text-base-content/60 mt-1">ເລືອກເບິ່ງສິນຄ້າຂອງພວກເຮົາ</p>
      </div>

      <!-- Search + category filter -->
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <input class="input input-bordered w-full sm:w-[400px]" v-model="search" placeholder="Find a product"
          type="text" />
        <select class="select select-bordered" v-model="selectedCategory">
          <option value="">All categories</option>
          <option v-for="category in productStore.categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
        <div class="text-sm text-base-content/60">
          {{ filteredProducts.length }} item(s)
        </div>
      </div>

      <div v-if="productStore.loading" class="flex justify-center py-20">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="productStore.error" class="alert alert-error">
        <span>{{ productStore.error }}</span>
      </div>

      <div v-else-if="filteredProducts.length === 0" class="text-center py-20 text-base-content/60">
        ບໍ່ພົບສິນຄ້າທີ່ຄົ້ນຫາ
      </div>

      <!-- Product grid -->
      <section v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RouterLink v-for="product in filteredProducts" :key="product.product_id"
          :to="{ name: 'employee-order-detail', params: { id: product.product_id } }"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <figure class="h-48 bg-base-300">
            <img v-if="product.image_url" class="w-full h-full object-cover" :src="product.image_url"
              :alt="product.product_name" />
          </figure>
          <div class="card-body">
            <h2 class="card-title text-lg">{{ product.product_name }}</h2>
            <div class="badge badge-outline">{{ product.category }}</div>
            <p class="text-sm text-base-content/70 line-clamp-2">{{ product.description }}</p>
            <div class="card-actions justify-between items-center mt-2">
              <span class="text-lg font-bold text-primary">{{ formatPrice(product.price) }}</span>
              <span class="btn btn-primary btn-sm">View</span>
            </div>
          </div>
        </RouterLink>
      </section>
    </div>
  </div>
  </AdminLayout>
</template>
