<script setup>
import { onMounted, ref, computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';

import { useProductStore } from '@/stores/user/product';
import { useEventStore } from '@/stores/event';

const route = useRoute()
const productStore = useProductStore()
const eventStore = useEventStore()

const product = ref(null)
const notFound = ref(false)
const quantity = ref(1)
const ordering = ref(false)
const showConfirmModal = ref(false)

const formatPrice = (price) => Number(price || 0).toLocaleString('en-US') + ' ກີບ'

const totalPrice = computed(() =>
  Number(product.value?.price || 0) * Number(quantity.value || 0)
)

const openConfirmModal = () => {
  if (!product.value || quantity.value < 1 || ordering.value) return
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  if (!ordering.value) showConfirmModal.value = false
}

const buyNow = async () => {
  if (!product.value || quantity.value < 1) return

  ordering.value = true
  try {
    await productStore.placeOrder(product.value, quantity.value)
    eventStore.popupMessage('success', `ສັ່ງຊື້ ${product.value.product_name} x${quantity.value} ສຳເລັດ`)
    quantity.value = 1
    showConfirmModal.value = false
  } catch (err) {
    eventStore.popupMessage('error', 'ສັ່ງຊື້ບໍ່ສຳເລັດ')
  } finally {
    ordering.value = false
  }
}

onMounted(async () => {
  product.value = await productStore.getProduct(route.params.id)
  notFound.value = !product.value
})
</script>

<template>
  <AdminLayout>
  <div class="min-h-screen bg-base-200">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <RouterLink :to="{ name: 'employee-order-list' }" class="btn btn-ghost btn-sm mb-4">← Back to products</RouterLink>

      <div v-if="productStore.loading" class="flex justify-center py-20">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <div v-else-if="notFound" class="alert alert-warning">
        <span>ບໍ່ພົບສິນຄ້ານີ້</span>
      </div>

      <div v-else-if="product" class="card lg:card-side bg-base-100 shadow-xl">
        <figure class="lg:w-1/2 bg-base-300">
          <img v-if="product.image_url" class="w-full h-full object-cover" :src="product.image_url"
            :alt="product.product_name" />
        </figure>
        <div class="card-body lg:w-1/2">
          <h1 class="card-title text-2xl">{{ product.product_name }}</h1>
          <div class="badge badge-outline">{{ product.category }}</div>

          <div class="text-3xl font-bold text-primary my-2">{{ formatPrice(product.price) }}</div>

          <div class="divider"></div>

          <h2 class="font-semibold">Description</h2>
          <p class="text-base-content/70 whitespace-pre-line">{{ product.description || '-' }}</p>

          <div class="divider"></div>

          <!-- Order -->
          <label class="form-control w-full max-w-[200px]">
            <div class="label">
              <span class="label-text">Quantity</span>
            </div>
            <input type="number" min="1" v-model.number="quantity" class="input input-bordered w-full" />
          </label>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span class="text-lg">
              Total: <span class="font-bold text-primary">{{ formatPrice(totalPrice) }}</span>
            </span>
            <button class="btn btn-primary" :disabled="ordering || quantity < 1" @click="openConfirmModal">
              Buy Now
            </button>
          </div>
        </div>
      </div>

      <div v-if="showConfirmModal" class="modal modal-open modal-bottom sm:modal-middle" role="dialog" aria-modal="true"
        aria-labelledby="confirm-order-title">
        <div class="modal-box w-11/12 max-w-lg">
          <h2 id="confirm-order-title" class="text-2xl font-bold">Confirm your order</h2>
          <p class="mt-1 text-base-content/60">Please review the order details before confirming.</p>

          <div class="mt-5 flex gap-4 rounded-lg bg-base-200 p-4">
            <img v-if="product?.image_url" :src="product.image_url" :alt="product.product_name"
              class="h-20 w-20 rounded object-cover" />
            <div class="min-w-0 flex-1">
              <h3 class="truncate font-semibold">{{ product?.product_name }}</h3>
              <p class="text-sm text-base-content/70">{{ product?.category || '-' }}</p>
              <p class="mt-1 font-semibold text-primary">{{ formatPrice(product?.price) }}</p>
            </div>
          </div>

          <dl class="mt-5 space-y-3">
            <div class="flex items-center justify-between">
              <dt class="text-base-content/70">Quantity</dt>
              <dd class="font-semibold">{{ quantity }}</dd>
            </div>
            <div class="flex items-center justify-between border-t border-base-300 pt-3 text-lg">
              <dt class="font-semibold">Total</dt>
              <dd class="font-bold text-primary">{{ formatPrice(totalPrice) }}</dd>
            </div>
          </dl>

          <div class="modal-action flex-col-reverse sm:flex-row">
            <button class="btn btn-ghost w-full sm:w-auto" :disabled="ordering" @click="closeConfirmModal">Cancel</button>
            <button class="btn btn-primary w-full sm:w-auto" :disabled="ordering" @click="buyNow">
              <span v-if="ordering" class="loading loading-spinner loading-sm"></span>
              {{ ordering ? 'Placing order...' : 'Confirm Order' }}
            </button>
          </div>
        </div>
        <div class="modal-backdrop" @click="closeConfirmModal"></div>
      </div>
    </div>
  </div>
  </AdminLayout>
</template>
