<script setup>

import { reactive, onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAdminDataStore } from '@/stores/admin/data-CRUD';
import { useEventStore } from '@/stores/event';

const fromDate = [
  {
    name: 'Name',
    field: 'admin_name',
  },
  {
    name: 'Password',
    field: 'password',
  },
  {
    name: 'Role',
    field: 'role',
  }
]

const roldOptions = ["Super Admin", "Admin", "Employee"]

// เพิ่มตัวเลือกสิทธิ์สำหรับ Admin
const adminPermissions = [
  {
    id: 'view_calendar',
    name: 'View Calendar',
    description: 'View events from the connected Google Calendar',
    category: 'Dashboard'
  },
  // Manage Basic Information
  {
    id: 'manage_students',
    name: 'Manage Students',
    description: 'View, Add, Edit, Delete student records',
    category: 'Student Management'
  },
  // Manage Payment
  {
    id: 'manage_payments',
    name: 'Manage Payments',
    description: 'View, Add, Edit, Delete payment records',
    category: 'Financial Management'
  },
  // Manage Product
  {
    id: 'manage_products',
    name: 'Manage Products',
    description: 'View, Add, Edit, Delete product records',
    category: 'Product Management'
  },
  {
    id: 'view_product_report',
    name: 'View Sales Report',
    description: 'View product sales report and revenue summary',
    category: 'Product Management'
  },
  {
    id: 'create_orders',
    name: 'Create Orders',
    description: 'View products and create orders after logging in',
    category: 'Order Management'
  }
]

// จัดกลุ่มสิทธิ์ตามหมวดหมู่
const groupedPermissions = computed(() => {
  const groups = {}
  adminPermissions.forEach(permission => {
    if (!groups[permission.category]) {
      groups[permission.category] = []
    }
    groups[permission.category].push(permission)
  })
  return groups
})

// สิทธิ์เริ่มต้นสำหรับ Admin role
const defaultAdminPermissions = [
  'view_calendar',
  'manage_students',
  'manage_payments',
  'manage_products',
  'view_product_report'
]
const defaultEmployeePermissions = ['create_orders']

const adminDataStore = useAdminDataStore()
const route = useRoute()
const router = useRouter()

const studentIndex = ref(-1)
const mode = ref('ADD')

const Data = reactive({
  admin_name: '',
  password: '',
  role: '',
  permissions: [] // เพิ่มฟิลด์สำหรับเก็บสิทธิ์
})

// ตรวจสอบว่าเป็น Admin role หรือไม่
const isAdminRole = computed(() => Data.role === 'Admin')

// ฟังก์ชันเมื่อเปลี่ยน role
const onRoleChange = () => {
  if (Data.role === 'Admin') {
    // ถ้าเป็น Admin ให้ใส่สิทธิ์เริ่มต้น
    Data.permissions = [...defaultAdminPermissions]
  } else if (Data.role === 'Employee') {
    Data.permissions = [...defaultEmployeePermissions]
  } else if (Data.role === 'Super Admin') {
    // ถ้าเป็น Super Admin ให้มีสิทธิ์ทั้งหมด
    Data.permissions = adminPermissions.map(p => p.id)
  } else {
    // ถ้าไม่ใช่ Admin ให้เคลียร์สิทธิ์
    Data.permissions = []
  }
}

// ฟังก์ชันตรวจสอบว่ามีสิทธิ์หรือไม่
const hasPermission = (permissionId) => {
  return Data.permissions.includes(permissionId)
}

// ฟังก์ชันเปลี่ยนสิทธิ์
const togglePermission = (permissionId) => {
  const index = Data.permissions.indexOf(permissionId)
  if (index > -1) {
    Data.permissions.splice(index, 1)
  } else {
    Data.permissions.push(permissionId)
  }
}

// ฟังก์ชันเลือกทั้งหมดในหมวดหมู่
const toggleCategoryPermissions = (category) => {
  const categoryPermissions = groupedPermissions.value[category].map(p => p.id)
  const allSelected = categoryPermissions.every(id => hasPermission(id))

  if (allSelected) {
    // ถ้าเลือกหมดแล้ว ให้ยกเลิกทั้งหมด
    categoryPermissions.forEach(id => {
      const index = Data.permissions.indexOf(id)
      if (index > -1) {
        Data.permissions.splice(index, 1)
      }
    })
  } else {
    // ถ้ายังไม่เลือกหมด ให้เลือกทั้งหมด
    categoryPermissions.forEach(id => {
      if (!hasPermission(id)) {
        Data.permissions.push(id)
      }
    })
  }
}

// ตรวจสอบว่าหมวดหมู่เลือกหมดหรือไม่
const isCategoryFullySelected = (category) => {
  const categoryPermissions = groupedPermissions.value[category].map(p => p.id)
  return categoryPermissions.every(id => hasPermission(id))
}

// ตรวจสอบว่าหมวดหมู่เลือกบางส่วนหรือไม่
const isCategoryPartiallySelected = (category) => {
  const categoryPermissions = groupedPermissions.value[category].map(p => p.id)
  const selectedCount = categoryPermissions.filter(id => hasPermission(id)).length
  return selectedCount > 0 && selectedCount < categoryPermissions.length
}

const updateStudent = async () => {
  Data.updatedAt = (new Date()).toISOString().slice(0, 10)

  // ตรวจสอบข้อมูลที่จำเป็น
  if (!Data.admin_name || (!Data.password && mode.value !== 'EDIT') || !Data.role) {
    alert('Please fill in all required fields')
    return
  }

  // ถ้าเป็น Admin แต่ไม่มีสิทธิ์ใดๆ
  if (Data.role === 'Admin' && Data.permissions.length === 0) {
    const confirm = window.confirm('Admin user has no permissions selected. Continue anyway?')
    if (!confirm) return
  }

  // console.log("update", Data)

  if (mode.value === 'EDIT') {
    adminDataStore.updataData(studentIndex.value, Data, 'data-admin', 'data_admin')
  } else {
    adminDataStore.addData(Data, 'data-admin', 'data_admin')
  }
  router.push({ name: 'admin-user-list' })
}

onMounted(async () => {
  if (route.params.id) {
    studentIndex.value = parseInt(route.params.id)
    mode.value = 'EDIT'

    const selectedData = await adminDataStore.getData(studentIndex.value, 'data-admin', 'data_admin')

    Data.admin_name = selectedData.admin_name
    Data.password = ''
    Data.role = selectedData.role
    Data.permissions = selectedData.permissions || []
  }
})
</script>

<template>
  <AdminLayout>
    <div class="mx-auto my-4 max-w-4xl rounded-box shadow-xl p-4 sm:p-8">
      <div class="text-3xl font-bold">{{ mode }} Admin User</div>
      <div class="divider"></div>

      <div class="grid grid-cols-1 gap-4">
        <label class="form-control w-full" v-for="from in fromDate" :key="from">
          <div class="label">
            <span class="label-text">{{ from.name }} <span class="text-red-500">*</span></span>
          </div>
          <input v-model="Data[from.field]" :type="from.field === 'password' ? 'password' : 'text'" class="input input-bordered w-full"
            :class="{ 'input-error': from.field === 'admin_name' && !Data.admin_name }" v-if="from.field !== 'role'" />
          <select v-model="Data[from.field]" class="select select-bordered w-full"
            :class="{ 'select-error': !Data.role }" @change="onRoleChange" v-else>
            <option value="">Select Role</option>
            <option v-for="option in roldOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
      </div>

      <!-- Permissions Section สำหรับ Admin -->
      <div v-if="isAdminRole" class="mt-8">
        <div class="divider">
          <span class="text-lg font-bold">Admin Permissions</span>
        </div>

        <div class="bg-blue-50 p-4 rounded-lg mb-4">
          <div class="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium text-blue-800">Permission Settings</span>
          </div>
          <p class="text-sm text-blue-700">
            Select specific permissions for this Admin user. Super Admin has all permissions by default.
          </p>
          <div class="text-xs text-blue-600 mt-1">
            Selected: {{ Data.permissions.length }} / {{ adminPermissions.length }} permissions
          </div>
        </div>

        <div class="space-y-6">
          <div v-for="(permissions, category) in groupedPermissions" :key="category"
            class="border border-gray-200 rounded-lg p-4">

            <!-- Category Header -->
            <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-lg font-semibold text-gray-800">{{ category }}</h3>
                <div class="badge badge-outline">
                  {{permissions.filter(p => hasPermission(p.id)).length}} / {{ permissions.length }}
                </div>
              </div>
              <button type="button" @click="toggleCategoryPermissions(category)" :class="[
                'btn btn-sm',
                isCategoryFullySelected(category) ? 'btn-error' : 'btn-success'
              ]">
                {{ isCategoryFullySelected(category) ? 'Deselect All' : 'Select All' }}
              </button>
            </div>

            <!-- Category Progress Bar -->
            <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: (permissions.filter(p => hasPermission(p.id)).length / permissions.length) * 100 + '%' }">
              </div>
            </div>

            <!-- Permissions List -->
            <div class="space-y-3">
              <div v-for="permission in permissions" :key="permission.id"
                class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">

                <input type="checkbox" :id="permission.id" :checked="hasPermission(permission.id)"
                  @change="togglePermission(permission.id)" class="checkbox checkbox-primary mt-1" />

                <label :for="permission.id" class="flex-1 cursor-pointer">
                  <div class="font-medium text-gray-800">{{ permission.name }}</div>
                  <div class="text-sm text-gray-600">{{ permission.description }}</div>
                </label>

                <!-- Permission Status Badge -->
                <div v-if="hasPermission(permission.id)" class="badge badge-success badge-sm">
                  Granted
                </div>
                <div v-else class="badge badge-ghost badge-sm">
                  Denied
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Permission Summary -->
        <div class="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="font-bold mb-2">Permission Summary</h4>
          <div class="text-sm text-gray-600">
            <div>Total Permissions: {{ adminPermissions.length }}</div>
            <div>Granted: {{ Data.permissions.length }}</div>
            <div>Denied: {{ adminPermissions.length - Data.permissions.length }}</div>
          </div>

          <!-- Selected Permissions Preview -->
          <div v-if="Data.permissions.length > 0" class="mt-3">
            <div class="text-sm font-medium text-gray-700 mb-2">Granted Permissions:</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="permissionId in Data.permissions" :key="permissionId" class="badge badge-primary badge-sm">
                {{adminPermissions.find(p => p.id === permissionId)?.name}}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Super Admin Notice -->
      <div v-else-if="Data.role === 'Super Admin'" class="mt-8">
        <div class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none"
            viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="font-bold">Super Admin Role</h3>
            <div class="text-xs">Super Admin has full access to all system features and cannot be restricted.</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-gray-600">
          <span class="text-red-500">*</span> Required fields
        </div>
        <div class="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <button class="btn btn-ghost w-full sm:w-auto" @click="router.push({ name: 'admin-user-list' })">Cancel</button>
          <button class="btn btn-primary w-full sm:w-auto" @click="updateStudent()">
            {{ mode === 'EDIT' ? 'Update' : 'Create' }} Admin
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.checkbox:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

.badge-primary {
  background-color: #3b82f6;
  color: white;
}

.transition-colors {
  transition: background-color 0.2s ease-in-out;
}
</style>
