<script setup>
import AdminLayout from '@/layouts/AdminLayout.vue';
import { useAdminDataStore } from '@/stores/admin/data-CRUD';
import { onMounted, ref, reactive, nextTick } from 'vue';

// Fixed import jsPDF and autoTable
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import IconUser from '@/components/icons/Users.vue';

const adminDataStore = useAdminDataStore();
const StudentLength = ref(0);
const PaymentYes = ref(0);
const PaymentNo = ref(0);
const yearComparison = ref({});
const studentRecords = ref([])
const availableYears = ref([])

// Add ref for display type selection
const viewType = ref('year') // 'year' or 'month'
const selectedYear = ref(new Date().getFullYear()) // Selected year for monthly view

// Add key for force re-render chart
const chartKey = ref(0)

const studentPieChart = reactive({
  options: {
    chart: {
      toolbar: { show: false }
    },
    labels: [],
    title: {
      text: 'Student Distribution by Year',
      align: 'center'
    },
    colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#3F51B5', '#546E7A', '#26A69A', '#D10CE8', '#F9A825', '#EF5350', '#8D6E63'],
    legend: {
      position: 'bottom'
    },
    dataLabels: {
      enabled: true,
      formatter: (percentage) => `${percentage.toFixed(1)}%`
    },
    tooltip: {
      y: {
        formatter: (value) => `${value} student${value === 1 ? '' : 's'}`
      }
    },
    noData: {
      text: 'No student data available'
    }
  },
  series: []
})

// Store raw data for PDF creation
const rawData = ref({
  students: [],
  chartData: []
})

const priceChart = reactive({
  options: {
    chart: {
      id: 'vuechart-example',
      toolbar: {
        show: false
      }
    },
    xaxis: {
      categories: []
    },
    title: {
      text: 'Number of students per year',
      align: 'center'
    },
    colors: ['#008FFB'],
    dataLabels: {
      enabled: true
    }
  },
  series: [
    {
      name: 'Students',
      data: []
    },
  ]
})

const ifPayment = (PArray, SArray) => {
  // Filter students with unique names
  const uniqueStudents = SArray.filter(
    (item, index, self) =>
      index === self.findIndex(t => t.fullname === item.fullname)
  )
  // Count students who are not in payment
  PaymentNo.value = uniqueStudents.filter(Sitem =>
    !PArray.some(Pitem => Pitem.fullname === Sitem.fullname)
  ).length;

  // Count students who are in payment (unique names)
  PaymentYes.value = uniqueStudents.filter(Sitem =>
    PArray.some(Pitem => Pitem.fullname === Sitem.fullname)
  ).length;

}

function getYearFromDate(date) {
  const match = String(date || '').match(/^(\d{4})/)
  const year = Number(match?.[1])
  return Number.isInteger(year) && year >= 1000 && year <= 9999 ? year : null
}

function getAvailableYears(students) {
  return [...new Set(students.map(student => getYearFromDate(student.updatedAt)).filter(Boolean))]
    .sort((firstYear, secondYear) => firstYear - secondYear)
}

function getYearComparison(students, years) {
  return Object.fromEntries(years.map(year => [
    year,
    students.filter(student => getYearFromDate(student.updatedAt) === year).length
  ]))
}

function getStudentCountByYear(students, years, dateField) {
  return years.map(year => {
    const count = students.filter(s => {
      return getYearFromDate(s[dateField]) === year
    }).length
    return count
  })
}

function getStudentCountByMonth(students, year, dateField) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return months.map((month, index) => {
    const count = students.filter(s => {
      const match = String(s[dateField] || '').match(/^(\d{4})-(\d{2})/)
      return Number(match?.[1]) === year && Number(match?.[2]) === (index + 1)
    }).length
    return count
  })
}

// PDF generation function - Fixed
function downloadPDF() {
  try {
    // Create jsPDF instance
    const doc = new jsPDF();

    // Set font and size
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');

    // Report title
    const title = viewType.value === 'year'
      ? 'Student Registration Report by Year'
      : `Student Registration Report by Month (${selectedYear.value})`;

    doc.text(title, 105, 20, { align: 'center' });

    // Report generation date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('en-US');
    doc.text(`Generated on: ${currentDate}`, 105, 30, { align: 'center' });

    // Summary of all data
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', 20, 45);

    doc.setFont('helvetica', 'normal');
    doc.text(`Total Students: ${StudentLength.value}`, 20, 55);
    doc.text(`Students with Payment: ${PaymentYes.value}`, 20, 65);
    doc.text(`Students without Payment: ${PaymentNo.value}`, 20, 75);

    // Create data table
    const tableData = [];
    const headers = viewType.value === 'year'
      ? ['Year', 'Number of Students', 'Percentage']
      : ['Month', 'Number of Students', 'Percentage'];

    const categories = priceChart.options.xaxis.categories;
    const data = priceChart.series[0].data;
    const total = data.reduce((sum, count) => sum + count, 0);

    categories.forEach((category, index) => {
      const count = data[index] || 0;
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%';
      tableData.push([category, count, percentage]);
    });

    // Add total row
    tableData.push(['Total', total, '100%']);

    // Use autoTable function directly
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 85,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: 50,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didParseCell: function (data) {
        // Make the last row (Total) a different color
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fillColor = [52, 152, 219];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // Data chart in Bar Chart format (ASCII)
    const finalY = doc.lastAutoTable.finalY + 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Data Visualization:', 20, finalY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let yPosition = finalY + 15;
    const maxValue = Math.max(...data.filter(val => val > 0)); // Filter out 0 values

    if (maxValue > 0) {
      categories.forEach((category, index) => {
        const count = data[index] || 0;
        const barLength = count > 0 ? Math.round((count / maxValue) * 40) : 0;
        const bar = '█'.repeat(barLength);
        const spaces = ' '.repeat(Math.max(0, 8 - String(category).length));

        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(`${category}${spaces}: ${bar} (${count})`, 20, yPosition);
        yPosition += 8;
      });
    }

    // Additional information
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 10;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Note: This report shows student registration statistics', 20, yPosition);
    doc.text('Data source: School Management System', 20, yPosition + 8);

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 200, 290, { align: 'right' });
    }

    // Download file
    const fileName = viewType.value === 'year'
      ? `student_report_by_year_${currentDate.replace(/\//g, '-')}.pdf`
      : `student_report_${selectedYear.value}_by_month_${currentDate.replace(/\//g, '-')}.pdf`;

    doc.save(fileName);

  } catch (_error) {
    alert('Unable to create PDF. Please try again.');
  }
}

// Excel/CSV download function
function downloadExcel() {
  const categories = priceChart.options.xaxis.categories;
  const data = priceChart.series[0].data;
  const total = data.reduce((sum, count) => sum + count, 0);

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for UTF-8

  // Header
  const headerType = viewType.value === 'year' ? 'Year' : 'Month';
  csvContent += `${headerType},Number of Students,Percentage\n`;

  // Data rows
  categories.forEach((category, index) => {
    const count = data[index] || 0;
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
    csvContent += `${category},${count},${percentage}%\n`;
  });

  // Total row
  csvContent += `Total,${total},100%\n`;

  // Download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const fileName = viewType.value === 'year'
    ? `student_data_by_year.csv`
    : `student_data_${selectedYear.value}_by_month.csv`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Update chart function based on selected type
async function updateChart() {
  const StudentGet = studentRecords.value

  if (availableYears.value.length > 0 && !availableYears.value.includes(selectedYear.value)) {
    selectedYear.value = availableYears.value.at(-1)
  }

  if (viewType.value === 'year') {
    const years = availableYears.value
    const studentPerYear = getStudentCountByYear(StudentGet, years, 'updatedAt');

    // Update with new approach - create new object entirely
    Object.assign(priceChart.options, {
      ...priceChart.options,
      xaxis: {
        ...priceChart.options.xaxis,
        categories: [...years]
      },
      title: {
        ...priceChart.options.title,
        text: 'Number of students per year'
      }
    });

    // Update series with new approach
    priceChart.series.splice(0, priceChart.series.length, {
      name: 'Students',
      data: [...studentPerYear]
    });

  } else {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const studentPerMonth = getStudentCountByMonth(StudentGet, selectedYear.value, 'updatedAt');

    // Update with new approach
    Object.assign(priceChart.options, {
      ...priceChart.options,
      xaxis: {
        ...priceChart.options.xaxis,
        categories: [...months]
      },
      title: {
        ...priceChart.options.title,
        text: `Number of students per month (${selectedYear.value})`
      }
    });

    // Update series with new approach
    priceChart.series.splice(0, priceChart.series.length, {
      name: 'Students',
      data: [...studentPerMonth]
    });
  }

  // Store data for PDF creation
  rawData.value.chartData = {
    categories: priceChart.options.xaxis.categories,
    data: priceChart.series[0].data,
    title: priceChart.options.title.text
  };

  const pieLabels = priceChart.options.xaxis.categories.filter(
    (_, index) => Number(priceChart.series[0].data[index]) > 0
  )
  const pieSeries = priceChart.series[0].data.filter(value => Number(value) > 0)

  Object.assign(studentPieChart.options, {
    ...studentPieChart.options,
    labels: pieLabels,
    title: {
      ...studentPieChart.options.title,
      text: viewType.value === 'year'
        ? 'Student Distribution by Year'
        : `Student Distribution by Month (${selectedYear.value})`
    }
  })
  studentPieChart.series.splice(0, studentPieChart.series.length, ...pieSeries)

  // Force re-render chart
  chartKey.value++;

  // Let Vue update DOM first
  await nextTick();

}

// Change display type function
async function changeViewType(type) {
  viewType.value = type;
  await updateChart();
}

// Change year function
async function changeYear(year) {
  selectedYear.value = Number(year);
  if (viewType.value === 'month') {
    await updateChart();
  }
}

function getPreviousAvailableYear(year) {
  const yearIndex = availableYears.value.indexOf(Number(year))
  return yearIndex > 0 ? availableYears.value[yearIndex - 1] : null
}

onMounted(async () => {
  await adminDataStore.loadData('data-students', 'data_student');
  const StudentGet = [...adminDataStore.recordsFor('data_student')]
  await adminDataStore.loadData('data-payment', 'data_payment');
  const PaymentGet = [...adminDataStore.recordsFor('data_payment')];

  // Convert student_id to fullname in PaymentGet
  const PaymentWithFullname = PaymentGet.map(payment => {
    if (payment.student_id) {
      const student = StudentGet.find(s => s.student_id === Number(payment.student_id));
      return {
        ...payment,
        fullname: student ? student.fullname : `Student ID: ${payment.student_id}`
      };
    }
    return payment;
  });

  studentRecords.value = StudentGet
  availableYears.value = getAvailableYears(StudentGet)
  if (availableYears.value.length > 0) {
    selectedYear.value = availableYears.value.at(-1)
  }

  // Store raw data
  rawData.value.students = StudentGet;
  StudentLength.value = StudentGet.length;
  ifPayment(PaymentWithFullname, StudentGet);
  yearComparison.value = getYearComparison(StudentGet, availableYears.value);
  await updateChart();
});
</script>

<template>
  <AdminLayout>
    <div class="mx-4">
      <div class="text-3xl my-4 mx-2">
        Student Dashboard
      </div>
      <div class="stats w-full shadow mb-6">
        <div class="stat">
          <div class="stat-figure text-secondary">
            <IconUser class="inline-block h-8 w-8 stroke-current" />
          </div>
          <div class="stat-title">Students</div>
          <div class="stat-value">{{ StudentLength }}</div>
        </div>
      </div>
    </div>
    <div class="">
      <!-- Summary Stats -->
      <div class="mb-4 grid stats shadow mx-4 grid-cols-1 md:grid-cols-3 gap-4 ">
        <div class="stat bg-base-100 rounded-lg">
          <div class="stat-title text-sm">Year with Most Students</div>
          <div class="stat-value text-2xl text-primary">
            {{Object.entries(yearComparison).reduce((a, b) => b[1] > a[1] ? b : a, ['N/A', 0])[0]}}
          </div>
          <div class="stat-desc">
            {{Object.entries(yearComparison).reduce((a, b) => b[1] > a[1] ? b : a, ['N/A', 0])[1]}} students
          </div>
        </div>

        <div class="stat bg-base-100 rounded-lg">
          <div class="stat-title text-sm">Year with Least Students</div>
          <div class="stat-value text-2xl text-warning">
            {{Object.entries(yearComparison).filter(([_, count]) => count > 0).length > 0
              ? Object.entries(yearComparison).filter(([_, count]) => count > 0).reduce((a, b) => b[1] < a[1] ? b : a)[0]
              : 'N/A'}} </div>
              <div class="stat-desc">
                {{Object.entries(yearComparison).filter(([_, count]) => count > 0).length > 0
                  ? Object.entries(yearComparison).filter(([_, count]) => count > 0).reduce((a, b) => b[1] < a[1] ? b :
                    a)[1] : '0'}} students </div>
              </div>

              <div class="stat bg-base-100 rounded-lg">
                <div class="stat-title text-sm">Average per Year</div>
                <div class="stat-value text-2xl text-success">
                  {{(StudentLength / Object.keys(yearComparison).filter(year => yearComparison[year] > 0).length ||
                    1).toFixed(0)}}
                </div>
                <div class="stat-desc">
                  students per year
                </div>
              </div>
          </div>
        </div>
        <!-- Chart Options -->
        <div class="mx-4 mb-4">
          <div class="flex items-center justify-between p-4 bg-base-200 rounded-lg">
            <div class="flex items-center gap-4">
              <div class="font-semibold">Chart View:</div>

              <!-- View Type Buttons -->
              <div class="btn-group">
                <button @click="changeViewType('year')"
                  :class="['btn', viewType === 'year' ? 'btn-active btn-primary' : 'btn-outline']">
                  By Year
                </button>
                <button @click="changeViewType('month')"
                  :class="['btn', viewType === 'month' ? 'btn-active btn-primary' : 'btn-outline']">
                  By Month
                </button>
              </div>

              <!-- Year Selector (shown when By Month is selected) -->
              <div v-if="viewType === 'month'" class="flex items-center gap-2">
                <span class="text-sm">Year:</span>
                <select v-model="selectedYear" @change="changeYear(selectedYear)"
                  class="select select-bordered select-sm">
                  <option v-if="availableYears.length === 0" disabled :value="selectedYear">
                    No student years available
                  </option>
                  <option v-for="year in availableYears" :key="year" :value="year">
                    {{ year }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Download Buttons -->
            <div class="flex items-center gap-2">
              <div class="font-semibold text-sm">Export:</div>

              <button @click="downloadPDF" class="btn btn-error btn-sm gap-2" title="Download PDF Report">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>

              <button @click="downloadExcel" class="btn btn-success btn-sm gap-2" title="Download Excel/CSV Data">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
            </div>
          </div>
        </div>

        <!-- Both charts use the same year/month selection and display together. -->
        <div class="mx-4 grid grid-cols-1 2xl:grid-cols-2 gap-6 items-stretch">
          <section class="shadow-xl bg-white rounded-lg p-4 min-w-0">
            <apexchart :key="chartKey" type="bar" height="400" width="100%" :options="priceChart.options"
              :series="priceChart.series">
            </apexchart>
          </section>

          <section class="shadow-xl bg-white rounded-lg p-4 min-w-0">
            <apexchart :key="`student-pie-${chartKey}`" type="pie" height="400" width="100%"
              :options="studentPieChart.options" :series="studentPieChart.series">
            </apexchart>
          </section>
        </div>

        <!-- Year Comparison Table -->
        <div class="mx-4 mt-8">
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4">Student Count by Year Comparison</h2>
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr class="bg-base-200">
                    <th class="text-left">Year</th>
                    <th class="text-center">Number of Students</th>
                    <th class="text-center">Percentage</th>
                    <th class="text-center">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(count, year) in yearComparison" :key="year" class="hover:bg-base-100">
                    <td class="font-semibold">{{ year }}</td>
                    <td class="text-center">
                      <span class="badge badge-lg" :class="count > 0 ? 'badge-primary' : 'badge-ghost'">
                        {{ count }}
                      </span>
                    </td>
                    <td class="text-center">
                      <span v-if="StudentLength > 0">{{ ((count / StudentLength) * 100).toFixed(1) }}%</span>
                      <span v-else>0%</span>
                    </td>
                    <td class="text-center">
                      <span v-if="getPreviousAvailableYear(year) === null">-</span>
                      <span v-else>
                        <span v-if="count > yearComparison[getPreviousAvailableYear(year)]" class="text-success font-semibold">
                          ↑ {{ count - yearComparison[getPreviousAvailableYear(year)] }}
                        </span>
                        <span v-else-if="count < yearComparison[getPreviousAvailableYear(year)]" class="text-error font-semibold">
                          ↓ {{ yearComparison[getPreviousAvailableYear(year)] - count }}
                        </span>
                        <span v-else class="text-warning font-semibold">→ 0</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="bg-base-200 font-bold">
                    <td>Total</td>
                    <td class="text-center">{{ StudentLength }}</td>
                    <td class="text-center">100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>


          </div>
        </div>
  </AdminLayout>
</template>
