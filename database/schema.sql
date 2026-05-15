-- PostgreSQL schema for Todo List
-- Default login PIN for the seeded user is: 1234

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pin_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#378ADD',
  icon text NOT NULL DEFAULT 'folder',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color_bg text NOT NULL DEFAULT '#E6F1FB',
  color_text text NOT NULL DEFAULT '#0C447C',
  color_border text NOT NULL DEFAULT '#B5D4F4',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'med',
  recur_type text NOT NULL DEFAULT 'once',
  recur_dates date[],
  recur_preset text,
  recur_weekdays int[],
  recur_interval int,
  recur_interval_unit text,
  recur_start date,
  recur_end_type text NOT NULL DEFAULT 'never',
  recur_end_count int,
  recur_end_date date,
  due_date date,
  due_time time,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS daily_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  reset_time time NOT NULL DEFAULT '00:00',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES daily_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  time_slot text NOT NULL DEFAULT 'morning',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  recur_type text NOT NULL DEFAULT 'preset',
  recur_dates date[],
  recur_preset text DEFAULT 'daily',
  recur_weekdays int[],
  recur_interval int,
  recur_interval_unit text,
  recur_start date,
  recur_end_type text NOT NULL DEFAULT 'never',
  recur_end_count int,
  recur_end_date date
);

ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_type text NOT NULL DEFAULT 'preset';
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_dates date[];
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_preset text DEFAULT 'daily';
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_weekdays int[];
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_interval int;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_interval_unit text;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_start date;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_end_type text NOT NULL DEFAULT 'never';
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_end_count int;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS recur_end_date date;

CREATE TABLE IF NOT EXISTS checklist_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES daily_templates(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  total_items int NOT NULL DEFAULT 0,
  done_items int NOT NULL DEFAULT 0,
  streak_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id, log_date)
);

CREATE TABLE IF NOT EXISTS checklist_item_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES checklist_logs(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES template_items(id) ON DELETE CASCADE,
  is_done boolean NOT NULL DEFAULT false,
  done_at timestamptz
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  is_all_day boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'confirmed',
  is_recurring boolean NOT NULL DEFAULT false,
  recur_rule text,
  remind_before_min int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  rsvp_status text NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_start ON appointments(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_checklist_logs_user_date ON checklist_logs(user_id, log_date);

INSERT INTO users (id, name, pin_hash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo User',
  'scrypt:8304321e25c4423554a89bccbb85bcda:ac07ad88d0bdbd17ebb9d33479d37823b18aac2d117168af3550746afeb51a5ac243e2c61bce2c62aec8dd990deac749d81c1206d20846ce7f9fbac9ce06e37a'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO daily_templates (id, user_id, name, reset_time)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Default Checklist',
  '00:00'
)
ON CONFLICT (id) DO NOTHING;
