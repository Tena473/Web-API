import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

//<===
// Admin router
import AdminLogin from '@/views/admin/Admin-Login.vue'
import AdminCalendar from '@/views/admin/Calendar.vue'

// Manage_Dashboard
import AdminDB_Student from '@/views/admin/Manage_Dashboard/DB_Student.vue'

import AdminstudentList from '@/views/admin/Manage_basic_information/student/ListView.vue'
import AdminstudentUpdate from '@/views/admin/Manage_basic_information/student/UpdateView.vue'

import AdminUserList from '@/views/admin/Manage_basic_information/admin/ListView.vue'
import AdminUserUpdate from '@/views/admin/Manage_basic_information/admin/UpdateView.vue'

// Manage_Payment
import AdminPaymentList from '@/views/admin/Manage_Payment/payment/ListView.vue'
import AdminPaymentUpdate from '@/views/admin/Manage_Payment/payment/UpdateView.vue'

// Mange_product
import AdminProductList from '@/views/admin/Mange_product/ListView.vue'
import AdminProductUpdate from '@/views/admin/Mange_product/UpdateView.vue'
import AdminProductReport from '@/views/admin/Mange_product/report.vue'
//====>

// User router
import userFrontend from '@/views/user/user-frontend.vue'
import UserProductDetail from '@/views/user/ProductDetail.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'admin-login' }
    },
    //+++ admin site +++//
    {
      path: '/admin/login',
      name: 'admin-login',
      component: AdminLogin
    },
    {
      path: '/admin/calendar',
      name: 'admin-calendar',
      component: AdminCalendar,
      meta: { permission: 'view_calendar' }
    },
    // Admin List 
    {
      path: '/admin/users',
      name: 'admin-user-list',
      component: AdminUserList,
      meta: { permission: 'super_admin' }
    },
    {
      path: '/admin/users/create',
      name: 'admin-user-create',
      component: AdminUserUpdate,
      meta: { permission: 'super_admin' }
    },
    {
      path: '/admin/users/update/:id',
      name: 'admin-user-update',
      component: AdminUserUpdate,
      meta: { permission: 'super_admin' }
    },
    // student list
    {
      path: '/admin/student',
      name: 'admin-student-list',
      component: AdminstudentList,
      meta: { permission: 'manage_students' }
    },
    {
      path: '/admin/student/create',
      name: 'admin-student-create',
      component: AdminstudentUpdate,
      meta: { permission: 'manage_students' }
    },
    {
      path: '/admin/student/update/:id',
      name: 'admin-student-update',
      component: AdminstudentUpdate,
      meta: { permission: 'manage_students' }
    },
    // payment list
    {
      path: '/admin/payment',
      name: 'admin-payment-list',
      component: AdminPaymentList,
      meta: { permission: 'manage_payments' }
    },
    {
      path: '/admin/payment/create',
      name: 'admin-payment-create',
      component: AdminPaymentUpdate,
      meta: { permission: 'manage_payments' }
    },
    {
      path: '/admin/payment/update/:id',
      name: 'admin-payment-update',
      component: AdminPaymentUpdate,
      meta: { permission: 'manage_payments' }
    },
    // product list
    {
      path: '/admin/product',
      name: 'admin-product-list',
      component: AdminProductList,
      meta: { permission: 'manage_products' }
    },
    {
      path: '/admin/product/create',
      name: 'admin-product-create',
      component: AdminProductUpdate,
      meta: { permission: 'manage_products' }
    },
    {
      path: '/admin/product/update/:id',
      name: 'admin-product-update',
      component: AdminProductUpdate,
      meta: { permission: 'manage_products' }
    },
    {
      path: '/admin/product/report',
      name: 'admin-product-report',
      component: AdminProductReport,
      meta: { permission: 'view_product_report' }
    },
    // Manage_Dashboard
    {
      path: '/admin/dashboard/db-student',
      name: 'admin-db-student',
      component: AdminDB_Student,
      // Dashboard aggregates student and payment data, so it is reserved for
      // the Super Admin role rather than ordinary Admin permissions.
      meta: { superAdminOnly: true }
    },

    //+++ user site +++//
    {
      path: '/admin/orders',
      name: 'employee-order-list',
      component: userFrontend,
      meta: { permission: 'create_orders' }
    },
    {
      path: '/admin/orders/:id',
      name: 'employee-order-detail',
      component: UserProductDetail,
      meta: { permission: 'create_orders' }
    },
    {
      path: '/products/:pathMatch(.*)*',
      redirect: { name: 'admin-login' }
    },
  ]
})

router.beforeEach(async (to) => {
  if (!to.path.startsWith('/admin') || to.name === 'admin-login') return true

  const authStore = useAuthStore()
  try {
    // After a full browser refresh Pinia is empty. Hydrate it from the
    // HttpOnly admin_session cookie before rendering permission-based menus.
    if (await authStore.loadSession()) {
      if (to.meta.superAdminOnly) {
        return authStore.isSuperAdmin ? true : { name: 'admin-login' }
      }
      const requiredPermissions = to.meta.permissions || (to.meta.permission ? [to.meta.permission] : [])
      if (requiredPermissions.length && requiredPermissions.every((permission) => authStore.hasPermission(permission))) return true
      return { name: 'admin-login' }
    }
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  } catch (error) {
    // Do not mistake a CORS, API, or network outage for a completed logout.
    return false
  }
})

export default router
