<script setup>
import { useAdminDataStore } from '@/stores/admin/data-CRUD';
import AdminLayout from '@/layouts/AdminLayout.vue';

import { useRouter, useRoute } from 'vue-router';
import { onMounted, reactive, ref, watch } from 'vue';

const fromData = [
  {
    name: "Student Name",
    field: "fullname",
    selectitem: [],
  },
]

const fromData1 = [
  {
    name: "Courses",
    field: "course",
    selectitem: ["Swimming"]
  },
  {
    name: "Level",
    field: "level",
    selectitem: ["Beginner", "Intermediate", "Advanced"],
  },

]

const fromData2 = [
  {
    name: "Payment Date",
    field: "payment_date",
    type: "date"
  },
  {
    name: "Start Study",
    field: "start_study",
    type: "date"
  },
  {
    name: "End Study",
    field: "end_study",
    type: "date"
  },
  {
    name: "Time Study",
    field: "time_study",
    selectitem: ["1", "2", "3"],
    type: "item"
  },
  {
    name: "No. of weeks",
    field: "no_of_weeks",
    selectitem: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    type: "item"
  },
  {
    name: "Cost",
    field: "cost",
    type: "text",
    selectitem: ["USD"],
  },
  {
    name: "Discount %",
    field: "discount",
    type: "text"
  },
  {
    name: "Place Of Study",
    field: "place",
    selectitem: ["Angkham"],
    type: "item"
  },
]

const adminDataStore = useAdminDataStore()
const router = useRouter()
const route = useRoute()

const studentIndex = ref(-1)
const mode = ref('ADD')
const students = ref([])

const Data = reactive({
  // Tab1
  fullname: '',
  // Tab2
  course: '',
  level: '',
  // Tab3
  payment_date: '',
  start_study: '',
  end_study: '',
  time_study: '',
  no_of_weeks: '',
  usd: 0,
  discount: 0,
  place: '',
  //
})

const studentData = reactive({
  fullname: '',
  age: '',
  gender: '',
  phone: '',
  symptom: '',
  otherSymptom: '',
})

const costData = reactive({
  r_usd: 0,
  ex_usd: 0,
})

const showStudents = () => {
  if (Data.fullname) {
    const selectedStudents = students.value

    for (let i = 0; i < fromData[0].selectitem.length; i++) {
      if (Data.fullname === selectedStudents[i].fullname) {
        studentData.fullname = selectedStudents[i].fullname;
        studentData.age = selectedStudents[i].age;
        studentData.gender = selectedStudents[i].gender;
        studentData.phone = selectedStudents[i].phone;
        studentData.symptom = selectedStudents[i].symptom;
        studentData.otherSymptom = selectedStudents[i].otherSymptom;
        return;
      }
    }
  }

}

// Calculate cost based on selected values
const calculateCost = async () => {
  let timeStudy = parseInt(Data.time_study) || 0;
  let noOfWeeks = parseInt(Data.no_of_weeks) || 0;

  if (timeStudy === 1) {
    timeStudy = 11;
  } else if (timeStudy === 2) {
    timeStudy = 18;
  } else if (timeStudy === 3) {
    timeStudy = 25;
  } else {
    timeStudy = 0;
  }

  if (timeStudy !== 0 && noOfWeeks !== 0) {

    Data.usd = (timeStudy * noOfWeeks);

    costData.r_usd = Data.usd;

    if (Data.discount > 0) {
      calculateDiscount();
    } else {
      costData.ex_usd = Data.usd;
    }
  }

}

const calculateDiscount = () => {
  if (Data.discount > 0) {
    if (Data.discount > 100) {
      Data.discount = 100; // จำกัดส่วนลดไม่ให้เกิน 100%
    }
    costData.ex_usd = (costData.r_usd - (costData.r_usd * Data.discount / 100));
    // console.log("calculateDiscount ---", (costData.r_usd * Data.discount / 100));
    // console.log("calculateDiscount Ture", Data.usd);
  }
}

// Watch for changes in the relevant fields and recalculate cost
watch([() => Data.fullname], showStudents)
watch([() => Data.time_study, () => Data.no_of_weeks, () => Data.discount], calculateCost);

// watch([() => Data.discount], calculateDiscount);

const updateStudent = async () => {
  // สร้าง copy ของ Data เพื่อแปลงค่าก่อนส่ง
  const dataToSave = { ...Data }

  // แปลง fullname เป็น student_id
  if (dataToSave.fullname) {
    const selectedStudents = students.value
    const student = selectedStudents.find(s => s.fullname === dataToSave.fullname)
    if (student) {
      dataToSave.student_id = student.student_id
      delete dataToSave.fullname // ลบ fullname ออกและใช้ student_id แทน
    }
  }

  if (mode.value === 'EDIT') {
    await adminDataStore.updataData(studentIndex.value, dataToSave, 'data-payment', 'data_payment')
  } else {
    await adminDataStore.addData(dataToSave, 'data-payment', 'data_payment')
  }
  router.push({ name: 'admin-payment-list' })
}

onMounted(async () => {
  await adminDataStore.loadData('data-students', 'data_student')
  const selectedStudents = adminDataStore.recordsFor('data_student')
  students.value = selectedStudents
  // โหลดข้อมูลใน selectitem
  for (let i = 0; i < selectedStudents.length; i++) {
    fromData[0].selectitem[i] = selectedStudents[i].fullname
  }

  if (route.params.id) {
    studentIndex.value = parseInt(route.params.id)
    mode.value = 'EDIT'

    await adminDataStore.loadData('data-payment', 'data_payment')
    const selectedData = await adminDataStore.getData(studentIndex.value, 'data-payment', 'data_payment')
    // แปลง student_id เป็น fullname
    if (selectedData.student_id) {
      const student = selectedStudents.find(s => s.student_id === Number(selectedData.student_id))
      Data.fullname = student ? student.fullname : selectedData.student_id
    } else {
      Data.fullname = selectedData.fullname || ''
    }

    // ข้อมูลอื่นๆ ที่ไม่ต้องแปลง
    Data.course = selectedData.course
    Data.level = selectedData.level
    Data.payment_date = selectedData.payment_date
    Data.start_study = selectedData.start_study
    Data.end_study = selectedData.end_study
    Data.time_study = selectedData.time_study
    Data.no_of_weeks = selectedData.no_of_weeks
    Data.usd = selectedData.usd || 0
    Data.discount = selectedData.discount
    Data.place = selectedData.place

    // คำนวณ end_study หลังโหลดข้อมูลเสร็จ (ถ้าไม่มี end_study)
    if (Data.start_study && Data.no_of_weeks && !Data.end_study) {
      calculateEndStudy()
    }

  }
})

const calculateEndStudy = () => {
  // ตรวจสอบว่ามีวันเริ่มเรียนและจำนวนสัปดาห์หรือไม่
  if (Data.start_study && Data.no_of_weeks) {
    const startDate = new Date(Data.start_study)
    const weeks = parseInt(Data.no_of_weeks) || 0

    // ตรวจสอบว่า startDate เป็นวันที่ที่ถูกต้องหรือไม่
    if (!isNaN(startDate.getTime()) && weeks > 0) {
      // คำนวณจำนวนวันทั้งหมด (สัปดาห์ * 7 วัน)
      const totalDays = weeks * 7

      // เพิ่มจำนวนวันเข้าไปในวันเริ่มเรียน
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + totalDays)

      // แปลงเป็นรูปแบบ YYYY-MM-DD สำหรับ input date
      const endDateString = endDate.toISOString().split('T')[0]

      // อัพเดท end_study
      Data.end_study = endDateString

    } else {
      // ถ้าข้อมูลไม่ถูกต้อง ให้เคลียร์ end_study
      Data.end_study = ''
    }
  } else {
    // ถ้าไม่มีข้อมูลที่จำเป็น ให้เคลียร์ end_study
    Data.end_study = ''
  }
}

// เพิ่มฟังก์ชันคำนวณจำนวนสัปดาห์จากวันที่
const calculateWeeksFromDates = () => {
  if (Data.start_study && Data.end_study) {
    const startDate = new Date(Data.start_study)
    const endDate = new Date(Data.end_study)

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      // คำนวณจำนวนวันระหว่างวันที่เริ่มและจบ
      const timeDiff = endDate.getTime() - startDate.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

      // คำนวณจำนวนสัปดาห์ (ปัดขึ้น)
      const weeks = Math.ceil(daysDiff / 7)

      // อัพเดทจำนวนสัปดาห์ถ้าค่าที่คำนวณได้อยู่ใน options
      if (weeks > 0 && weeks <= 10) {
        Data.no_of_weeks = weeks.toString()
      }
    }
  }
}

// เพิ่ม watch สำหรับคำนวณ end_study
watch([() => Data.start_study, () => Data.no_of_weeks], () => {
  // คำนวณ end_study เมื่อ start_study หรือ no_of_weeks เปลี่ยน
  calculateEndStudy()
}, { immediate: false })

// เพิ่ม watch สำหรับคำนวณ weeks จาก dates (optional)
watch([() => Data.end_study], () => {
  // คำนวณจำนวนสัปดาห์เมื่อ end_study เปลี่ยน (โดยผู้ใช้แก้ไขด้วยตัวเอง)
  if (Data.start_study && Data.end_study) {
    calculateWeeksFromDates()
  }
}, { immediate: false })

// แก้ไข existing watches
watch([() => Data.fullname], showStudents)
watch([() => Data.time_study, () => Data.no_of_weeks, () => Data.discount], calculateCost);

</script>

<template>
  <AdminLayout>
    <div class="mx-auto my-4 max-w-5xl rounded-box shadow-xl p-4 sm:p-8">

      <div class="text-3xl font-bold">{{ mode }}</div>
      <div class="divider"></div>

      <div role="tablist" class="tabs tabs-bordered overflow-x-auto">
        <!-- Tab1 Strat -->
        <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="Student" checked="checked" />
        <div role="tabpanel" class="tab-content p-4 sm:p-8">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- Loop Date input Strat  -->
            <label class="form-control w-full" v-for="(from, index) in fromData" :key="from">
              <div class="label">
                <span class="label-text">{{ from.name }}</span>
              </div>
              <select class="select select-bordered" v-model="Data[from.field]">
                <option disabled selected>choose status</option>
                <option :value="item" v-for="(item) in fromData[index].selectitem" :key="item">
                  {{ item }}
                </option>
              </select>
              <div class="w-full bg-gray-300 mt-3 border border-black" v-if="Data.fullname">
                <div class="">Name: {{ studentData.fullname }}</div>
                <div class="">Age: {{ studentData.age }}</div>
                <div class="">Gender: {{ studentData.gender }}</div>
                <div class="">Phone: {{ studentData.phone }}</div>
                <div class="">Symptom: {{ studentData.symptom }}</div>
                <div class="" v-if="studentData.symptom === 'Other'">Other Symptom: {{ studentData.otherSymptom }}</div>
              </div>
            </label>
            <!-- Loop Date input End  -->
          </div>
        </div>
        <!-- /Tab1 End -->

        <!-- Tab2 Strat -->
        <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="Courses" />
        <div role="tabpanel" class="tab-content p-4 sm:p-8">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- Loop Date input Strat  -->
            <label class="form-control w-full" v-for="(from, index) in fromData1" :key="from">
              <div class="label">
                <span class="label-text">{{ from.name }} </span>
              </div>
              <select class="select select-bordered" v-model="Data[from.field]">
                <option disabled selected>choose status</option>
                <option :value="item" v-for="(item) in fromData1[index].selectitem" :key="item">
                  {{ item }}
                </option>
              </select>
            </label>
            <!-- Loop Date input End  -->
          </div>
        </div>
        <!-- /Tab2 End -->

        <!-- Tab3 Strat -->
        <input type="radio" name="my_tabs_1" role="tab" class="tab" aria-label="Payment" />
        <div role="tabpanel" class="tab-content p-4 sm:p-8">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <!-- Loop Date input Strat  -->
            <label class="form-control w-full" v-for="(from, index) in fromData2" :key="from">
              <div class="label">
                <span class="label-text">{{ from.name }} </span>
                <!-- แสดงข้อมูลเพิ่มเติมสำหรับ End Study -->
                <span v-if="from.field === 'end_study' && Data.start_study && Data.no_of_weeks"
                  class="label-text-alt text-info">
                  (Auto-calculated from start date + {{ Data.no_of_weeks }} weeks)
                </span>
              </div>

              <!-- v-if Strat -->
              <select class="select select-bordered" v-model="Data[from.field]" v-if="from.type == 'item'">
                <option disabled selected>choose status</option>
                <option :value="item" v-for="(item) in fromData2[index].selectitem" :key="item">
                  {{ item }}
                </option>
              </select>
              <!-- v-if end -->

              <!-- v-else-if Strat -->
              <div class="" v-else-if="from.name == 'Cost'">
                <div class="flex justify-center gap-2 ">
                  <p class="input input-bordered w-full p-2 ">{{ Data.usd }}$</p>
                  <p class="self-center">=></p>
                  <p class="input input-bordered w-full p-2 ">{{ costData.ex_usd }}$</p>
                </div>
              </div>
              <!-- v-else-if end -->

              <!-- v-else Strat -->
              <div v-else>
                <input :type="from.type" v-model="Data[from.field]" class="input input-bordered w-full" />

                <!-- แสดงข้อมูลเพิ่มเติมสำหรับ No. of weeks -->
                <div v-if="from.field === 'no_of_weeks' && Data.start_study && Data.no_of_weeks"
                  class="text-xs text-gray-600 mt-1">
                  Duration: {{ Data.start_study }} to {{ Data.end_study || 'calculating...' }}
                </div>

                <!-- แสดงข้อมูลเพิ่มเติมสำหรับ Start Study -->
                <div v-if="from.field === 'start_study' && Data.start_study && Data.no_of_weeks"
                  class="text-xs text-gray-600 mt-1">
                  End date will be: {{ Data.end_study || 'calculating...' }}
                </div>
              </div>
              <!-- v-else end -->
            </label>
            <!-- Loop Date input End  -->
          </div>
        </div>
        <!-- /Tab3 End -->
      </div>

      <div class="divider"></div>

      <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button class="btn btn-ghost w-full sm:w-auto" @click="router.push({ name: 'admin-payment-list' })">Back</button>
        <button class="btn btn-neutral w-full sm:w-auto" @click="updateStudent()" :disabled="!Data.course">{{ mode }}</button>
      </div>
    </div>
  </AdminLayout>
</template>
