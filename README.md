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
DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5432/todo_list
JWT_SECRET=change-this-long-random-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

ถ้ารันแบบ local โดยไม่ผ่าน Docker และ PostgreSQL อยู่ในเครื่องเดียวกัน อาจใช้:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/todo_list
JWT_SECRET=change-this-long-random-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

โปรเจกต์ยังรองรับ env แบบแยกค่าเป็น fallback:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=USER
DB_PASS=PASSWORD
DB_NAME=todo_list
```

## Database

ใช้ PostgreSQL database ชื่อ `todo_list`

แอปคาดว่าจะมีตารางสำหรับข้อมูลหลักเหล่านี้:

- `tasks`, `subtasks`, `task_tags`
- `categories`, `tags`
- `daily_templates`, `template_items`
- `checklist_logs`, `checklist_item_logs`
- `appointments`, `appointment_attendees`

หมายเหตุ: ตอนนี้ repo ยังไม่มีไฟล์ migration/schema SQL แนบมา ต้องเตรียม schema ใน PostgreSQL ให้ตรงกับ API routes ก่อนใช้งานจริง

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
- ถ้า port `3000` ถูกใช้งานอยู่แล้ว ให้แก้ mapping ใน `docker-compose.yml`
