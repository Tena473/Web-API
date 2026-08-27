<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuDefinitions = [
  { title: 'Calendar', permission: 'view_calendar', route: [{ title: 'Calendar', routeName: 'admin-calendar' }] },
  { title: 'Dashboard', superAdminOnly: true, route: [{ title: 'Dashboard Student', routeName: 'admin-db-student' }] },
  { title: 'Manage Basic Information', permission: 'manage_students', route: [{ title: 'Student', routeName: 'admin-student-list' }] },
  { title: 'Manage Payment', permission: 'manage_payments', route: [{ title: 'Record Payment', routeName: 'admin-payment-list' }] },
  { title: 'Manage Product', permission: 'manage_products', route: [{ title: 'Product List', routeName: 'admin-product-list' }] },
  { title: 'Orders', permission: 'create_orders', route: [{ title: 'Create Order', routeName: 'employee-order-list' }] }
]

const menus = computed(() => {
  const visible = menuDefinitions
    .filter((menu) => menu.superAdminOnly
      ? authStore.isSuperAdmin
      : (menu.permissions || [menu.permission]).every((permission) => authStore.hasPermission(permission)))
    .map((menu) => ({ ...menu, route: [...menu.route] }))
  if (authStore.isSuperAdmin) visible.splice(1, 0, { title: 'Manage Admins', route: [{ title: 'Admin', routeName: 'admin-user-list' }] })
  if (authStore.hasPermission('view_product_report')) visible.push({ title: 'Sales Report', route: [{ title: 'Sales Report', routeName: 'admin-product-report' }] })
  return visible
})

const logout = async () => {
  await authStore.logout()
  router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="drawer drawer-open">
    <input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content"><slot /></div>
    <div class="drawer-side">
      <label for="my-drawer-2" class="drawer-overlay"></label>
      <ul class="menu bg-base-200 text-base-content min-h-full w-80 p-4">
        <li class="text-3xl font-bold m-4">Test Backoffice</li>
        <li class="px-4 text-sm">{{ authStore.user?.admin_name }}</li>
        <li v-for="menu in menus" :key="menu.title" class="my-2">
          <span class="menu-title text-center">{{ menu.title }}</span>
          <ul><li v-for="item in menu.route" :key="item.routeName"><RouterLink :to="{ name: item.routeName }" :class="item.routeName === route.name ? 'active' : ''">{{ item.title }}</RouterLink></li></ul>
        </li>
        <li><button @click="logout">Logout</button></li>
      </ul>
    </div>
  </div>
</template>
