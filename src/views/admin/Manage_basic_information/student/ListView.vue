<script setup>
import { RouterLink } from 'vue-router';

import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAdminDataStore } from '@/stores/admin/data-CRUD';

import Table from '@/components/Table.vue';
import Edit from '@/components/icons/Edit.vue';
import Trash from '@/components/icons/Trash.vue';
import DeleteConfirmModal from '@/components/DeleteConfirmModal.vue';
import { onMounted, reactive, ref, computed } from 'vue';

const adminDataStore = useAdminDataStore()
const studentSearch = ref('')
const selectedStudent = ref(null)
const deleting = ref(false)



const filteredStudentLists = computed(() =>
  adminDataStore.list.filter(s =>
    (s.fullname || '').toLowerCase().includes(studentSearch.value.toLowerCase())
  )
)

const DataPayment = reactive({
  data: [],
})

const getStudentIndex = (studentId) => {
  return adminDataStore.list.findIndex(student => student.student_id === studentId)
}

const openDeleteModal = (student) => {
  selectedStudent.value = student
}

const closeDeleteModal = () => {
  if (!deleting.value) selectedStudent.value = null
}

const studentSymptom = (student) => {
  if (student?.symptom !== 'Other') return student?.symptom
  return student.otherSymptom ? `Other: ${student.otherSymptom}` : 'Other'
}

const removeData = async () => {
  const studentIndex = adminDataStore.list.findIndex(student => student.student_id === selectedStudent.value?.student_id)
  if (studentIndex === -1 || deleting.value) return

  deleting.value = true
  try {
    await adminDataStore.removeData(studentIndex, 'data-students', 'data_student')
    selectedStudent.value = null
  } finally {
    deleting.value = false
  }
}

// ฟังก์ชันตรวจสอบสถานะการชำระเงินและระยะเวลาการเรียน
function getStudentStatus(fullname) {
  const payments = DataPayment.data.filter(item => item.fullname === fullname)

  if (payments.length === 0) {
    return { status: 'not-enrolled', label: 'Not Enrolled', class: 'badge-error' }
  }

  const currentDate = new Date()
  const hasActivePayment = payments.some(payment => {
    if (!payment.end_study) return true // ถ้าไม่มี end_study ถือว่ายังไม่หมดอายุ

    const endDate = new Date(payment.end_study)
    return endDate >= currentDate // ตรวจสอบว่ายังไม่หมดอายุ
  })

  if (hasActivePayment) {
    return { status: 'enrolled', label: 'Enrolled', class: 'badge-success' }
  } else {
    return { status: 'expired', label: 'Expired', class: 'badge-warning' }
  }
}

// เปลี่ยนฟังก์ชันนี้เพื่อเรียงลำดับตามวันที่ล่าสุด
function getPaymentsByFullname(fullname) {
  const payments = DataPayment.data.filter(item => item.fullname === fullname)

  // เรียงลำดับตามวันที่ชำระเงิน (ล่าสุดก่อน)
  return payments.sort((a, b) => {
    const dateA = new Date(a.payment_date || '')
    const dateB = new Date(b.payment_date || '')
    return dateB - dateA // เรียงจากใหม่ไปเก่า (ล่าสุดก่อน)
  })
}

// ฟังก์ชันตรวจสอบว่าการชำระเงินหมดอายุหรือไม่
function isPaymentExpired(endStudy) {
  if (!endStudy) return false
  const currentDate = new Date()
  const endDate = new Date(endStudy)
  return endDate < currentDate
}

// ฟังก์ชันคำนวณจำนวนวันที่เหลือ
function getDaysRemaining(endStudy) {
  if (!endStudy) return null
  const currentDate = new Date()
  const endDate = new Date(endStudy)
  const diffTime = endDate - currentDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

onMounted(async () => {
  await adminDataStore.loadData('data-students', 'data_student')
  // adminDataStore.list = adminDataStore.list.filter(student => student.role == 'true')

  const selectedPayment = adminDataStore.recordsFor('data_payment')

  if (selectedPayment.length > 0) {
    for (let i = 0; i < adminDataStore.list.length; i++) {
      const studentId = adminDataStore.list[i].student_id;

      for (let j = 0; j < selectedPayment.length; j++) {
        const paymentData = selectedPayment[j];

        // เปรียบเทียบ student_id แทน fullname
        if (Number(paymentData.student_id) === studentId) {

          // ดึงข้อมูลโดยตรงจาก payment object
          const courseName = paymentData.course || ''
          const levelName = paymentData.level || ''
          const placeName = paymentData.place || ''

          // ตรวจสอบสถานะการหมดอายุ
          const isExpired = isPaymentExpired(paymentData.end_study)
          const daysRemaining = getDaysRemaining(paymentData.end_study)

          // เพิ่มข้อมูลใน DataPayment
          DataPayment.data.push({
            fullname: adminDataStore.list[i].fullname, // ใช้ fullname จาก student data
            course: courseName,
            level: levelName,
            payment_date: paymentData.payment_date || '',
            start_study: paymentData.start_study || '',
            end_study: paymentData.end_study || '', // เพิ่ม end_study
            time_study: paymentData.time_study || '',
            no_of_weeks: paymentData.no_of_weeks || '',
            usd: paymentData.usd || 0,
            discount: paymentData.discount || 0,
            place: placeName,
            mode: true, // Set mode to true if payment data is found
            isExpired: isExpired, // สถานะการหมดอายุ
            daysRemaining: daysRemaining // จำนวนวันที่เหลือ
          })
        }
      }
    }
  }
})
</script>

<template>
  <AdminLayout>
    <div class="mx-auto max-w-screen-2xl px-4 py-6">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="w-full sm:max-w-md">
          <div class="text-2xl font-bold sm:text-3xl">Student list</div>
          <input class="input input-bordered mt-3 w-full" v-model="studentSearch" placeholder="Find a Student"
            type="text" />
        </div>
        <div class="flex w-full sm:w-auto">
          <RouterLink :to="{ name: 'admin-student-create' }" class="btn btn-neutral w-full sm:w-auto">Add New</RouterLink>
        </div>
      </div>
      <div class="overflow-x-auto">
        <Table :headers="['Id', 'FullName', 'Age', 'Gender', 'Phone', 'Symptom', 'Status', 'Detailed', 'Actions']">
          <!-- row 1 -->
          <tr v-for="(data, index) in filteredStudentLists" :key="data.student_id || index">
            <th>{{ index + 1 }}</th>
            <th>{{ data.fullname }}</th>
            <td>{{ data.age }}</td>
            <td>{{ data.gender }}</td>
            <td>{{ data.phone }}</td>
            <td>{{ data.symptom }}</td>
            <td>
              <!-- แสดงสถานะตามเงื่อนไข end_study -->
              <div class="flex flex-col gap-1">
                <span :class="`badge ${getStudentStatus(data.fullname).class}`">
                  {{ getStudentStatus(data.fullname).label }}
                </span>
                <!-- แสดงข้อมูลเพิ่มเติมสำหรับ Expired -->
                <div v-if="getStudentStatus(data.fullname).status === 'expired'" class="text-xs text-gray-500">
                  Course ended
                </div>
                <!-- แสดงจำนวนวันที่เหลือสำหรับ Enrolled -->
                <div v-else-if="getStudentStatus(data.fullname).status === 'enrolled'" class="text-xs text-gray-500">
                  <span v-for="payment in getPaymentsByFullname(data.fullname)" :key="payment.payment_date">
                    <span v-if="!payment.isExpired && payment.daysRemaining !== null">
                      <span v-if="payment.daysRemaining > 0" class="text-green-600">
                        {{ payment.daysRemaining }} days left
                      </span>
                      <span v-else-if="payment.daysRemaining === 0" class="text-orange-600">
                        Ending today
                      </span>
                    </span>
                  </span>
                </div>
              </div>
            </td>
            <td>
              <!-- The button to open modal -->
              <label :for="`my_modal_${data.student_id || index}`" class="btn">Detailed</label>
              <!-- Put this part before </body> tag -->
              <input type="checkbox" :id="`my_modal_${data.student_id || index}`" class="modal-toggle" />
              <div class="modal" role="dialog">
                <div class="modal-box w-11/12 max-w-2xl">
                  <!-- จัดเรียงข้อมูลตามวันที่ล่าสุดก่อน -->
                  <div v-for="(payment, pidx) in getPaymentsByFullname(data.fullname)" :key="pidx">
                    <div class="flex justify-between items-start mb-2">
                      <h3 class="text-lg font-bold">
                        Payment #{{ pidx + 1 }} - {{ payment.fullname }}
                        <span class="text-sm text-gray-500">({{ payment.payment_date }})</span>
                      </h3>
                      <!-- แสดงสถานะในรายละเอียด -->
                      <div class="flex flex-col items-end gap-1">
                        <div class="flex gap-1">
                          <span v-if="payment.isExpired" class="badge badge-error">Expired</span>
                          <span v-else class="badge badge-success">Active</span>
                          <!-- แสดง badge สำหรับรายการล่าสุด -->
                          <span v-if="pidx === 0" class="badge badge-primary badge-xs">Latest</span>
                        </div>
                        <div v-if="payment.daysRemaining !== null" class="text-xs">
                          <span v-if="payment.daysRemaining > 0" class="text-green-600">
                            {{ payment.daysRemaining }} days left
                          </span>
                          <span v-else-if="payment.daysRemaining === 0" class="text-orange-600">
                            Ending today
                          </span>
                          <span v-else class="text-red-600">
                            Expired {{ Math.abs(payment.daysRemaining) }} days ago
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- แสดงข้อมูลรายละเอียด -->
                    <div class="bg-base-100 p-3 rounded-lg mb-3">
                      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <p><span class="font-medium">Course:</span> {{ payment.course }}</p>
                        <p><span class="font-medium">Level:</span> {{ payment.level }}</p>
                        <p><span class="font-medium">Payment date:</span>
                          <span class="font-bold text-blue-600">{{ payment.payment_date }}</span>
                        </p>
                        <p><span class="font-medium">Start study:</span> {{ payment.start_study }}</p>
                        <p><span class="font-medium">End study:</span>
                          <span :class="{ 'text-red-600 font-bold': payment.isExpired }">
                            {{ payment.end_study || 'Not specified' }}
                          </span>
                        </p>
                        <p><span class="font-medium">Time study:</span> {{ payment.time_study }}</p>
                        <p><span class="font-medium">No of weeks:</span> {{ payment.no_of_weeks }}</p>
                        <p><span class="font-medium">Place:</span> {{ payment.place }}</p>
                      </div>

                      <!-- Payment Amount Section -->
                      <div class="divider divider-start text-xs">Payment Details</div>
                      <div class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <p><span class="font-medium">USD:</span>
                          <span class="font-bold text-green-600">${{ payment.usd }}</span>
                        </p>
                        <p><span class="font-medium">Discount:</span>
                          <span class="font-bold text-purple-600">{{ payment.discount }}%</span>
                        </p>
                      </div>
                    </div>

                    <!-- Separator between payments -->
                    <hr v-if="pidx !== getPaymentsByFullname(data.fullname).length - 1"
                      class="my-4 border-2 border-dashed" />
                  </div>

                  <!-- Summary Section -->
                  <div v-if="getPaymentsByFullname(data.fullname).length > 1" class="bg-info/10 p-3 rounded-lg mt-4">
                    <h4 class="font-bold text-info mb-2">Payment Summary</h4>
                    <div class="text-sm">
                      <p>Total Payments: <span class="font-bold">{{ getPaymentsByFullname(data.fullname).length
                          }}</span></p>
                      <p>Latest Payment: <span class="font-bold">{{ getPaymentsByFullname(data.fullname)[0].payment_date
                          }}</span></p>
                    </div>
                  </div>

                  <!-- ปุ่มปิด modal -->
                  <div class="modal-action">
                    <label :for="`my_modal_${data.student_id || index}`" class="btn">Close</label>
                  </div>
                </div>
                <label class="modal-backdrop" :for="`my_modal_${data.student_id || index}`">Close</label>
              </div>
            </td>
            <td>
              <div class="flex gap-2">
                <RouterLink class="btn btn-ghost"
                  :to="{ name: 'admin-student-update', params: { id: getStudentIndex(data.student_id) } }">
                  <Edit class=""></Edit>
                </RouterLink>
                <button @click="openDeleteModal(data)" class="btn btn-ghost text-error" title="Delete Student">
                  <Trash class=""></Trash>
                </button>
              </div>
            </td>
          </tr>
        </Table>
      </div>
      <DeleteConfirmModal :show="Boolean(selectedStudent)" title="Delete student?"
        message="This action permanently removes the selected student record." :details="[
          { label: 'Name', value: selectedStudent?.fullname },
          { label: 'Age', value: selectedStudent?.age },
          { label: 'Gender', value: selectedStudent?.gender },
          { label: 'Phone', value: selectedStudent?.phone },
          { label: 'Symptom', value: studentSymptom(selectedStudent) }
        ]" confirm-label="Delete Student" :loading="deleting" @close="closeDeleteModal" @confirm="removeData" />
    </div>
  </AdminLayout>
</template>
