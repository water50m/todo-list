# Todo List

แอปจัดการงานส่วนตัวด้วย Next.js, React และ PostgreSQL รองรับ task, daily checklist, calendar appointment, category, tag และ dashboard สรุปภาพรวม

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- Tailwind CSS 4
- Docker / Docker Compose

## Features

- Dashboard สรุปจำนวนงาน, completion rate, งานเกินกำหนด, daily streak และนัดหมายใกล้ถึง
- Task management พร้อม priority, category, tag, due date และ recurring options
- Daily checklist แยกช่วงเช้า กลางวัน เย็น พร้อม streak
- Calendar สำหรับเพิ่ม แก้ไข ยกเลิก และลบนัดหมาย
- Settings สำหรับจัดการ daily templates, categories และ tags
- UI โทน pastel พร้อม responsive layout

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

สร้าง schema ด้วยไฟล์:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

หรือถ้าอยู่ในเครื่อง host:

```bash
psql -h <DB_HOST> -p <DB_PORT> -U <DB_USER> -d todo_list -f database/schema.sql
```

schema นี้จะสร้าง `users` และ seed user เริ่มต้น:

```text
name: Demo User
pin: 1234
```

แอปคาดว่าจะมีตารางสำหรับข้อมูลหลักเหล่านี้:

- `users`
- `tasks`, `subtasks`, `task_tags`
- `categories`, `tags`
- `daily_templates`, `template_items`
- `checklist_logs`, `checklist_item_logs`
- `appointments`, `appointment_attendees`

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
  lib/              Database connection
  types/            Shared TypeScript types
```

## Notes

- `.env` ถูก ignore โดย git แล้ว ไม่ควร commit secret จริงเข้า repo
- ถ้าใช้ Docker บน Windows/Mac แล้ว database อยู่บน host machine ให้ใช้ `host.docker.internal` ใน `DATABASE_URL`
- Docker ใช้ host port `3000` ถ้าเครื่องมี service อื่นใช้ port นี้อยู่ ต้องหยุด service นั้นก่อน
