# Todo List

Todo List เป็นเว็บแอปจัดการงานส่วนตัวที่รวม Tasks, Daily Checklist, นัดหมาย, ปฏิทินรวม และ Dashboard analytics ไว้ในระบบเดียว เหมาะสำหรับติดตามงานรายวัน งานที่ต้องทำซ้ำ ความคืบหน้าของ checklist และภาพรวมตารางนัดหมายในแต่ละเดือน

## Portfolio Snippet

### English


## Features

### Dashboard

- แสดงภาพรวมงานทั้งหมด งานที่เสร็จแล้ว งานเกินกำหนด และ completion rate
- ติดตาม Daily Checklist ด้วยกราฟย้อนหลัง 7 หรือ 30 วัน
- แสดง Daily Streak และอันดับ checklist ที่ทำต่อเนื่อง
- แสดงนัดหมายที่กำลังจะมาถึงภายใน 7 วัน
- มี quick actions สำหรับไปหน้า Tasks, Daily Checklist, Calendar และ Settings

### Tasks

- สร้าง แก้ไข ลบ และเปลี่ยนสถานะ task ได้
- รองรับ priority, due date, due time, หมวดหมู่, tags และ subtasks
- ค้นหาและกรอง task ตามสถานะ priority และหมวดหมู่
- บันทึก task ที่เสร็จแล้วเพื่อนำไปแสดงในปฏิทินรวม
- รองรับข้อมูล recurrence สำหรับ task ที่ต้องทำซ้ำ

### Daily Checklist

- สร้าง checklist รายวันจาก template ในฐานข้อมูล
- เลือกดู checklist ย้อนหลังและติดตามจำนวนที่ทำแล้วเทียบกับทั้งหมด
- แก้ไข checklist item ได้จากหน้ารายวันหรือหน้า Settings
- รองรับรายการที่ไม่ได้ทำทุกวัน เช่น วันธรรมดา วันหยุด หลายวันที่เลือกเอง หรือ custom recurrence
- แสดง progress bar, streak และสถานะรายการแบบ real-time หลังจากกดทำเสร็จ

### Calendar

- รวม Daily Checklist, Tasks และ Appointments ไว้ในปฏิทินเดือนเดียว
- กรองการแสดงผลเฉพาะนัดหมาย Daily หรือ Tasks ได้
- เลือกวันที่เพื่อดูรายละเอียดของวันนั้น
- เพิ่ม แก้ไข ยกเลิก หรือลบนัดหมายจากหน้าปฏิทิน
- รองรับนัดหมายแบบทั้งวัน สถานที่ ผู้เข้าร่วม และการแจ้งเตือนล่วงหน้า

### Settings

- จัดการ Daily Template หลักและ checklist items
- ตั้ง recurrence, หมวดหมู่ และ tag ให้แต่ละ checklist item
- สร้าง แก้ไข และลบ categories
- สร้าง แก้ไข และลบ tags พร้อมสีแสดงผล

### Authentication

- เข้าสู่ระบบด้วย PIN ผ่านหน้า `/login`
- ใช้ session cookie แบบ HTTP-only
- Seed user เริ่มต้นใน `database/schema.sql`

```text
Name: Demo User
PIN: 1234
```

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- Tailwind CSS 4
- Node.js 22
- Docker / Docker Compose

## Requirements

- Node.js 22 ขึ้นไป
- npm
- PostgreSQL
- Docker และ Docker Compose ถ้าต้องการรันด้วย container

## Environment Variables

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์

```env
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/todo_list
JWT_SECRET=<LONG_RANDOM_SECRET>
NEXT_PUBLIC_API_URL=http://localhost:3000
```

ตัวอย่างเมื่อรันแอปใน Docker และ PostgreSQL อยู่บน host machine

```env
DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/todo_list
JWT_SECRET=replace-with-a-long-random-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Database Setup

สร้าง PostgreSQL database ชื่อ `todo_list` ก่อน จากนั้นรัน schema

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

หรือระบุ host, port และ user เอง

```bash
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d todo_list -f database/schema.sql
```

ตารางหลักที่ schema สร้างให้ ได้แก่

- `users`
- `tasks`, `subtasks`, `task_tags`
- `categories`, `tags`
- `daily_templates`, `template_items`
- `checklist_logs`, `checklist_item_logs`
- `appointments`, `appointment_attendees`

## Local Development

ติดตั้ง dependencies

```bash
npm install
```

รัน development server

```bash
npm run dev
```

เปิดเว็บแอป

```text
http://localhost:3000
```

เข้าสู่ระบบด้วย PIN เริ่มต้น

```text
1234
```

## Production Build

สร้าง production build

```bash
npm run build
```

รัน production server

```bash
npm run start
```

โปรเจกต์ตั้งค่า `output: 'standalone'` ใน `next.config.ts` แล้ว จึงเหมาะกับการ build เป็น Docker image สำหรับ production

## Docker

ตรวจสอบค่า `.env` ให้ชี้ไปยัง PostgreSQL ที่ถูกต้อง จากนั้นรัน

```bash
docker compose up -d --build
```

เปิดแอปที่

```text
http://localhost:3000
```

หยุด container

```bash
docker compose down
```

## Scripts

```bash
npm run dev      # run development server
npm run build    # create production build
npm run start    # run production server
npm run lint     # run ESLint
```

## Project Structure

```text
src/
  app/              Next.js App Router pages and API routes
  components/       Shared UI components and modals
  hooks/            Client-side hooks
  lib/              Database, auth, and recurrence helpers
  types/            Shared TypeScript types
database/
  schema.sql        PostgreSQL schema and seed data
```

## Main Routes

```text
/login       PIN login
/dashboard   Overview, progress charts, streaks, upcoming appointments
/tasks       Task management with filters and search
/daily       Daily Checklist tracking
/calendar    Monthly calendar for appointments, tasks, and checklist logs
/settings    Template, category, and tag management
```

## API Overview

```text
/api/auth/pin
/api/dashboard
/api/tasks
/api/tasks/[id]
/api/checklist
/api/templates
/api/calendar/events
/api/appointments
/api/appointments/[id]
/api/categories
/api/categories/[id]
/api/tags
/api/tags/[id]
```

## Notes

- `.env` ถูก ignore โดย git แล้ว ไม่ควร commit secret จริงเข้า repository
- ถ้าใช้ Docker บน Windows หรือ macOS และ database อยู่บนเครื่อง host ให้ใช้ `host.docker.internal` ใน `DATABASE_URL`
- Docker Compose map host port `3000` ไปยัง container port `3000`
- ถ้า port `3000` ถูกใช้งานอยู่ ให้หยุด service เดิมหรือแก้ port mapping ใน `docker-compose.yml`
