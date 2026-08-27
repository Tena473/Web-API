# รายงานผลการแก้ไขความปลอดภัย

## ผลลัพธ์

แก้ไขโค้ดสำหรับทั้ง 5 ช่องโหว่แล้ว และการตรวจระดับ unit test, syntax และ production build ผ่านทั้งหมด อย่างไรก็ตาม การยืนยันแบบ integration กับ MySQL และ browser session จริงยังรอการตั้งค่า environment จึงยังไม่ควรถือว่าการแก้ไขผ่านการตรวจครบถ้วนใน production

## สิ่งที่แก้ไข

### 1. API ไม่มีการยืนยันสิทธิ์

- เพิ่ม endpoint `POST /api/auth/login`, `POST /api/auth/logout` และ `GET /api/auth/me`
- ใช้ signed session token ใน cookie แบบ `HttpOnly`, `SameSite=Lax` และเพิ่ม `Secure` เมื่อเป็น production
- จำกัด CORS ให้ยอมรับเฉพาะ `FRONTEND_ORIGIN`
- บังคับ authorization ที่ backend สำหรับทุก resource ที่ไม่เป็น public
- กำหนดสิทธิ์ตาม role/permission: ผู้ใช้ทั่วไปอ่านสินค้าและสร้าง order ได้เท่านั้น; ส่วนข้อมูลผู้ดูแล นักเรียน การชำระเงิน สินค้า และรายงาน ต้องมีสิทธิ์ที่เกี่ยวข้อง

ไฟล์หลัก: `src/stores/connectDB.js`, `src/server/security.js`, `src/stores/auth.js`

### 2. Plaintext password และการ login ใน browser

- เปลี่ยนเป็นการ hash รหัสผ่านด้วย Node.js `scrypt` ก่อนบันทึกผู้ดูแลรายใหม่หรือเปลี่ยนรหัสผ่าน
- API รายการผู้ดูแลเลือกเฉพาะข้อมูลที่ปลอดภัยและไม่ส่ง field `password`
- ย้ายการตรวจ credential ไป backend
- ผู้ใช้เก่าที่มี password แบบเดิมจะถูก hash ในการ login สำเร็จครั้งแรก; ควรบังคับเปลี่ยนรหัสผ่านหลัง deploy
- ลบ credential `M` / `1234` ที่ฝังใน frontend และเลิกเชื่อถือ `localStorage` เป็น session หรือ permission

ไฟล์หลัก: `src/stores/connectDB.js`, `src/views/admin/Admin-Login.vue`, `src/layouts/AdminLayout.vue`

### 3. SQL injection ในการลบข้อมูล

- เปลี่ยน route จาก `/api/delete/:resourceName/:DBid/:id` เป็น `/api/delete/:resourceName/:id`
- กำหนดชื่อตารางและ primary key ด้วย mapping คงที่ที่ backend (`resources`) แทนการรับชื่อคอลัมน์จาก URL
- ค่า record id ยัง bind parameter ด้วย `?`

ไฟล์หลัก: `src/stores/connectDB.js`, `src/server/security.js`, `src/stores/admin/data-CRUD.js`, `src/views/admin/Mange_product/report.vue`

### 4. Client-side authorization ที่ปลอมได้

- เพิ่ม Pinia auth store ที่รับ user profile จาก backend เท่านั้น
- เพิ่ม router guard สำหรับ `/admin/*`
- เมนูผู้ดูแลใช้ user session ที่ backend ออกให้ แทน `localStorage`

ไฟล์หลัก: `src/stores/auth.js`, `src/router/index.js`, `src/layouts/AdminLayout.vue`, `src/main.js`

### 5. Stored XSS จาก payment search

- ลบ `v-html` และฟังก์ชันสร้าง HTML สำหรับ highlight
- เปลี่ยนกลับมา render ฟิลด์ payment ด้วย Vue interpolation ซึ่ง escape ข้อความโดยอัตโนมัติ

ไฟล์หลัก: `src/views/admin/Manage_Payment/payment/ListView.vue`

## การตรวจสอบที่ผ่าน

| คำสั่ง                                                         | ผล                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `node --test src/server/security.test.js`                      | ผ่าน 3 tests: token ปลอม/หมดอายุ, permission ตาม resource, password hashing |
| `node --check src/stores/connectDB.js`                         | ผ่าน                                                                        |
| `npm run build`                                                | ผ่าน                                                                        |
| `git diff --check`                                             | ผ่าน                                                                        |
| ค้นหา `v-html`, session flags เก่า, `DBid` และ route ลบแบบเดิม | ไม่พบใน `src`                                                               |

## สิ่งที่ต้องทำก่อน deploy

1. สร้าง `.env` จาก `.env.example` และตั้ง `AUTH_SESSION_SECRET` เป็นค่าแบบสุ่มอย่างน้อย 32 bytes
2. กำหนด `FRONTEND_ORIGIN`, ค่าฐานข้อมูล และ `VITE_API_BASE_URL` ให้ตรง environment
3. ถ้ายังไม่มี Super Admin ให้รัน `npm run bootstrap-admin` หนึ่งครั้ง; คำสั่งจะถาม username/password แบบไม่แสดงรหัสผ่าน และจะไม่สร้างบัญชีซ้ำเมื่อมี Super Admin แล้ว
4. ให้ผู้ดูแลทุกคน login เพื่อย้าย password แบบเดิมเป็น hash แล้วบังคับเปลี่ยนรหัสผ่านที่แข็งแรงอย่างน้อย 12 ตัวอักษร
5. ทดสอบกับ MySQL จริง: anonymous CRUD ต้องได้ `401`, ผู้ใช้ role ต่ำต้องได้ `403`, และ role ที่ได้รับสิทธิ์ต้องใช้งานตามปกติ
6. ตรวจ browser production ว่า cookie มี `Secure` และ CORS ปฏิเสธ origin อื่น

## ข้อจำกัด

ไม่มีฐานข้อมูล MySQL และค่า environment สำหรับรัน backend ใน workspace จึงยังไม่ได้ยืนยัน integration test ของ login, cookie, authorization และ migration กับข้อมูลจริง

## อัปเดต: Employee-only Order Flow

### สิ่งที่แก้ไขแล้ว

- เปลี่ยนหน้ารายการสินค้าและรายละเอียดสินค้าเป็น `/admin/orders` และ `/admin/orders/:id`
- `/` และ `/products/*` จะพาไปหน้า login แทน จึงไม่มีหน้าร้านสินค้าแบบ public
- เพิ่ม role `Employee` และ permission `create_orders` ในหน้าจัดการผู้ดูแล
- API อ่านสินค้าและสร้าง order ต้องมี session ที่ login แล้ว
- `Employee` ที่มี `create_orders` อ่านสินค้าและสร้าง order ได้ แต่ดูรายงานหรือลบ order ไม่ได้
- `view_product_report` อ่าน report ได้อย่างเดียว; การลบ order อนุญาตเฉพาะ `Super Admin`
- หน้า report ซ่อนปุ่ม Delete สำหรับผู้ที่ไม่ใช่ Super Admin และ backend ยังคงตอบ `403` แม้เรียก API ตรง
- เอา product cache ออกจาก `localStorage` และล้าง cache นักเรียน/การชำระเงิน/ผู้ดูแลเมื่อ logout หรือได้รับ `401`

### การตรวจสอบ

| คำสั่ง                                                                                         | ผล             |
| ---------------------------------------------------------------------------------------------- | -------------- |
| `node --test src/server/security.test.js src/stores/auth.test.js src/stores/connectDB.test.js` | ผ่าน 5/5 tests |
| `node --check src/server/security.js`                                                          | ผ่าน           |
| `node --check src/stores/auth.js`                                                              | ผ่าน           |
| `node --check src/router/index.js`                                                             | ผ่าน           |
| `git diff --check`                                                                             | ผ่าน           |
| `npm run build`                                                                                | ผ่าน           |

### พฤติกรรมที่ยืนยันด้วย test

```text
anonymous → อ่านสินค้า / สร้าง order = ไม่อนุญาต
Employee(create_orders) → อ่านสินค้า / สร้าง order = อนุญาต
Employee(create_orders) → อ่านรายงาน / ลบ order = ไม่อนุญาต
report viewer → อ่านรายงาน = อนุญาต
report viewer → ลบ order = ไม่อนุญาต
Super Admin → ทุก action = อนุญาต
```

### สิ่งที่ยังต้องทำก่อน deploy

- ทดสอบกับ MySQL และ browser จริงตาม role ข้างต้น
- เพิ่ม login rate limiting
- ทำ server-side session revocation เมื่อเปลี่ยน password/role/permission
- ย้าย Google Calendar API call ไป backend และ rotate Google API key ที่พบในไฟล์ tracked
- เลิกใช้ `localStorage` สำหรับ student/payment ระหว่าง session ด้วยการปรับหน้าที่พึ่งพา cache ให้โหลดข้อมูลผ่าน API ตามสิทธิ์

## อัปเดต: ปิดช่องโหว่ก่อน Deploy (24 สิงหาคม 2026)

### ผลลัพธ์

แก้ไขช่องโหว่ระดับกลาง 4 รายการจากการสแกนล่าสุดแล้ว โดยคงพฤติกรรม Employee-only order flow ไว้: `Employee` สร้าง order ได้ แต่ไม่มีสิทธิ์ดู Calendar, ข้อมูลนักเรียน/การชำระเงิน, รายงานยอดขาย หรือการลบ order

### สิ่งที่แก้ไข

1. **Calendar และ route authorization**
   - เพิ่ม `meta.permission` ให้ทุก route ภายใต้ `/admin` และ dashboard ต้องมีทั้ง `manage_students` กับ `manage_payments`
   - เพิ่ม API `GET /api/calendar/events` ที่ backend ตรวจ `view_calendar` ก่อนเรียก Google Calendar
   - หน้า Calendar เรียก backend API แทน Google โดยตรง และรับเฉพาะข้อมูล event ที่จำเป็นต่อการแสดงผล
   - ย้ายตัวแปร Google Calendar เป็น backend-only (`GOOGLE_*` ไม่ใช่ `VITE_*`)

2. **PII ค้างเมื่อเปลี่ยนบัญชี**
   - `data-CRUD` ไม่บันทึกข้อมูลใดลง `localStorage` แล้ว และเก็บแยกตาม resource ใน Pinia memory เท่านั้น
   - ก่อน login ใหม่, ตอน logout, และเมื่อ `/api/auth/me` ได้ `401` จะ reset sensitive store และลบ legacy cache keys
   - หน้า student, payment, dashboard และ product ที่เคยอ่าน `localStorage` เปลี่ยนไปอ่าน in-memory store ที่ได้จาก API ตามสิทธิ์
   - การโหลด API ล้มเหลวจะล้าง state ก่อน จึงไม่ render ข้อมูลจากบัญชีเดิม

3. **Session revocation**
   - เพิ่ม session ID แบบสุ่มใน signed cookie แต่ไม่ฝัง role/permission ไว้ใน token อีกต่อไป
   - ทุก request ตรวจ `admin_sessions` join กับ `data_admin` จึงใช้ role/permission ล่าสุดจาก MySQL
   - logout revoke session ปัจจุบัน; แก้ไขหรือลบบัญชี revoke ทุก session ของบัญชีนั้น
   - เพิ่ม migration `npm run migrate-security` เพื่อสร้างตาราง `admin_sessions` และ index ที่จำเป็น

4. **Login rate limiting**
   - จำกัดการ login ผิดที่ 5 ครั้งต่อ username ใน 15 นาที และ 30 ครั้งต่อ IP ใน 15 นาที
   - เกินกำหนดตอบ `429` พร้อม `Retry-After`
   - ใช้ IP จาก TCP socket โดยไม่เชื่อ header ที่ปลอมได้

### การตรวจสอบที่ผ่าน

| รายการ                                                                                         | ผล                                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `npm run migrate-security` กับ MySQL local                                                     | ผ่าน — สร้าง/ตรวจ schema `admin_sessions` สำเร็จ |
| `curl http://127.0.0.1:3000/api/get/data_product` โดยไม่มี cookie                              | ได้ `401 Authentication required`                |
| `node --test src/server/security.test.js src/stores/connectDB.test.js src/stores/auth.test.js` | ผ่าน 9/9 tests                                   |
| `node --check src/server/security.js` และ `node --check src/stores/connectDB.js`               | ผ่าน                                             |
| `npm run build`                                                                                | ผ่าน                                             |
| `git diff --check`                                                                             | ผ่าน                                             |

### การทดสอบที่เพิ่ม

- session ที่ถูก revoke หลัง logout ใช้ `/api/auth/me` ต่อไม่ได้
- Employee ถูกปฏิเสธจาก calendar API (`403`) ขณะที่ role ที่มี `view_calendar` ใช้งานได้
- login ผิดครบ limit แล้ว endpoint ตอบ `429`
- เปลี่ยน principal ตอน login แล้ว Pinia sensitive state ถูก reset

### ขั้นตอนจำเป็นก่อน Production Deploy

1. ใส่ `GOOGLE_CALENDAR_API_KEY`, `GOOGLE_CALENDAR_ID` และ timezone ใน `.env` ฝั่ง backend; ลบ/ไม่ใช้ค่า `VITE_GOOGLE_CALENDAR_*`
2. หมุน Google API key เดิม และจำกัด key ใหม่ให้เรียกได้เฉพาะ Google Calendar API ตาม policy ขององค์กร
3. หากรัน backend มากกว่า 1 instance ให้เปลี่ยน login-rate-limit store จาก memory เป็น Redis หรือ shared store ก่อน deploy เพราะ memory limit นับแยกแต่ละ instance
4. ทดสอบด้วยบัญชีจริง: Employee, Admin ที่มีสิทธิ์แต่ละแบบ และ Super Admin รวมทั้งยืนยันว่า role ต่ำได้ `403` และ role ที่ได้รับสิทธิ์ใช้งานได้

## อัปเดต: แก้ไขผลสแกนก่อน Deploy รอบล่าสุด (24 สิงหาคม 2026)

### ผลลัพธ์: แก้ไขแล้ว

แก้ไขข้อค้นพบทั้งหมด 5 รายการจากรายงาน Codex Security: ระดับกลาง 4 รายการ และระดับต่ำ 1 รายการ โดยไม่เปลี่ยนสิทธิ์เดิมของ Employee หรือการตรวจ session จาก MySQL

### รายการที่แก้ไข

1. **บังคับ Secure cookie สำหรับ production**
   - เพิ่ม `getRuntimeSecurityConfig()` ใน backend
   - local HTTP อนุญาตเฉพาะ `NODE_ENV=development` และ origin loopback (`localhost`, `127.0.0.1`, `::1`)
   - deployment อื่นต้องใช้ `NODE_ENV=production`, `FRONTEND_ORIGIN` ที่เป็น `https://...` และ cookie จะมี `Secure` เสมอ
   - เพิ่ม `NODE_ENV=development` ใน `.env.example` และ `.env` ของเครื่อง local นี้

2. **ปิด race condition ของ login rate limit**
   - เปลี่ยนจาก check แล้วค่อยบันทึก failure เป็น `reserve()` ที่จอง quota ก่อน query MySQL หรือ hash password
   - คำขอ login ที่มาพร้อมกันจึงไม่สามารถเห็น quota ว่างชุดเดียวกันได้

3. **ไม่ล้าง IP rate limit ของบัญชีอื่น**
   - login สำเร็จล้างเฉพาะ counter ของ username/IP ที่ยืนยันสำเร็จ
   - counter รวมของ IP ยังคงเก็บ failure ของ username อื่นไว้

4. **ลดการล็อกบัญชีจากผู้โจมตี**
   - เปลี่ยน counter account จาก global username เป็นคู่ `username + source IP`
   - การเดารหัสจาก IP หนึ่งจะไม่ทำให้ผู้ใช้ชื่อเดียวกันที่ login จาก IP อื่นถูก 429
   - ยังคงมี IP-wide limit สำหรับกัน credential stuffing

5. **ลบข้อมูลสำคัญจาก browser console**
   - ลบ log ของ CRUD responses, student/payment records, administrator form และ password plaintext
   - ลบ log ในหน้าจัดการ student, payment, admin, report, calendar และ product ที่อาจทำให้ Axios error หรือข้อมูลฟอร์มค้างใน DevTools

### การทดสอบและการยืนยัน

| คำสั่ง / การทดสอบ | ผล |
| --- | --- |
| `node --test src/server/security.test.js src/stores/connectDB.test.js src/stores/auth.test.js` | ผ่าน 12/12 tests |
| `npm run build` | ผ่าน |
| test production config | ปฏิเสธ config ที่ไม่มี `NODE_ENV`; ปฏิเสธ production ที่ใช้ HTTP; ยอมรับ HTTPS พร้อม secure cookie |
| test parallel login | คำขอพร้อมกันได้ผล `401` และ `429` จึงไม่ผ่าน rate limit พร้อมกันทั้งคู่ |
| test rate-limit cleanup | login สำเร็จไม่ล้าง failure ของ username อื่นใน IP เดียวกัน |
| `rg` ตรวจ console ใน frontend | ไม่พบ browser console logging ที่ทำงานจริงเหลืออยู่ |
| `git diff --check` | ผ่าน (มีเพียงคำเตือน CRLF ของ Git) |

### สิ่งที่ต้องตั้งค่าก่อน Production Deploy

```env
NODE_ENV=production
FRONTEND_ORIGIN=https://your-frontend.example
VITE_API_BASE_URL=https://your-api.example
```

ให้ใช้งานผ่าน HTTPS ทั้ง frontend และ backend เท่านั้น หากตั้งค่าข้างต้นไม่ครบ backend จะหยุดเริ่มทำงานโดยเจตนา เพื่อป้องกันการออก session cookie แบบไม่ปลอดภัย

### ข้อจำกัดที่ยังเหลือ

- rate limit ปัจจุบันเป็น memory ภายใน process เดียว; หาก production รันหลาย backend instances ต้องเปลี่ยนไปใช้ Redis/shared atomic store เพื่อให้ limit ใช้ร่วมกันทุก instance
- การทดสอบในรอบนี้เป็น unit/HTTP test ด้วย database จำลองและ production build; ควรทดสอบ MySQL, HTTPS proxy และ browser จริงก่อนเปิดใช้งาน

## อัปเดต: จำกัด Dashboard Student เฉพาะ Super Admin (24 สิงหาคม 2026)

- route `/admin/dashboard/db-student` ใช้ `meta.superAdminOnly` แล้ว
- router guard ตรวจ `role === 'Super Admin'` โดยตรง; role `Admin` จะถูกส่งไปหน้า login แม้มี permission `super_admin` ที่ตั้งค่าไม่ถูกต้อง
- เมนู Dashboard Student ถูกซ่อนสำหรับ Admin และแสดงเฉพาะ Super Admin
- ไม่ได้ตัดสิทธิ์ `manage_students` หรือ `manage_payments` ของ Admin เพราะสองสิทธิ์ยังจำเป็นต่อหน้าจัดการข้อมูลตามปกติ และ Dashboard ไม่มี backend endpoint เฉพาะ

การยืนยัน: เพิ่ม test ว่า `Admin` ไม่ถูกมองเป็น Super Admin แม้มี permission `super_admin`; test รวมผ่าน 13/13 และ `npm run build` ผ่าน

## อัปเดต: แก้ไขผลสแกน Codex Security รอบ session และ login (24 สิงหาคม 2026)

### ผลลัพธ์: แก้ไขแล้ว

แก้ไขข้อค้นพบจาก scan `c7c26813-005f-447d-b005-3bbedd25591e` ทั้ง 3 ข้อที่เส้นทาง `POST /api/auth/login` โดยรักษาผลลัพธ์เดิมสำหรับผู้ใช้ปกติ: login ถูกต้องยังได้ session, login ผิดยังได้ `401`, และเมื่อเกิน limit ได้ `429` พร้อม `Retry-After`.

1. **ป้องกัน session rows โตไม่จำกัด**
   - จำกัด active session ต่อบัญชีไว้ที่ **5**
   - ก่อนสร้าง session ใหม่ ลบ session ที่หมดอายุ/ถูก revoke ของบัญชีนั้น และ revoke session ที่เก่าที่สุดเท่าที่จำเป็นภายใน MySQL transaction แล้วจึง insert session ใหม่
   - จึง login ซ้ำไม่สามารถทำให้ active session หรือข้อมูล session สะสมไม่สิ้นสุดได้

2. **ทำ rate limit ให้ใช้ร่วมกันทุก backend instance**
   - เพิ่มตาราง MySQL `auth_login_rate_limits` และ migration/index สำหรับลบข้อมูลหมดอายุ
   - ใช้ transaction, row lock และ bucket 3 มิติ: username รวมทุก IP, username+IP และ IP รวม
   - จึงไม่สามารถสลับ IP หรือสลับ backend instance เพื่อได้ quota 5 ครั้งต่อเครื่องอีกต่อไป
   - key ในตารางเป็น SHA-256 hash ของค่า rate-limit ไม่เก็บ username/IP ดิบ

3. **ลด username timing oracle**
   - ทุก attempt ที่ไม่มี password hash scrypt ที่ถูกต้อง—including username ที่ไม่มีจริง และ legacy password—จะรัน scrypt ด้วย dummy hash ก่อนตอบ `401`
   - เพิ่ม `isScryptHash()` เพื่อตรวจรูปแบบ salt/hash ให้ถูกต้อง; record ที่ขึ้นต้น `scrypt$` แต่เสียรูปแบบจะไม่ถูกตีความเป็น legacy password

4. **ความสอดคล้องของเวลา**
   - ตั้ง mysql2 connection เป็น UTC (`timezone: 'Z'`) เพราะ policy session/rate-limit เปรียบเทียบกับ `UTC_TIMESTAMP()` ใน MySQL

### ไฟล์ที่แก้

- `src/stores/connectDB.js`
- `src/server/security.js`
- `scripts/migrate-security.js`
- `src/stores/connectDB.test.js`

### การตรวจสอบที่ผ่าน

| คำสั่ง / กรณีทดสอบ | ผล |
| --- | --- |
| `npm run migrate-security` กับ MySQL local | ผ่าน — สร้าง `auth_login_rate_limits` และ cleanup schema สำเร็จ |
| `node --test src/server/security.test.js src/stores/connectDB.test.js src/stores/auth.test.js` | ผ่าน 15/15 |
| shared limiter: instance/IP ต่างกันเดาบัญชีเดียวกัน | ครั้งที่ 3 ถูกบล็อกตาม account-wide limit |
| MySQL จริง: สลับ login ผิดระหว่าง backend ports 3001/3002 | `401,401,401,401,401,429` — quota ใช้ร่วมกันจริง |
| login ถูกต้อง 7 ครั้ง | เหลือ active session 5 รายการ |
| API จริง `GET /api/get/data_product` ไม่มี cookie | `401` |
| API จริง login ด้วย username ที่ไม่มี | `401` หลังผ่านเส้นทาง dummy scrypt |
| `node --check` และ `git diff --check` | ผ่าน |

### ข้อควรรู้ก่อน Deploy

- ต้องรัน `npm run migrate-security` ในฐานข้อมูลของแต่ละ environment ก่อน deploy backend เวอร์ชันนี้
- บัญชี database ที่ใช้รัน migration ต้องมีสิทธิ์สร้าง/แก้ตาราง `auth_login_rate_limits`; หลังจากนั้นบัญชี runtime ต้องอ่าน/เขียนสองตาราง security ได้
- session ที่เกิน 5 เครื่องจะทำให้ session ที่เก่าที่สุดถูก revoke; ผู้ใช้เครื่องนั้นต้อง login ใหม่ เป็นพฤติกรรมที่ตั้งใจไว้เพื่อจำกัดความเสียหายหาก cookie รั่ว
