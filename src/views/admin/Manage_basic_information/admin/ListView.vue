<script setup>
import { RouterLink } from 'vue-router';
import { useAdminDataStore } from '@/stores/admin/data-CRUD';
import { onMounted, ref } from 'vue';

import AdminLayout from '@/layouts/AdminLayout.vue';
import Table from '@/components/Table.vue';
import Edit from '@/components/icons/Edit.vue';
import Trash from '@/components/icons/Trash.vue';
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue';

const adminDataStore = useAdminDataStore()
const selectedAdmin = ref(null)
const deleting = ref(false)

const openDeleteModal = (admin) => {
  selectedAdmin.value = admin
}

const closeDeleteModal = () => {
  if (!deleting.value) selectedAdmin.value = null
}

const removeData = async () => {
  const adminIndex = adminDataStore.list.findIndex(admin => admin.admin_id === selectedAdmin.value?.admin_id)
  if (adminIndex === -1 || deleting.value) return

  deleting.value = true
  try {
    await adminDataStore.removeData(adminIndex, 'data-admin', 'data_admin')
    selectedAdmin.value = null
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await adminDataStore.loadData('data-admin', 'data_admin')
})

</script>
<template>
  <AdminLayout>
    <div class="flex items-center justify-between my-6 mx-4">
      <div class="text-3xl font-bold">Admin</div>
      <div>
        <RouterLink :to="{ name: 'admin-user-create' }" class="btn btn-neutral">Add New</RouterLink>
      </div>
    </div>
    <Table :headers="['Id', 'Name', 'Role', 'Updated At', 'Actions']">
      <tr v-for="(data, index) in adminDataStore.list" :key="index">
        <th>{{ index + 1 }}</th>
        <th>{{ data.admin_name }}</th>
        <td>{{ data.role }}</td>
        <td>{{ data.updatedAt }}</td>
        <td>
          <div class="flex gap-2">
            <RouterLink :to="{ name: 'admin-user-update', params: { id: index } }" class="btn btn-ghost">
              <Edit class=""></Edit>
            </RouterLink>
            <button @click="openDeleteModal(data)" class="btn btn-ghost text-error" title="Delete Admin">
              <Trash class=""></Trash>
            </button>
          </div>
        </td>
      </tr>
    </Table>
    <DeleteConfirmModal :show="Boolean(selectedAdmin)" title="Delete admin?"
      message="This action permanently removes the selected admin account." :details="[
        { label: 'Name', value: selectedAdmin?.admin_name },
        { label: 'Role', value: selectedAdmin?.role },
        { label: 'Updated at', value: selectedAdmin?.updatedAt }
      ]" confirm-label="Delete Admin" :loading="deleting" @close="closeDeleteModal" @confirm="removeData" />
  </AdminLayout>
</template>
