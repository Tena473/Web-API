<script setup>
import { RouterLink } from 'vue-router';

import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAdminDataStore } from '@/stores/admin/data-CRUD';

import Table from '@/components/Table.vue';
import Edit from '@/components/icons/Edit.vue';
import Trash from '@/components/icons/Trash.vue';
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue';
import { onMounted, ref, computed } from 'vue';



const adminDataStore = useAdminDataStore()
const searchQuery = ref('')
const paymentList = ref([])

// เพิ่มตัวแปรสำหรับ Modal
const showModal = ref(false)
const selectedPaymentDetail = ref({})
const selectedPaymentForDelete = ref(null)
const deleting = ref(false)

// ใช้ computed เพื่อกรองข้อมูลตามการค้นหา
const filteredList = computed(() => {
  if (!searchQuery.value) {
    return paymentList.value
  }

  return paymentList.value.filter(payment => {
    const query = searchQuery.value.toLowerCase()
    return (
      payment.student_name?.toLowerCase().includes(query) ||
      payment.course_name?.toLowerCase().includes(query) ||
      payment.level_name?.toLowerCase().includes(query) ||
      payment.payment_date?.includes(query) ||
      payment.usd?.toString().includes(query)
    )
  })
})

// เพิ่มฟังก์ชันหา index จาก payment_id หรือข้อมูลเฉพาะ
const getPaymentIndex = (payment) => {
  // หา index ใน adminDataStore.list (original data) แทน filteredList
  return adminDataStore.list.findIndex(p =>
    p.payment_id === payment.payment_id ||
    (p.student_id === payment.student_id && p.payment_date === payment.payment_date)
  )
}

// ฟังก์ชันเคลียร์การค้นหา
const clearSearch = () => {
  searchQuery.value = ''
}

// ฟังก์ชันเปิด Modal รายละเอียด
const openDetailModal = (payment) => {
  selectedPaymentDetail.value = payment
  showModal.value = true
}

// ฟังก์ชันปิด Modal
const closeDetailModal = () => {
  showModal.value = false
  selectedPaymentDetail.value = {}
}



const loadPaymentData = async () => {
  await adminDataStore.loadData('data-students', 'data_student')
  await adminDataStore.loadData('data-payment', 'data_payment')

  const selectedStudents = adminDataStore.recordsFor('data_student')
  const selectedPayments = adminDataStore.recordsFor('data_payment')

  // แปลงข้อมูลให้มีข้อมูลเพิ่มเติม
  const enrichedPayments = selectedPayments.map((payment, originalIndex) => {
    // หา student info จาก student_id ใน payment
    const student = selectedStudents.find(s => s.student_id === Number(payment.student_id))

    return {
      ...payment,
      originalIndex, // เก็บ index ต้นฉบับไว้
      student_name: student ? student.fullname : `Student ID: ${payment.student_id}`,
      student_phone: student ? student.phone : 'N/A',
      student_age: student ? student.age : 'N/A',
      student_gender: student ? student.gender : 'N/A',
      level_name: payment.level || 'N/A',
      course_name: payment.course || 'No Course',
      place_name: payment.place || 'No Place',
      student_symptom: student ? student.symptom == 'Other' ? student.otherSymptom : student.symptom : 'N/A',
      // เพิ่มข้อมูลอื่นๆ ที่ต้องการแสดงในตารางได้ที่นี่
    }
  })

  paymentList.value = enrichedPayments
}

onMounted(loadPaymentData)

const openDeleteModal = (payment) => {
  selectedPaymentForDelete.value = payment
}

const closeDeleteModal = () => {
  if (!deleting.value) selectedPaymentForDelete.value = null
}

const removeData = async () => {
  const paymentIndex = getPaymentIndex(selectedPaymentForDelete.value)
  if (paymentIndex === -1 || deleting.value) return

  deleting.value = true
  try {
    await adminDataStore.removeData(paymentIndex, 'data-payment', 'data_payment')
    selectedPaymentForDelete.value = null
    await loadPaymentData()
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <div class="mx-auto max-w-screen-2xl px-4 py-6">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-2xl font-bold sm:text-3xl">Record Payment</div>
        <div class="flex w-full sm:w-auto">
          <RouterLink :to="{ name: 'admin-payment-create' }" class="btn btn-neutral w-full sm:w-auto">Add New</RouterLink>
        </div>
      </div>

      <!-- Search Section -->
      <div class="mb-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div class="form-control flex-1">
            <label class="label">
              <span class="label-text">Search Payments</span>
            </label>
            <input type="text" v-model="searchQuery"
              placeholder="Search by student name, course, level, date, or amount..."
              class="input input-bordered w-full" />
          </div>
          <button @click="clearSearch" class="btn btn-outline btn-secondary w-full sm:w-auto" :disabled="!searchQuery">
            Clear
          </button>
        </div>

        <!-- Search Results Info -->
        <div class="text-sm text-gray-600 mt-2" v-if="searchQuery">
          Found {{ filteredList.length }} result(s) for "{{ searchQuery }}"
        </div>
      </div>

      <div class="overflow-x-auto">
        <Table
          :headers="['Student Name', 'Course', 'Level', 'Amount (USD)', 'Payment Date', 'Discount', 'Contact', 'Detailed', 'Actions']">
          <tr v-for="(data, index) in filteredList" :key="data.payment_id || index">
            <td>
              <!-- Highlight search term in student name -->
              <div class="font-semibold">
                <span>{{ data.student_name }}</span>
              </div>
            </td>
            <td>
              <div class="badge badge-info badge-outline">
                <span>{{ data.course_name }}</span>
              </div>
            </td>
            <td>
              <div class="badge badge-outline">
                <span>{{ data.level_name }}</span>
              </div>
            </td>
            <td>
              <div class="font-semibold text-success">
                $<span>{{ data.usd }}</span>
              </div>
            </td>
            <td>
              <span>{{ data.payment_date }}</span>
            </td>
            <td>
              <div class="text-warning">
                <span>{{ data.discount }}</span>%
              </div>
            </td>
            <td>
              <div class="text-sm">{{ data.student_phone }}</div>
            </td>
            <!-- เพิ่มคอลัมน์ Detailed -->
            <td>
              <div class="flex gap-1">
                <button @click="openDetailModal(data)" class="btn btn-info btn-sm" title="View Details">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Detail
                </button>
                <!-- เพิ่มปุ่ม PDF ในตาราง -->
                <!-- <button @click="generatePaymentPDF(data)" class="btn btn-error btn-sm" title="Generate PDF Receipt">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </button> -->
              </div>
            </td>
            <td>
              <div class="flex gap-2">
                <!-- แก้ไข RouterLink ใช้ getPaymentIndex แทน index -->
                <RouterLink :to="{ name: 'admin-payment-update', params: { id: getPaymentIndex(data) } }"
                  class="btn btn-ghost btn-sm" title="Edit Payment">
                  <Edit class="w-4 h-4"></Edit>
                </RouterLink>
                <button @click="openDeleteModal(data)" class="btn btn-ghost btn-sm text-error" title="Delete Payment">
                  <Trash class="w-4 h-4"></Trash>
                </button>
              </div>
            </td>
          </tr>

          <!-- No results message -->
          <tr v-if="filteredList.length === 0 && searchQuery">
            <td colspan="9" class="text-center py-8 text-gray-500">
              No payments found for "{{ searchQuery }}"
            </td>
          </tr>

          <!-- No data message -->
          <tr v-if="paymentList.length === 0 && !searchQuery">
            <td colspan="9" class="text-center py-8 text-gray-500">
              No payment records available
            </td>
          </tr>
        </Table>
      </div>

      <!-- Summary when searching -->
      <div v-if="searchQuery" class="mt-4 rounded-lg bg-base-200 p-4">
        <div class="text-sm">
          <strong>Search Summary:</strong> {{ filteredList.length }} of {{ paymentList.length }} payments shown
        </div>
        <div v-if="filteredList.length > 0" class="text-xs text-gray-600 mt-1">
          Total USD in results: ${{filteredList.reduce((sum, p) => sum + Number(p.usd || 0), 0).toLocaleString()}}
        </div>
      </div>


      <!-- ///////////////////////////////////////////// -->
      <!-- Detail Modal -->
      <div v-if="showModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="flex items-start justify-between gap-3 mb-4">
            <h2 class="text-xl font-bold text-gray-800 sm:text-2xl">Payment Details</h2>
            <button @click="closeDetailModal" class="btn btn-ghost btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Student Information -->
            <div class="bg-blue-50 p-4 rounded-lg">
              <h3 class="font-bold text-lg mb-3 text-blue-800">Student Information</h3>
              <div class="space-y-2">
                <p><span class="font-medium">Name:</span> {{ selectedPaymentDetail.student_name }}</p>
                <p><span class="font-medium">Age:</span> {{ selectedPaymentDetail.student_age }}</p>
                <p><span class="font-medium">Gender:</span> {{ selectedPaymentDetail.student_gender }}</p>
                <p><span class="font-medium">Phone:</span> {{ selectedPaymentDetail.student_phone }}</p>
                <p><span class="font-medium">Symptom:</span> {{ selectedPaymentDetail.student_symptom }}</p>
              </div>
            </div>

            <!-- Course Information -->
            <div class="bg-green-50 p-4 rounded-lg">
              <h3 class="font-bold text-lg mb-3 text-green-800">Course Information</h3>
              <div class="space-y-2">
                <p><span class="font-medium">Course:</span> {{ selectedPaymentDetail.course_name }}</p>
                <p><span class="font-medium">Level:</span> {{ selectedPaymentDetail.level_name }}</p>
                <p><span class="font-medium">Start Date:</span> {{ selectedPaymentDetail.start_study || 'N/A' }}</p>
                <p><span class="font-medium">End Date:</span> {{ selectedPaymentDetail.end_study || 'N/A' }}</p>
              </div>
            </div>

            <!-- Payment Information -->
            <div class="bg-yellow-50 p-4 rounded-lg">
              <h3 class="font-bold text-lg mb-3 text-yellow-800">Payment Information</h3>
              <div class="space-y-2">
                <p><span class="font-medium">Payment Date:</span> {{ selectedPaymentDetail.payment_date }}</p>
                <p><span class="font-medium">Amount (USD):</span>
                  <span class="text-green-600 font-bold">${{ selectedPaymentDetail.usd }}</span>
                </p>
                <p><span class="font-medium">Discount:</span> {{ selectedPaymentDetail.discount || 0 }}%</p>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="bg-purple-50 p-4 rounded-lg">
              <h3 class="font-bold text-lg mb-3 text-purple-800">Additional Information</h3>
              <div class="space-y-2">
                <p><span class="font-medium">Time Study:</span> {{ selectedPaymentDetail.time_study || 'N/A' }}</p>
                <p><span class="font-medium">No. of Weeks:</span> {{ selectedPaymentDetail.no_of_weeks || 'N/A' }}</p>
                <p><span class="font-medium">Place:</span> {{ selectedPaymentDetail.place_name || 'N/A' }}</p>
                <p><span class="font-medium">Student ID:</span> {{ selectedPaymentDetail.student_id }}</p>
              </div>
            </div>
          </div>

          <!-- Payment Summary -->
          <div class="mt-6 bg-gray-50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-2 text-gray-800">Payment Summary</h3>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span class="text-lg">Total Amount:</span>
              <div class="text-right">
                <div class="text-green-600 font-bold text-xl">${{ selectedPaymentDetail.usd }}</div>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button @click="closeDetailModal" class="btn btn-ghost w-full sm:w-auto">Close</button>
            <RouterLink :to="{ name: 'admin-payment-update', params: { id: getPaymentIndex(selectedPaymentDetail) } }"
              class="btn btn-primary w-full sm:w-auto" @click="closeDetailModal">
              Edit Payment
            </RouterLink>
          </div>
        </div>
      </div>
      <DeleteConfirmModal :show="Boolean(selectedPaymentForDelete)" title="Delete payment?"
        message="This action permanently removes the selected payment record." :details="[
          { label: 'Student', value: selectedPaymentForDelete?.student_name },
          { label: 'Course', value: selectedPaymentForDelete?.course_name },
          { label: 'Level', value: selectedPaymentForDelete?.level_name },
          { label: 'Payment date', value: selectedPaymentForDelete?.payment_date },
          { label: 'Amount', value: selectedPaymentForDelete ? `$${selectedPaymentForDelete.usd || 0}` : '', emphasis: true }
        ]" confirm-label="Delete Payment" :loading="deleting" @close="closeDeleteModal" @confirm="removeData" />
    </div>
  </AdminLayout>
</template>
