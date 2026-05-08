// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CreateTaskInput, ApiResponse, Task } from '@/types';

const DEFAULT_USER = '00000000-0000-0000-0000-000000000001';

// GET /api/tasks?status=todo&priority=high&category_id=...&tag_id=...&search=...
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category_id = searchParams.get('category_id');
  const tag_id = searchParams.get('tag_id');
  const search = searchParams.get('search');

  const conditions: string[] = ['t.user_id = $1'];
  const params: unknown[] = [DEFAULT_USER];
  let idx = 2;

  if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
  if (priority) { conditions.push(`t.priority = $${idx++}`); params.push(priority); }
  if (category_id) { conditions.push(`t.category_id = $${idx++}`); params.push(category_id); }
  if (search) { conditions.push(`t.title ILIKE $${idx++}`); params.push(`%${search}%`); }
  if (tag_id) {
    conditions.push(`EXISTS (SELECT 1 FROM task_tags tt WHERE tt.task_id = t.id AND tt.tag_id = $${idx++})`);
    params.push(tag_id);
  }

  const where = conditions.join(' AND ');

  try {
    const { rows } = await pool.query<Task>(
      `SELECT
        t.*,
        row_to_json(c.*) AS category,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', tg.id, 'name', tg.name,
            'color_bg', tg.color_bg, 'color_text', tg.color_text, 'color_border', tg.color_border
          )) FILTER (WHERE tg.id IS NOT NULL), '[]'
        ) AS tags,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', s.id, 'title', s.title, 'is_done', s.is_done, 'sort_order', s.sort_order
          )) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS subtasks
      FROM tasks t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN task_tags tt ON tt.task_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      LEFT JOIN subtasks s ON s.task_id = t.id
      WHERE ${where}
      GROUP BY t.id, c.id
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'med' THEN 3 ELSE 4 END,
        t.due_date ASC NULLS LAST,
        t.created_at DESC`,
      params
    );

    return NextResponse.json<ApiResponse<Task[]>>({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<Task[]>>({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const body: CreateTaskInput = await req.json();
    const {
      title, description, category_id, priority,
      recur_type, recur_dates, recur_preset, recur_weekdays,
      recur_interval, recur_interval_unit, recur_start,
      recur_end_type, recur_end_count, recur_end_date,
      due_date, due_time, tag_ids,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Title is required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<Task>(
        `INSERT INTO tasks (
          user_id, category_id, title, description, priority,
          recur_type, recur_dates, recur_preset, recur_weekdays,
          recur_interval, recur_interval_unit, recur_start,
          recur_end_type, recur_end_count, recur_end_date,
          due_date, due_time
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        RETURNING *`,
        [
          DEFAULT_USER, category_id || null, title.trim(), description || null, priority || 'med',
          recur_type || 'once',
          recur_dates ? `{${recur_dates.join(',')}}` : null,
          recur_preset || null,
          recur_weekdays ? `{${recur_weekdays.join(',')}}` : null,
          recur_interval || null, recur_interval_unit || null, recur_start || null,
          recur_end_type || 'never', recur_end_count || null, recur_end_date || null,
          due_date || null, due_time || null,
        ]
      );

      const task = rows[0];

      if (tag_ids?.length) {
        const tagValues = tag_ids.map((_, i) => `($1, $${i + 2})`).join(',');
        await client.query(
          `INSERT INTO task_tags (task_id, tag_id) VALUES ${tagValues} ON CONFLICT DO NOTHING`,
          [task.id, ...tag_ids]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json<ApiResponse<Task>>({ data: task, message: 'Task created' }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create task' }, { status: 500 });
  }
}
