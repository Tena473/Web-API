<script setup>
import { useAdminDataStore } from '@/stores/admin/data-CRUD';
import AdminLayout from '@/layouts/AdminLayout.vue';

import { useRouter, useRoute } from 'vue-router';
import { onMounted, reactive, ref, watch } from 'vue';

const fromData = [
  {
    name: "FullName",
    field: "fullname"
  },
  {
    name: "Age",
    field: "age"
  },
  {
    name: "Gender",
    field: "gender",
    selectitem: ["Male", "Female"]
  },
  {
    name: "Phone",
    field: "phone"
  },
  // {
  //   name: "Level",
  //   field: "level",
  //   selectitem: ["Beginner", "Intermediate ", "Advanced"]
  // },
  {
    name: "Symptom",
    field: "symptom",
    selectitem: ["Disability", "Sickness", "Other"]
  }
]

const adminDataStore = useAdminDataStore()
const router = useRouter()
const route = useRoute()

const studentIndex = ref(-1)
const mode = ref('ADD')
const errorMessage = ref('')

const Data = reactive({
  fullname: 'Test',
  age: '15',
  gender: '',
  phone: '020',
  // level: '',
  symptom: '',
  otherSymptom: '',
})

// ฟังก์ชันตรวจสอบชื่อซ้ำ
const checkDuplicateName = async (fullname) => {
  if (!fullname || fullname.trim() === '') {
    return { isDuplicate: false, duplicateIn: '', message: '' }
  }

  try {
    // โหลดข้อมูลล่าสุด
    // await adminDataStore.loadData('data-user', 'data_user')
    await adminDataStore.loadData('data-students', 'data_student')

    const studentsData = adminDataStore.recordsFor('data_student')
    // const studentsData = await adminDataStore.getDataList('data-students')

    // ตรวจสอบใน data-user (ยกเว้นรายการปัจจุบันถ้าเป็นการแก้ไข)
    // const duplicateInMembers = userData.find((user) =>
    //   user.fullname?.toLowerCase() === fullname.toLowerCase()
    // )

    // ตรวจสอบใน data-students
    const duplicateInStudents = studentsData.find((student, index) =>
      student.fullname?.toLowerCase() === fullname.toLowerCase() &&
      index !== studentIndex.value
    )

    // if (duplicateInMembers) {
    //   return {
    //     isDuplicate: true,
    //     duplicateIn: 'members',
    //     message: `Name "${fullname}" is already exists in Members list`
    //   }
    // }

    if (duplicateInStudents) {
      return {
        isDuplicate: true,
        duplicateIn: 'student',
        message: `Name "${fullname}" is already exists in Student list`
      }
    }

    // ไม่มีข้อมูลซ้ำ
    return {
      isDuplicate: false,
      duplicateIn: '',
      message: ''
    }

  } catch (_error) {
    return {
      isDuplicate: false,
      duplicateIn: '',
      message: 'Error checking duplicate'
    }
  }
}

const upData = async () => {
  if (!Data.updatedAt) {  // ถ้าไม่มี updatedAt ให้ตั้งค่าเป็นวันที่ปัจจุบัน
    Data.updatedAt = (new Date()).toISOString().slice(0, 10)
  }
  if (!Data.fullname || !Data.age || !Data.gender || !Data.phone || !Data.symptom || (Data.symptom === 'Other' && !Data.otherSymptom?.trim())) {
    alert('Please fill in all required fields')
    return
  }

  // ตรวจสอบว่า Symptom เป็น Other ต้องกรอก otherSymptom
  // if (Data.symptom === 'Other' && !Data.otherSymptom?.trim()) {
  //   alert('Please fill in the symptom description')
  //   return
  // }

  // ตรวจสอบชื่อซ้ำก่อนบันทึก
  const duplicateResult = await checkDuplicateName(Data.fullname)
  if (duplicateResult.isDuplicate) {
    errorMessage.value = duplicateResult.message
    const fullnameInput = document.querySelector('input[placeholder*="fullname"]')
    if (fullnameInput) {
      fullnameInput.focus()
      fullnameInput.select() // เลือกข้อความทั้งหมดใน input
    }

    return // หยุดการทำงานไม่ให้บันทึกข้อมูล
  }

  if (mode.value === 'EDIT') {
    await adminDataStore.updataData(studentIndex.value, Data, 'data-students', 'data_student')
  } else {
    await adminDataStore.addData(Data, 'data-students', 'data_student')

  }
  router.push({ name: 'admin-student-list' })
}

onMounted(async () => {
  await adminDataStore.loadData('data-students', 'data_student')

  if (route.params.id) {
    studentIndex.value = parseInt(route.params.id)
    mode.value = 'EDIT'

    const selectedData = await adminDataStore.getData(studentIndex.value, 'data-students', 'data_student')
    Data.fullname = selectedData.fullname
    Data.age = selectedData.age
    Data.gender = selectedData.gender
    Data.phone = selectedData.phone
    // Data.level = selectedData.level
    Data.symptom = selectedData.symptom || ''
    Data.otherSymptom = selectedData.otherSymptom || ''
  }
})

</script>

<template>
  <AdminLayout>
    <div class="mx-auto my-4 max-w-4xl rounded-box shadow-xl p-4 sm:p-8">

      <div class="text-3xl font-bold">{{ mode }} Student</div>
      <div class="divider"></div>
      <!--  -->
      <div role="tablist" class="tabs tabs-bordered overflow-x-auto">
        <!-- Tab1 Strat -->
        <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="Data" checked="checked" />
        <div role="tabpanel" class="tab-content p-4 sm:p-8">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- Loop Date input Strat  -->
            <label class="form-control w-full" v-for="(from, index) in fromData" :key="from">
              <div class="label">
                <span class="label-text">{{ from.name }}</span>
              </div>
              <!-- v-if Strat -->
              <select class="select select-bordered" v-model="Data[from.field]"
                v-if="from.name == 'Gender' || from.name == 'Level' || from.name == 'Symptom'">
                <option disabled selected value="">choose status</option>
                <option :value="item" v-for="(item) in fromData[index].selectitem" :key="item">
                  {{ item }}
                </option>
              </select>
              <!-- v-if end -->

              <!-- v-else-if Strat -->
              <input type="text" v-model="Data[from.field]" class="input input-bordered w-full "
                :placeholder="`Enter ${from.name.toLowerCase()}...`" v-else />
              <!-- v-else-if end -->
              <div v-if="from.field === 'fullname'" class="label mt-1">
                <span v-if="errorMessage" class="label-text-alt text-error">
                  ❌ {{ errorMessage }}
                </span>
              </div>
            </label>
            <!-- Loop Date input End  -->
          </div>

          <!-- Textarea for Other Symptom Start -->
          <div v-if="Data.symptom === 'Other'" class="mt-6">
            <label class="form-control w-full">
              <div class="label">
                <span class="label-text">Symptom Description</span>
              </div>
              <textarea v-model="Data.otherSymptom" class="textarea textarea-bordered h-24 w-full"
                placeholder="Please describe the symptom..."></textarea>
            </label>
          </div>
          <!-- Textarea for Other Symptom End -->
        </div>
        <!-- /Tab1 End -->
      </div>
      <!-- /////////////////////////////////////////////////////////////////////////////////////////// -->
      <div class="divider"></div>
      <!-- You can open the modal using ID.showModal() method -->
      <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button class="btn btn-ghost w-full sm:w-auto" @click="router.push({ name: 'admin-student-list' })">Back</button>
        <button class="btn btn-neutral w-full sm:w-auto" @click="upData()"
          :disabled="!Data.fullname || !Data.age || !Data.gender || !Data.phone || !Data.symptom || (Data.symptom === 'Other' && !Data.otherSymptom?.trim())">{{
            mode }}
          Student</button>
      </div>
    </div>
  </AdminLayout>
</template>
