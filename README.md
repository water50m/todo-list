# Todo List

แอปจัดการงานส่วนตัวที่รวม task, daily checklist, นัดหมาย และปฏิทินรวมไว้ในที่เดียว เหมาะสำหรับติดตามงานประจำวัน งานที่ทำเป็นบางวัน และภาพรวมของเดือน

## Feature การใช้งาน

### Dashboard

- ดูภาพรวมงานทั้งหมด, completion rate, งานเกินกำหนด และ daily streak
- ถ้ามีนัดหมายใน 7 วันข้างหน้า ระบบจะแสดงแถบนัดหมายไว้ด้านบนสุด
- ดูกราฟความคืบหน้า daily checklist ย้อนหลัง 7 วัน
- ดู breakdown ตาม priority และหมวดหมู่
- เข้าใช้งานหน้า Tasks, Daily Checklist และ Settings ได้เร็วจาก quick actions

### Tasks

- สร้าง task แบบเรียบง่าย โดยใส่ชื่อ รายละเอียด และความสำคัญ
- แก้ไข task ได้จากรายการ task โดยตรง
- เปลี่ยนสถานะ task เป็นเสร็จแล้วหรือยังไม่ทำได้
- กรอง task ตามสถานะ, priority, หมวดหมู่ และค้นหาจากชื่อ
- task ที่ทำเสร็จจะถูก mark ลงในปฏิทินรวมตามวันที่ทำเสร็จ

### Daily Checklist

- แสดง checklist ของวันที่เลือกโดยดึงจาก database
- ไม่แบ่งช่วงเวลา รายการทั้งหมดแสดงเป็น list เดียว
- ติดตาม progress เป็นจำนวนที่ทำแล้วเทียบกับทั้งหมด
- รองรับ checklist ที่ไม่ได้ทำทุกวัน เช่น ทำเฉพาะบางวัน, วันธรรมดา, วันหยุด, หลายวันที่เลือกเอง หรือ custom recurrence
- checklist แต่ละวันจะแสดงในปฏิทินรวมเป็นชื่อ template พร้อมจุดสีบอกความคืบหน้า และตัวเลข `done/all`

### Calendar

- แยกส่วน `นัดหมาย` และ `ปฏิทินรวม` ออกจากกันชัดเจน
- ส่วนนัดหมายใช้สำหรับเพิ่ม แก้ไข ยกเลิก และลบนัดหมาย
- ปฏิทินรวมแสดง daily checklist, task และ appointment ในเดือนเดียวกัน
- มี filter เพื่อเลือกดูเฉพาะ นัดหมาย, Daily หรือ Tasks
- กดวันที่ในปฏิทินรวมเพื่อดูรายละเอียดของวันนั้น
- เพิ่มนัดหมายจากวันที่เลือกได้ทันที โดย modal จะตั้งวันที่เริ่มต้นเป็นวันนั้นให้

### Settings

- จัดการ Daily Template และรายการ checklist
- เพิ่มหรือแก้ไข checklist item พร้อมตั้ง recurrence ได้
- จัดการหมวดหมู่และ tags สำหรับข้อมูลเดิมในระบบ

### Authentication

- login ด้วย PIN ผ่านหน้า `/login`
- schema มี seed user เริ่มต้น:

```text
name: Demo User
pin: 1234
```

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- Tailwind CSS 4
- Docker / Docker Compose

## Requirements

- Node.js 22 ขึ้นไป
- npm
- PostgreSQL
- Docker และ Docker Compose ถ้าต้องการรันด้วย container

## Environment Variables

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์:

```env
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/todo_list
JWT_SECRET=<LONG_RANDOM_SECRET>
NEXT_PUBLIC_API_URL=http://localhost:3000
```

ตัวอย่างสำหรับ Docker ที่ database อยู่บน host machine:

```env
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@host.docker.internal:5432/todo_list
JWT_SECRET=<LONG_RANDOM_SECRET>
NEXT_PUBLIC_API_URL=http://localhost:3000
```

โดยทั่วไป PostgreSQL ใช้ port `5432` เป็นค่า default แต่ถ้า database ใช้ port อื่น ให้เปลี่ยน `<DB_PORT>` ตามจริง

## Database

ใช้ PostgreSQL database ชื่อ `todo_list`

สร้างหรืออัปเดต schema ด้วยไฟล์:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

หรือถ้าอยู่ในเครื่อง host:

```bash
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d todo_list -f database/schema.sql
```

schema นี้จะสร้างตารางหลัก:

- `users`
- `tasks`, `subtasks`, `task_tags`
- `categories`, `tags`
- `daily_templates`, `template_items`
- `checklist_logs`, `checklist_item_logs`
- `appointments`, `appointment_attendees`

ถ้ามี database เดิมอยู่แล้ว ให้รัน `database/schema.sql` ซ้ำเพื่อเพิ่มคอลัมน์ใหม่ เช่น recurrence ของ `template_items`

## Development

ติดตั้ง dependencies:

```bash
npm install
```

รัน dev server:

```bash
npm run dev
```

เปิดแอปที่:

```text
http://localhost:3000
```

## Production Build

```bash
npm run build
npm run start
```

โปรเจกต์ตั้งค่า `output: 'standalone'` ใน `next.config.ts` แล้ว จึงพร้อมใช้กับ Docker image แบบ production

## Docker

แก้ค่า `.env` ให้ชี้ไปที่ database `todo_list` ก่อน แล้วรัน:

```bash
docker compose up -d --build
```

เปิดแอปที่:

```text
http://localhost:3000
```

Docker Compose ของโปรเจกต์นี้ map host port `3000` ไปยัง container port `3000`

หยุด container:

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
  components/       Shared UI components
  hooks/            Client hooks
  lib/              Database connection, auth helpers, recurrence helpers
  types/            Shared TypeScript types
database/
  schema.sql        PostgreSQL schema and seed data
```

## Notes

- `.env` ถูก ignore โดย git แล้ว ไม่ควร commit secret จริงเข้า repo
- ถ้าใช้ Docker บน Windows/Mac แล้ว database อยู่บน host machine ให้ใช้ `host.docker.internal` ใน `DATABASE_URL`
- Docker ใช้ host port `3000` ถ้าเครื่องมี service อื่นใช้ port นี้อยู่ ต้องหยุด service นั้นก่อน หรือแก้ port mapping ใน `docker-compose.yml`
