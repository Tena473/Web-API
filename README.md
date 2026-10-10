# Angkham Web + API

ระบบ Backoffice สำหรับจัดการนักเรียน คอร์สและการชำระเงิน สินค้า คำสั่งซื้อ และรายงาน รวมหน้าเว็บ Vue และ Express API ในโปรเจกต์เดียว โดยใช้ MySQL เป็นฐานข้อมูล

## ความสามารถหลัก

- จัดการนักเรียน ข้อมูลติดต่อ และข้อมูลอาการหรือข้อจำกัดด้านสุขภาพ
- บันทึกการชำระเงิน คอร์ส ระดับ ช่วงวันที่เรียน จำนวนสัปดาห์ และส่วนลด
- จัดการสินค้า หมวดหมู่ ราคา คำอธิบาย และรูปภาพผ่าน URL
- เลือกสินค้าและยืนยันสร้างคำสั่งซื้อสำหรับผู้ใช้ที่ได้รับสิทธิ์
- ดูรายงานคำสั่งซื้อ กรองตามสินค้าและวันที่ พร้อมสรุปจำนวนและยอดขาย
- ดู Dashboard นักเรียนเป็นกราฟรายปี/รายเดือน และส่งออก PDF หรือ CSV
- ดู Google Calendar และวันหยุดลาว/สหรัฐฯ
- จัดการบัญชีและสิทธิ์ของ Super Admin, Admin และ Employee

คำสั่งซื้อเป็นการบันทึกข้อมูลการขายในระบบ ยังไม่มีการเชื่อม Payment Gateway เพื่อเรียกเก็บเงินออนไลน์

## เทคโนโลยีและการทำงาน

| ส่วน | เทคโนโลยี |
|---|---|
| หน้าเว็บ | Vue 3, Vue Router 4, Pinia 2, Axios |
| Build และ Development Server | Vite 6 |
| UI | Tailwind CSS 3, DaisyUI 4 |
| กราฟและรายงาน | ApexCharts, jsPDF, jspdf-autotable |
| API | Node.js, Express 5, mysql2, cors |
| ฐานข้อมูล | MySQL |
| Authentication | scrypt password hash, Session ใน MySQL และ Cookie แบบ HttpOnly |

หน้าเว็บเรียก `/api` ผ่าน Axios ส่วน API ตรวจ Session และสิทธิ์ก่อนอ่านหรือเขียนฐานข้อมูล

- **Development:** Vite ใช้พอร์ต `7000` และ Proxy `/api` ไป Express ที่พอร์ต `3000`
- **Production:** Express ให้บริการทั้งไฟล์เว็บใน `dist/` และ `/api` จาก Origin เดียวกัน

## โครงสร้างโปรเจกต์

```text
scripts/
  bootstrap-super-admin.js       # สร้าง Super Admin คนแรก
  migrate-security.js            # เตรียมตาราง Session และ Login Rate Limit
src/
  main.js                        # เริ่ม Vue App และตั้งค่า Axios
  App.vue                        # RouterView และ Toast กลาง
  style.css                      # Tailwind CSS
  components/                    # ตาราง กล่องยืนยันลบ และไอคอน
  layouts/AdminLayout.vue        # Layout และเมนูตามสิทธิ์
  router/index.js                # Routes และ Navigation Guard
  server/                        # Environment, Password และ Session Helpers
  stores/
    auth.js                      # State ผู้ใช้และ Login/Logout
    event.js                     # ข้อความแจ้งเตือน
    connectDB.js                  # Express Server และ API หลัก
    admin/data-CRUD.js            # Store สำหรับจัดการข้อมูลหลังบ้าน
    user/product.js              # Store สินค้าและการสร้าง Order
  views/
    admin/                       # Login, Calendar, Dashboard และหน้าจัดการข้อมูล
    user/                        # หน้าสินค้าและยืนยัน Order ภายในระบบ
public/                          # Static Assets
functions/                       # Firebase Functions Template เดิม
.env.example                     # ตัวอย่าง Environment Variables
vite.config.js                   # Alias, พอร์ต และ Development Proxy
```

`src/stores/connectDB.js` เป็นโค้ดฝั่ง Node.js แม้อยู่ในโฟลเดอร์ `stores` ส่วนไฟล์ใน `views/user` ใช้กับเส้นทาง `/admin/orders` ที่ต้องล็อกอิน ปัจจุบันไม่พบการเรียก Firebase ในโค้ด `src`

## เตรียมระบบเพื่อพัฒนา

### 1. สิ่งที่ต้องมี

- Node.js และ npm โดย Vite 6.2.6 ในโปรเจกต์รองรับ Node.js ตามช่วง `^18.0.0 || ^20.0.0 || >=22.0.0`
- MySQL ที่เข้าถึงได้ และฐานข้อมูลที่มีตารางธุรกิจตรงกับ API
- Terminal แบบโต้ตอบได้สำหรับสร้างบัญชี Super Admin

รันคำสั่งจากโฟลเดอร์หลักของโปรเจกต์ เพื่อให้ API และสคริปต์อ่าน `.env` ได้ถูกตำแหน่ง

### 2. ติดตั้ง Dependencies และตั้งค่า Environment

```sh
npm ci
```

คัดลอก `.env.example` เป็น `.env` เช่น ใน PowerShell:

```powershell
Copy-Item .env.example .env
```

ตั้งค่า MySQL ใน `.env` แล้วสร้างค่า Session Secret:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

นำค่าที่ได้ไปใส่ `AUTH_SESSION_SECRET` และใช้ค่าที่ต่างกันสำหรับแต่ละ Environment

| ตัวแปร | หน้าที่ / ค่า Development |
|---|---|
| `AUTH_SESSION_SECRET` | Secret สำหรับลงลายเซ็น Session Token; ต้องกำหนดก่อนเริ่ม API |
| `NODE_ENV` | `development` สำหรับ Local HTTP หรือ `production` สำหรับระบบที่เผยแพร่ |
| `FRONTEND_ORIGIN` | Origin ที่ API อนุญาต เช่น `http://localhost:7000`; Production ต้องเริ่มด้วย `https://` |
| `DB_HOST` | Host ของ MySQL; ค่าเริ่มต้น `localhost` |
| `DB_USER` | ผู้ใช้ MySQL; ค่าเริ่มต้น `root` |
| `DB_PASSWORD` | รหัสผ่าน MySQL |
| `DB_NAME` | ชื่อฐานข้อมูล; ค่าเริ่มต้น `angkham-final` |
| `PORT` | พอร์ต Express; ค่าเริ่มต้น `3000` |
| `VITE_API_BASE_URL` | เว้นว่างเพื่อใช้ Origin เดียวกันและ Development Proxy |

ตัวแปรที่ขึ้นต้นด้วย `VITE_` ใช้ในหน้าเว็บ จึงควรมีเฉพาะค่าที่เปิดเผยได้ เช่น API Base URL ส่วน Session Secret และข้อมูลฐานข้อมูลเป็นค่าฝั่ง Backend

หากเปลี่ยนพอร์ต API จาก `3000` ต้องปรับ Proxy ใน `vite.config.js` ให้ตรงกันด้วย

### 3. เตรียมฐานข้อมูล

Working tree ปัจจุบันไม่มีไฟล์ SQL สำหรับสร้างตารางธุรกิจครบชุด ต้องเตรียมฐานข้อมูลจาก Schema หรือ Backup ที่ตรงกับ API ก่อนรัน Migration และ Bootstrap

คอลัมน์ที่ API ปัจจุบันใช้งานมีดังนี้:

| ตาราง | คอลัมน์ที่ใช้ |
|---|---|
| `data_admin` | `admin_id`, `admin_name`, `password`, `role`, `permissions`, `updatedAt` |
| `data_student` | `student_id`, `fullname`, `age`, `gender`, `phone`, `symptom`, `otherSymptom`, `updatedAt` |
| `data_payment` | `payment_id`, `student_id`, `course`, `level`, `payment_date`, `start_study`, `end_study`, `time_study`, `no_of_weeks`, `usd`, `discount`, `place` |
| `data_product` | `product_id`, `product_name`, `category`, `price`, `image_url`, `description`, `updatedAt` |
| `data_order` | `order_id`, `product_id`, `product_name`, `category`, `quantity`, `price`, `total`, `order_date` |

ตารางนี้เป็นรายการคอลัมน์จากโค้ด ไม่ใช่ DDL ที่กำหนดชนิดข้อมูลและ Constraint ครบถ้วน โดย `password` ต้องรองรับ scrypt hash และ `total` ของ Order ต้องรองรับค่าที่ API ส่งมาใน INSERT

เมื่อตารางธุรกิจพร้อมแล้ว ให้รัน:

```sh
npm run migrate-security
npm run bootstrap-admin
```

- `migrate-security` สร้าง `admin_sessions` และ `auth_login_rate_limits` พร้อมลบรายการความปลอดภัยที่หมดอายุ ต้องมี `data_admin.admin_id` ที่เข้ากันได้กับ Foreign Key ชนิด `INT` ของ Migration
- `bootstrap-admin` ขอชื่อผู้ใช้และรหัสผ่านอย่างน้อย 12 ตัวอักษร แล้วสร้าง Super Admin คนแรก หากมี Super Admin อยู่แล้วจะปฏิเสธการสร้างเพิ่ม
- ทั้งสองคำสั่งเปลี่ยนข้อมูลในฐานข้อมูลที่ระบุใน Environment

### 4. รันหน้าเว็บและ API

เปิด Terminal สองหน้าต่าง:

```sh
# Terminal 1: Express API
npm run dev:api
```

```sh
# Terminal 2: Vue Development Server
npm run dev
```

เปิดหน้า Login ที่ `http://localhost:7000/admin/login` และตรวจ API ที่ `http://localhost:3000/api/health`

Health Endpoint ตอบว่า Backend ทำงานอยู่ แต่ไม่ได้ตรวจการเชื่อมต่อ MySQL

## บทบาทและสิทธิ์

| บทบาท | การใช้งาน |
|---|---|
| Super Admin | เข้าถึงทุกสิทธิ์ รวมจัดการบัญชี Dashboard และลบ Order |
| Admin | ใช้งานตาม Permission ที่ Super Admin กำหนด |
| Employee | API กำหนดสิทธิ์บัญชีที่สร้าง/แก้ไขเป็น `create_orders` สำหรับดูสินค้าและสร้าง Order |

| Permission | หน้าที่ |
|---|---|
| `view_calendar` | ดูปฏิทิน |
| `manage_students` | จัดการนักเรียน |
| `manage_payments` | จัดการการชำระเงิน |
| `manage_products` | จัดการสินค้า |
| `view_product_report` | อ่าน Order และดูรายงานยอดขาย |
| `create_orders` | อ่านสินค้าและสร้าง Order |

หน้า Payment โหลดข้อมูลนักเรียนด้วย ผู้ใช้ที่จะใช้งานครบควรมีทั้ง `manage_payments` และ `manage_students`

ระบบตรวจสิทธิ์ทั้ง Router/เมนู และ API Session Cookie มีอายุ 8 ชั่วโมง ใช้ `HttpOnly`, `SameSite=Lax` และเพิ่ม `Secure` ใน Production โดยเก็บ Session และตัวนับ Login Rate Limit ใน MySQL

หลัง Login หน้าเว็บส่ง Employee ไปหน้า Orders และส่งบทบาทอื่นไปหน้านักเรียน Admin ที่ไม่มี `manage_students` จะถูก Router ปฏิเสธการเข้าหน้านั้นตามพฤติกรรมปัจจุบัน

## Google Calendar

ตั้งค่าฝั่ง Backend ใน `.env`:

| ตัวแปร | หน้าที่ |
|---|---|
| `GOOGLE_CALENDAR_API_KEY` | API Key สำหรับอ่าน Google Calendar |
| `GOOGLE_CALENDAR_ID` | ID ปฏิทินหลัก; หากไม่กำหนดจะโหลดเฉพาะปฏิทินวันหยุด |
| `GOOGLE_CALENDAR_TIME_ZONE` | เขตเวลา; ค่าเริ่มต้น `Asia/Vientiane` |
| `LAOS_HOLIDAY_CALENDAR_ID` | ปฏิทินวันหยุดลาว ตามค่าใน `.env.example` |
| `US_HOLIDAY_CALENDAR_ID` | ปฏิทินวันหยุดสหรัฐฯ ตามค่าใน `.env.example` |

Calendar API ต้องเข้าถึงปฏิทินนั้นได้ด้วย API Key ที่ตั้งไว้ การเชื่อมต่อปัจจุบันเป็นการอ่านกิจกรรม ไม่มี OAuth สำหรับเข้าถึงปฏิทินส่วนตัว หากไม่มี API Key Endpoint จะตอบ `503 Calendar is not configured` สำหรับคำขอที่ผ่านการตรวจสิทธิ์และช่วงวันที่แล้ว

## คำสั่งที่มีในโปรเจกต์

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev` | รัน Vite สำหรับพัฒนาหน้าเว็บ |
| `npm run dev:api` | รัน API ด้วย nodemon |
| `npm run build` | Build หน้าเว็บไปยัง `dist/` |
| `npm run preview` | Preview เว็บที่ Build แล้ว; ไม่ได้เริ่ม Express API และไม่มี Proxy `/api` ที่ตั้งไว้สำหรับ Preview |
| `npm start` | รัน Express และให้บริการ `dist/` หากมี |
| `npm run DB` | รัน Express เช่นเดียวกับ `npm start` |
| `npm run migrate-security` | เตรียมตาราง Session และ Login Rate Limit |
| `npm run bootstrap-admin` | สร้างบัญชี Super Admin คนแรก |

## การทดสอบ

โปรเจกต์ใช้ `node:test` และยังไม่มี Script ชื่อ `test` ใน `package.json` รันชุดทดสอบด้วย:

```sh
node --test src/server/security.test.js src/stores/connectDB.test.js src/stores/auth.test.js
```

ชุดทดสอบครอบคลุม Password Hash, Session Token, Permission, Session/Logout, Auth Store, Calendar Authorization และ Login Rate Limit โดยใช้ฐานข้อมูลและบริการภายนอกจำลอง

ตรวจว่า Vue Build ได้ด้วย:

```sh
npm run build
```

การทดสอบเหล่านี้ไม่ได้ยืนยันการใช้งานทุกหน้ากับ MySQL, Google Calendar และ HTTPS จริง

## Deployment แบบ Web + API บน Railway

รูปแบบที่โปรเจกต์รองรับคือหนึ่ง Application Service สำหรับเว็บและ API โดยมี MySQL แยกเป็นบริการฐานข้อมูล

1. ตั้ง Environment: `NODE_ENV=production`, `AUTH_SESSION_SECRET`, `FRONTEND_ORIGIN=https://<โดเมนแอป>` และข้อมูล MySQL
2. เว้น `VITE_API_BASE_URL` ว่างเพื่อให้หน้าเว็บเรียก API จาก Origin เดียวกัน
3. เตรียมตารางธุรกิจ แล้วรัน `npm run migrate-security` กับฐานข้อมูลของ Environment นั้นก่อนเริ่มใช้งาน Backend
4. หากยังไม่มี Super Admin ให้รัน Bootstrap ผ่าน Terminal ที่เชื่อมฐานข้อมูลนั้นได้
5. ตั้ง Build Command เป็น `npm run build` และ Start Command เป็น `npm start`
6. ให้ Application Service รับทราฟฟิกที่พอร์ตจาก Environment `PORT`

Express ให้บริการไฟล์เว็บใน `dist/` พร้อม SPA Fallback และ API ภายใต้ `/api` โดย Production ใช้ HTTPS เพื่อรองรับ Secure Session Cookie

## ข้อสังเกตสำหรับพัฒนาต่อ

- `FRONTEND_ORIGIN` ต้องตรงกับ Origin ที่ใช้งานจริง เช่น `localhost` และ `127.0.0.1` เป็นคนละค่า
- Dashboard จัดกลุ่มนักเรียนตาม `updatedAt` จึงต้องพิจารณาความหมายของวันที่นี้เมื่อตีความสถิติ
- ปุ่มส่งออก Excel ใน Dashboard สร้างไฟล์ `.csv`
- หน้าแก้ไขข้อมูลหลายหน้าใช้ Route Parameter เป็นตำแหน่งใน Array ส่วนหน้าสินค้าสำหรับ Order ใช้ `product_id` จริง
- หน้า Student อ่านประวัติ Payment จาก State ที่โหลดไว้แล้ว จึงอาจไม่มีข้อมูล Payment เมื่อเปิดหน้านี้เป็นหน้าแรก

## เอกสารเพิ่มเติม

- [รายงานหน้าที่ของไฟล์ใน scripts และ src](FILE-REPORT-scripts-src.th.md)
- [รายงานการตรวจสอบความปลอดภัยเดิม](SECURITY-REPORT.th.md)
- [รายงานการแก้ไขความปลอดภัยและการทดสอบย้อนหลัง](SECURITY-FIX-REPORT.th.md)

รายงานความปลอดภัยบันทึกสถานะในแต่ละช่วงเวลา ส่วน README นี้อธิบายโครงสร้างและวิธีใช้งานตามโค้ดปัจจุบัน
