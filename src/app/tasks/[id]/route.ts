// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, Task } from '@/types';

// GET /api/tasks/[id]
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { rows } = await pool.query<Task>(
      `SELECT t.*,
        row_to_json(c.*) AS category,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id',tg.id,'name',tg.name,'color_bg',tg.color_bg,'color_text',tg.color_text,'color_border',tg.color_border
        )) FILTER (WHERE tg.id IS NOT NULL),'[]') AS tags,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'id',s.id,'title',s.title,'is_done',s.is_done,'sort_order',s.sort_order
        )) FILTER (WHERE s.id IS NOT NULL),'[]') AS subtasks
      FROM tasks t
      LEFT JOIN categories c ON c.id = t.category_id
      LEFT JOIN task_tags tt ON tt.task_id = t.id
      LEFT JOIN tags tg ON tg.id = tt.tag_id
      LEFT JOIN subtasks s ON s.task_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, c.id`,
      [id]
    );
    if (!rows.length) return NextResponse.json<ApiResponse<null>>({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<Task>>({ data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PATCH /api/tasks/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const allowed = [
      'title','description','status','priority','category_id',
      'due_date','due_time','recur_type','recur_dates','recur_preset',
      'recur_weekdays','recur_interval','recur_interval_unit',
      'recur_start','recur_end_type','recur_end_count','recur_end_date',
    ];

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in body) {
        if (key === 'status' && body.status === 'done') {
          sets.push(`status = $${idx++}`, `completed_at = NOW()`);
          vals.push('done');
        } else if (key === 'recur_dates' && Array.isArray(body[key])) {
          sets.push(`recur_dates = $${idx++}`);
          vals.push(`{${body[key].join(',')}}`);
        } else if (key === 'recur_weekdays' && Array.isArray(body[key])) {
          sets.push(`recur_weekdays = $${idx++}`);
          vals.push(`{${body[key].join(',')}}`);
        } else {
          sets.push(`${key} = $${idx++}`);
          vals.push(body[key] ?? null);
        }
      }
    }

    if (!sets.length) return NextResponse.json<ApiResponse<null>>({ error: 'Nothing to update' }, { status: 400 });

    vals.push(id);
    const { rows } = await pool.query<Task>(
      `UPDATE tasks SET ${sets.join(',')} WHERE id = $${idx} RETURNING *`,
      vals
    );

    if (!rows.length) return NextResponse.json<ApiResponse<null>>({ error: 'Not found' }, { status: 404 });

    // Handle tag_ids update
    if ('tag_ids' in body) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM task_tags WHERE task_id = $1', [id]);
        if (body.tag_ids?.length) {
          const tagVals = body.tag_ids.map((_: string, i: number) => `($1, $${i + 2})`).join(',');
          await client.query(
            `INSERT INTO task_tags (task_id, tag_id) VALUES ${tagVals} ON CONFLICT DO NOTHING`,
            [id, ...body.tag_ids]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    return NextResponse.json<ApiResponse<Task>>({ data: rows[0], message: 'Updated' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    if (!rowCount) return NextResponse.json<ApiResponse<null>>({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<null>>({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete task' }, { status: 500 });
  }
}
