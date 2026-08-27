import { defineStore } from 'pinia'
import axios from 'axios'

export const useProductStore = defineStore('user-product', {
  state: () => ({
    list: [],
    loading: false,
    error: '',
  }),
  getters: {
    categories: (state) => {
      const all = state.list.map(p => p.category).filter(Boolean)
      return [...new Set(all)]
    },
  },
  actions: {
    async loadProducts() {
      this.loading = true
      this.error = ''
      try {
        const res = await axios.get('/api/get/data_product')
        this.list = Array.isArray(res.data) ? res.data : Object.values(res.data)
      } catch (err) {
        this.error = 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນສິນຄ້າໄດ້'
        this.list = []
      } finally {
        this.loading = false
      }
    },

    async getProduct(id) {
      if (!this.list.length) await this.loadProducts()
      return this.list.find(p => String(p.product_id) === String(id)) || null
    },

    // บันทึกการสั่งซื้อจากหน้า ProductDetail — ใช้เป็นข้อมูลของหน้า report
    // เก็บเป็น 'YYYY-MM-DD HH:mm:ss' ตามเวลาเครื่อง เพื่อให้รายงานแสดงวันและเวลาได้
    async placeOrder(product, quantity) {
      const order = {
        product_id: product.product_id,
        quantity: Number(quantity)
      }
      await axios.post('/api/post/data_order', order)
      return order
    },
  },
})
