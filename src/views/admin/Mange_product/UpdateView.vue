<script setup>
import { useRouter, useRoute } from 'vue-router';
import { onMounted, reactive, ref } from 'vue';

import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAdminDataStore } from '@/stores/admin/data-CRUD';

const fromData = [
  {
    name: "Product Name",
    field: "product_name"
  },
  {
    name: "Category",
    field: "category",
    selectitem: ["Sports", "Clothing", "Other"]
  },
  {
    name: "Price",
    field: "price"
  },
  {
    name: "Image URL",
    field: "image_url"
  }
]

const adminDataStore = useAdminDataStore()
const router = useRouter()
const route = useRoute()

const productIndex = ref(-1)
const mode = ref('ADD')
const errorMessage = ref('')

const Data = reactive({
  product_name: '',
  category: '',
  price: '',
  image_url: '',
  description: '',
})

// ตรวจสอบชื่อสินค้าซ้ำ
const checkDuplicateName = async (productName) => {
  if (!productName || productName.trim() === '') return false

  await adminDataStore.loadData('data-product', 'data_product')
  const products = adminDataStore.recordsFor('data_product')

  return products.some((product, index) =>
    product.product_name?.toLowerCase() === productName.toLowerCase() &&
    index !== productIndex.value
  )
}

const upData = async () => {
  errorMessage.value = ''

  if (!Data.product_name || !Data.category || Data.price === '') {
    alert('Please fill in all required fields')
    return
  }

  if (Number(Data.price) < 0) {
    errorMessage.value = 'Price must not be negative'
    return
  }

  if (await checkDuplicateName(Data.product_name)) {
    errorMessage.value = `Name "${Data.product_name}" is already exists in Product list`
    return
  }

  Data.updatedAt = (new Date()).toISOString().slice(0, 10)

  if (mode.value === 'EDIT') {
    await adminDataStore.updataData(productIndex.value, Data, 'data-product', 'data_product')
  } else {
    await adminDataStore.addData(Data, 'data-product', 'data_product')
  }
  router.push({ name: 'admin-product-list' })
}

onMounted(async () => {
  await adminDataStore.loadData('data-product', 'data_product')

  if (route.params.id) {
    productIndex.value = parseInt(route.params.id)
    mode.value = 'EDIT'

    const selectedData = await adminDataStore.getData(productIndex.value, 'data-product', 'data_product')
    Data.product_name = selectedData.product_name || ''
    Data.category = selectedData.category || ''
    Data.price = selectedData.price ?? ''
    Data.image_url = selectedData.image_url || ''
    Data.description = selectedData.description || ''
  }
})
</script>

<template>
  <AdminLayout>
    <div class="shadow-xl p-8 m-2">

      <div class="text-3xl font-bold">{{ mode }} Product</div>
      <div class="divider"></div>

      <div role="tablist" class="tabs tabs-bordered ">
        <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="Data" checked="checked" />
        <div role="tabpanel" class="tab-content p-10">
          <div class="grid grid-cols-2 gap-4">
            <!-- Loop Date input Strat  -->
            <label class="form-control w-full" v-for="(from, index) in fromData" :key="from.field">
              <div class="label">
                <span class="label-text">{{ from.name }}</span>
              </div>
              <!-- v-if Strat -->
              <select class="select select-bordered" v-model="Data[from.field]" v-if="from.selectitem">
                <option disabled selected value="">choose category</option>
                <option :value="item" v-for="(item) in fromData[index].selectitem" :key="item">
                  {{ item }}
                </option>
              </select>
              <!-- v-if end -->

              <!-- v-else Strat -->
              <input :type="from.field === 'price' ? 'number' : 'text'"
                v-model="Data[from.field]" class="input input-bordered w-full "
                :placeholder="`Enter ${from.name.toLowerCase()}...`" v-else />
              <!-- v-else end -->

              <div v-if="from.field === 'product_name'" class="label mt-1">
                <span v-if="errorMessage" class="label-text-alt text-error">
                  ❌ {{ errorMessage }}
                </span>
              </div>
            </label>
            <!-- Loop Date input End  -->
          </div>

          <!-- Image preview -->
          <div v-if="Data.image_url" class="mt-6">
            <div class="label">
              <span class="label-text">Preview</span>
            </div>
            <img :src="Data.image_url" alt="preview" class="w-48 h-48 object-cover rounded border" />
          </div>

          <!-- Description -->
          <div class="mt-6">
            <label class="form-control w-full">
              <div class="label">
                <span class="label-text">Description</span>
              </div>
              <textarea v-model="Data.description" class="textarea textarea-bordered h-24 w-full"
                placeholder="Please describe the product..."></textarea>
            </label>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="flex justify-end mt-4 gap-2">
        <button class="btn btn-ghost" @click="router.push({ name: 'admin-product-list' })">Back</button>
        <button class="btn btn-neutral" @click="upData()"
          :disabled="!Data.product_name || !Data.category || Data.price === ''">
          {{ mode }} Product
        </button>
      </div>
    </div>
  </AdminLayout>
</template>
