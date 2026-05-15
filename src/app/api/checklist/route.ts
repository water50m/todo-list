// app/api/checklist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, ChecklistLog } from '@/types';

const DEFAULT_TEMPLATE = '00000000-0000-0000-0000-000000000002';

// GET /api/checklist?date=2026-05-04
// Returns today's checklist log (creates one if not exists)
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  const date = req.nextUrl.searchParams.get('date') ||
    new Date().toISOString().split('T')[0];

  const client = await pool.connect();
  try {
    // Check existing log
    const { rows } = await client.query<ChecklistLog>(
      `SELECT cl.*,
        json_agg(jsonb_build_object(
          'id', cil.id,
          'template_item_id', cil.template_item_id,
          'is_done', cil.is_done,
          'done_at', cil.done_at,
          'template_item', jsonb_build_object(
            'id', ti.id, 'title', ti.title, 'time_slot', ti.time_slot, 'sort_order', ti.sort_order
          )
        ) ORDER BY ti.time_slot, ti.sort_order) AS items
      FROM checklist_logs cl
      JOIN checklist_item_logs cil ON cil.log_id = cl.id
      JOIN template_items ti ON ti.id = cil.template_item_id
      WHERE cl.user_id = $1 AND cl.log_date = $2 AND cl.template_id = $3
      GROUP BY cl.id`,
      [userId, date, DEFAULT_TEMPLATE]
    );

    if (rows.length) {
      return NextResponse.json<ApiResponse<ChecklistLog>>({ data: rows[0] });
    }

    // Create new log for today
    await client.query('BEGIN');

    const { rows: items } = await client.query(
      `SELECT * FROM template_items WHERE template_id = $1 AND is_active = true ORDER BY time_slot, sort_order`,
      [DEFAULT_TEMPLATE]
    );

    // Calculate streak
    const { rows: prev } = await client.query(
      `SELECT streak_count FROM checklist_logs
       WHERE user_id = $1 AND template_id = $2 AND log_date = $3::date - 1`,
      [userId, DEFAULT_TEMPLATE, date]
    );
    const prevStreak = prev[0]?.streak_count ?? 0;

    const { rows: logRows } = await client.query<ChecklistLog>(
      `INSERT INTO checklist_logs (user_id, template_id, log_date, total_items, done_items, streak_count)
       VALUES ($1,$2,$3,$4,0,$5) RETURNING *`,
      [userId, DEFAULT_TEMPLATE, date, items.length, prevStreak]
    );
    const log = logRows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO checklist_item_logs (log_id, template_item_id) VALUES ($1,$2)`,
        [log.id, item.id]
      );
    }

    await client.query('COMMIT');

    // Re-fetch with items
    const { rows: fresh } = await client.query<ChecklistLog>(
      `SELECT cl.*,
        json_agg(jsonb_build_object(
          'id', cil.id,
          'template_item_id', cil.template_item_id,
          'is_done', cil.is_done,
          'done_at', cil.done_at,
          'template_item', jsonb_build_object(
            'id', ti.id, 'title', ti.title, 'time_slot', ti.time_slot, 'sort_order', ti.sort_order
          )
        ) ORDER BY ti.time_slot, ti.sort_order) AS items
      FROM checklist_logs cl
      JOIN checklist_item_logs cil ON cil.log_id = cl.id
      JOIN template_items ti ON ti.id = cil.template_item_id
      WHERE cl.id = $1
      GROUP BY cl.id`,
      [log.id]
    );

    return NextResponse.json<ApiResponse<ChecklistLog>>({ data: fresh[0] }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to get checklist' }, { status: 500 });
  } finally {
    client.release();
  }
}

// PATCH /api/checklist  body: { item_log_id, is_done }
export async function PATCH(req: NextRequest) {
  try {
    const { item_log_id, is_done } = await req.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE checklist_item_logs
         SET is_done = $1, done_at = CASE WHEN $1 THEN NOW() ELSE NULL END
         WHERE id = $2`,
        [is_done, item_log_id]
      );

      // Update summary counts
      await client.query(
        `UPDATE checklist_logs cl
         SET done_items = (
           SELECT COUNT(*) FROM checklist_item_logs WHERE log_id = cl.id AND is_done = true
         )
         WHERE cl.id = (SELECT log_id FROM checklist_item_logs WHERE id = $1)`,
        [item_log_id]
      );

      await client.query('COMMIT');
      return NextResponse.json<ApiResponse<null>>({ message: 'Updated' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update item' }, { status: 500 });
  }
}
