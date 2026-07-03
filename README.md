# 💰 LINE Finance Tracker — ระบบบันทึกการเงินส่วนตัวผ่าน LINE

ระบบบันทึกรายรับ-รายจ่ายส่วนตัว ใช้งานผ่าน LINE ได้ทุกวัน พร้อม Web Dashboard สำหรับดูสรุปรายงาน

## ✨ ฟีเจอร์

### 💬 บันทึกผ่าน LINE
พิมพ์ข้อความในแชท LINE แล้วระบบบันทึกให้อัตโนมัติ:

| คำสั่ง | ตัวอย่าง | ผลลัพธ์ |
|--------|---------|---------|
| **จ่าย** | `จ่าย ข้าวเที่ยง 80` | บันทึกรายจ่าย ฿80 หมวดอาหาร🍜 |
| **รับ** | `รับ เงินเดือน 15000` | บันทึกรายรับ ฿15,000 |
| **สรุป** | `สรุป` | สรุปรายรับ-รายจ่ายวันนี้ |
| **สรุปเดือน** | `สรุปเดือน` | สรุปรายรับ-รายจ่ายเดือนนี้ |
| **สรุปสัปดาห์** | `สรุปสัปดาห์` | สรุปรายรับ-รายจ่ายสัปดาห์นี้ |
| **ลบล่าสุด** | `ลบล่าสุด` | ลบรายการล่าสุด |
| **หมวดหมู่** | `หมวดหมู่` | ดูหมวดหมู่ทั้งหมด |
| **ช่วยเหลือ** | `ช่วยเหลือ` หรือ `help` | ดูวิธีใช้งาน |

### 🔔 แจ้งเตือนอัตโนมัติ
- 🌅 **07:00** — เตือนบันทึกรายจ่ายวันนี้
- 🌙 **21:00** — สรุปรายจ่ายวันนี้
- 📊 **วันที่ 1 ของเดือน** — สรุปรายรับ-รายจ่ายเดือนที่แล้ว

### 📊 Web Dashboard
- กราฟรายรับ-รายจ่าย 7 วันล่าสุด
- กราฟสัดส่วนหมวดหมู่
- เพิ่ม/ลบรายการจากหน้าเว็บ
- สรุปรายเดือน
- ดีไซน์ Premium Dark Theme + Glassmorphism

### 🏷️ หมวดหมู่อัตโนมัติ
ระบบจัดหมวดหมู่อัตโนมัติจากคีย์เวิร์ด 100+ คำ:

| หมวดหมู่ | ตัวอย่างคีย์เวิร์ด |
|----------|------------------|
| 🍜 อาหาร | ข้าว, กาแฟ, ชา, ขนม, มาม่า, ส้มตำ |
| 🚗 เดินทาง | แท็กซี่, BTS, MRT, น้ำมัน, Grab |
| 📱 ค่าบริการ | เน็ต, ค่าไฟ, ค่าน้ำ, Netflix |
| 🛒 ช้อปปิ้ง | เสื้อ, กางเกง, รองเท้า |
| 💊 สุขภาพ | ยา, หมอ, โรงพยาบาล |
| 🎮 บันเทิง | หนัง, เกม, คอนเสิร์ต |
| 📚 การศึกษา | หนังสือ, คอร์ส, เรียน |

---

## 🚀 วิธีติดตั้ง

### 1. ติดตั้ง Dependencies
```bash
cd C:\Users\Administrator\Desktop\line
npm install
```

### 2. ตั้งค่า LINE Bot

#### สร้าง LINE Messaging API Channel
1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Provider ใหม่ (หรือใช้ที่มีอยู่)
3. สร้าง **Messaging API Channel**
4. คัดลอก **Channel Secret** และ **Channel Access Token**

#### สร้าง LINE Notify Token
1. ไปที่ [LINE Notify](https://notify-bot.line.me/)
2. Login ด้วย LINE account
3. สร้าง Token ใหม่ → เลือก **1-on-1 chat**
4. คัดลอก Token

### 3. ตั้งค่า .env
แก้ไขไฟล์ `.env`:
```
PORT=3000
LINE_CHANNEL_SECRET=ใส่_Channel_Secret_ที่ได้
LINE_CHANNEL_ACCESS_TOKEN=ใส่_Access_Token_ที่ได้
LINE_NOTIFY_TOKEN=ใส่_Notify_Token_ที่ได้
LINE_USER_ID=ใส่_User_ID_ของคุณ
```

> 💡 **หา LINE_USER_ID**: ไปที่ LINE Developers Console → Channel → Basic settings → Your user ID

### 4. รันเซิร์ฟเวอร์
```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

เซิร์ฟเวอร์จะรันที่ `http://localhost:3000`

### 5. ตั้งค่า Webhook (สำหรับ LINE Bot)

#### ใช้ ngrok (สำหรับทดสอบ)
```bash
ngrok http 3000
```
จะได้ URL เช่น `https://xxxx.ngrok.io`

#### ตั้ง Webhook URL
1. ไปที่ LINE Developers Console → Channel → Messaging API
2. ตั้ง Webhook URL: `https://xxxx.ngrok.io/webhook`
3. เปิด **Use webhook**
4. ปิด **Auto-reply messages**

---

## 📁 โครงสร้างโปรเจค

```
line/
├── .env                  # LINE credentials (ไม่ commit)
├── .env.example          # Template สำหรับ .env
├── .gitignore
├── package.json
├── server.js             # Express server หลัก
├── README.md
├── database/
│   └── db.js             # SQLite setup + seed data
├── services/
│   ├── parser.js         # แปลงข้อความ LINE → ข้อมูล
│   ├── finance.js        # CRUD รายรับ-รายจ่าย
│   ├── line.js           # LINE API + Flex Messages
│   └── scheduler.js      # Cron jobs แจ้งเตือน
├── routes/
│   ├── webhook.js        # LINE Webhook handler
│   └── api.js            # REST API for Dashboard
└── public/
    ├── index.html        # Web Dashboard
    ├── style.css         # Premium Dark Theme
    └── app.js            # Dashboard JavaScript
```

## 🛠️ Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| LINE Bot | @line/bot-sdk |
| Scheduler | node-cron |
| Frontend | HTML + CSS + JavaScript + Chart.js |
| Design | Dark Glassmorphism Theme |

---

## 📝 License

MIT
