# รายงานการตรวจสอบความปลอดภัย

## สรุป

ตรวจสอบโครงการ `vue-angkham-final` แบบวิเคราะห์โค้ด (static analysis) พบช่องโหว่ที่ยืนยันได้ 5 รายการ: ระดับสูง 4 รายการ และระดับปานกลาง 1 รายการ

| ระดับ | จำนวน |
| --- | ---: |
| สูง (High) | 4 |
| ปานกลาง (Medium) | 1 |

ขอบเขตที่ตรวจ: Vue frontend, Express/MySQL backend, Firebase rules และไฟล์ตั้งค่าแพ็กเกจที่เกี่ยวข้อง

## 1. API ฐานข้อมูลไม่มีการยืนยันสิทธิ์และเปิด CORS กว้าง

**ระดับ:** สูง  
**CWE:** CWE-306, CWE-862  
**ตำแหน่ง:** `src/stores/connectDB.js:6`, `src/stores/connectDB.js:32`

API CRUD ทุกเส้นทางทำงานโดยไม่มี middleware สำหรับยืนยันตัวตนหรือกำหนดสิทธิ์ ขณะเดียวกัน `cors()` อนุญาต origin โดยไม่มีการจำกัด ผู้โจมตีที่เข้าถึง service ได้จึงสามารถอ่าน เพิ่ม แก้ไข หรือลบข้อมูลในตารางที่อยู่ใน allow-list ได้ รวมถึงข้อมูลผู้ดูแล นักเรียน และการชำระเงิน

แนวทางแก้ไข:

- บังคับใช้การยืนยันตัวตนที่ backend สำหรับทุก route ที่ต้องป้องกัน
- ตรวจสอบ role และสิทธิ์ระดับทรัพยากรก่อนอ่านหรือเปลี่ยนข้อมูล
- จำกัด CORS เฉพาะ origin ของ frontend ที่ใช้งานจริง
- แทน generic CRUD API ด้วย endpoint ที่มีขอบเขตและสิทธิ์ชัดเจน

## 2. รหัสผ่านผู้ดูแลถูกเก็บและส่งแบบ plain text

**ระดับ:** สูง  
**CWE:** CWE-256, CWE-522  
**ตำแหน่ง:** `src/stores/connectDB.js:65`, `src/views/admin/Admin-Login.vue:21`

รหัสผ่านที่รับจาก client ถูกบันทึกลง `data_admin` โดยตรง จากนั้น frontend รับข้อมูลผู้ดูแลทั้งหมดและเปรียบเทียบรหัสผ่านในเบราว์เซอร์ ทำให้รหัสผ่านสามารถรั่วจาก API ฐานข้อมูล browser storage หรือ log ได้ และอาจถูกนำไปใช้ยึดบัญชีหรือโจมตีบัญชีอื่นที่ใช้รหัสผ่านซ้ำ

แนวทางแก้ไข:

- ย้ายกระบวนการ login ไปยัง backend
- เก็บรหัสผ่านด้วย Argon2id หรือ bcrypt พร้อม salt
- ห้ามส่ง password หรือ password hash ออกใน API รายการผู้ใช้
- เปลี่ยนรหัสผ่านที่มีอยู่ทั้งหมด และลบ log ที่อาจบันทึกรหัสผ่าน

## 3. SQL Injection ใน endpoint ลบข้อมูล

**ระดับ:** สูง  
**CWE:** CWE-89  
**ตำแหน่ง:** `src/stores/connectDB.js:169-178`

พารามิเตอร์ `DBid` จาก URL ถูกแทรกเข้า SQL โดยตรงในเงื่อนไข `WHERE` แม้ `id` จะถูก bind parameter อย่างปลอดภัย แต่ `DBid` ยังถูกตีความเป็นไวยากรณ์ SQL ได้ ผู้โจมตีจึงอาจเปลี่ยนเงื่อนไขการลบและลบข้อมูลหลายแถวหรือทั้งตารางที่อนุญาตได้

แนวทางแก้ไข:

- ลบ `DBid` ออกจาก URL
- กำหนด mapping ตารางต่อชื่อ primary key ที่ฝั่ง server เท่านั้น
- ใช้ SQL คงที่สำหรับแต่ละ resource และ bind เฉพาะค่า
- ตรวจสิทธิ์ก่อนทำการลบ และทดสอบว่าคำขอลบหนึ่งครั้งกระทบได้เพียงข้อมูลที่ได้รับอนุญาต

## 4. สิทธิ์ผู้ดูแลปลอมได้จากฝั่งเบราว์เซอร์

**ระดับ:** สูง  
**CWE:** CWE-798, CWE-602  
**ตำแหน่ง:** `src/views/admin/Admin-Login.vue:37`, `src/layouts/AdminLayout.vue:84`, `src/router/index.js:31`

frontend มี credential สำหรับ management ฝังไว้ (`M` / `1234`) และใช้ค่า `localStorage` ที่ผู้ใช้แก้ไขได้เป็นหลักฐานการ login และ permission นอกจากนี้ router ไม่มี navigation guard สำหรับ route `/admin/*` จึงสามารถปลอมสถานะหรือเปิดหน้าผู้ดูแลโดยตรงได้ การซ่อนเมนูไม่ใช่การควบคุมสิทธิ์

แนวทางแก้ไข:

- ลบ credential ที่ฝังใน source code ทันที
- ใช้ session cookie ที่เป็น `HttpOnly`, `Secure` และมีอายุสั้น หรือ token ที่ backend ตรวจสอบได้
- บังคับตรวจ role ทุกคำขอที่ backend
- เพิ่ม router guard เพื่อประสบการณ์ใช้งานที่ดี แต่ไม่ใช้เป็นกลไกความปลอดภัยหลัก

## 5. Stored XSS ในหน้ารายการชำระเงิน

**ระดับ:** ปานกลาง  
**CWE:** CWE-79  
**ตำแหน่ง:** `src/views/admin/Manage_Payment/payment/ListView.vue:58`, `src/views/admin/Manage_Payment/payment/ListView.vue:176`

ฟังก์ชันไฮไลต์คำค้นคืนข้อความจากฐานข้อมูลโดยไม่ escape HTML และ template นำผลไปแสดงด้วย `v-html` ผู้โจมตีที่บันทึก HTML ลงในฟิลด์ payment ได้ สามารถทำให้ markup ถูกตีความเมื่อผู้ดูแลเปิดหน้ารายการและค้นหาข้อมูล

แนวทางแก้ไข:

- เลิกใช้ `v-html` กับข้อมูลจากฐานข้อมูล
- สร้างการ highlight ด้วย text node และ `<mark>` ที่ Vue render ตามปกติ
- ตรวจสอบ/validate ข้อความที่รับจาก API ฝั่ง server
- ทดสอบด้วย payload HTML ว่าถูกแสดงเป็นข้อความ ไม่ใช่ DOM ที่ทำงานได้

## ข้อจำกัดของการตรวจ

- เป็นการตรวจโค้ดแบบ static analysis ไม่ได้รันแอปหรือยืนยันการเปิดเผย service ใน environment จริง
- ไม่ได้ตรวจ dependency เทียบกับฐานข้อมูล advisory ออนไลน์
- ไม่สามารถยืนยัน reverse proxy, database privileges, CSP และค่า Firebase ที่ deploy จริงได้

## ลำดับความสำคัญในการแก้

1. ปิดหรือจำกัด API ที่ไม่มี authentication และเพิ่ม authorization ที่ backend
2. ย้ายระบบ login ไป backend พร้อม hash และ rotate รหัสผ่าน
3. แก้ dynamic SQL ใน route ลบข้อมูล
4. ลบ credential ที่ hardcode และเลิกเชื่อถือ `localStorage` เป็นสิทธิ์
5. ถอด `v-html` ออกจากข้อมูล payment
