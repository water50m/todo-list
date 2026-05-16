import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { isScheduledForDate } from '@/lib/recurrence';
import { ApiResponse, ChecklistLog, TemplateItem } from '@/types';

const DEFAULT_TEMPLATE = '00000000-0000-0000-0000-000000000002';

async function fetchLog(logId: string) {
  const { rows } = await pool.query<ChecklistLog>(
    `SELECT cl.*,
      COALESCE(
        json_agg(jsonb_build_object(
          'id', cil.id,
          'template_item_id', cil.template_item_id,
          'is_done', cil.is_done,
          'done_at', cil.done_at,
          'template_item', jsonb_build_object(
            'id', ti.id,
            'template_id', ti.template_id,
            'category_id', ti.category_id,
            'tag_id', ti.tag_id,
            'title', ti.title,
            'time_slot', ti.time_slot,
            'sort_order', ti.sort_order,
            'recur_type', ti.recur_type,
            'recur_dates', ti.recur_dates,
            'recur_preset', ti.recur_preset,
            'recur_weekdays', ti.recur_weekdays,
            'recur_interval', ti.recur_interval,
            'recur_interval_unit', ti.recur_interval_unit,
            'recur_start', ti.recur_start,
            'recur_end_type', ti.recur_end_type,
            'recur_end_count', ti.recur_end_count,
            'recur_end_date', ti.recur_end_date,
            'category', CASE WHEN c.id IS NULL THEN NULL ELSE to_jsonb(c) END,
            'tag', CASE WHEN tg.id IS NULL THEN NULL ELSE to_jsonb(tg) END
          )
        ) ORDER BY ti.sort_order, ti.title) FILTER (WHERE cil.id IS NOT NULL),
        '[]'
      ) AS items
    FROM checklist_logs cl
    LEFT JOIN checklist_item_logs cil ON cil.log_id = cl.id
    LEFT JOIN template_items ti ON ti.id = cil.template_item_id
    LEFT JOIN categories c ON c.id = ti.category_id AND c.user_id = cl.user_id
    LEFT JOIN tags tg ON tg.id = ti.tag_id AND tg.user_id = cl.user_id
    WHERE cl.id = $1
    GROUP BY cl.id`,
    [logId]
  );
  return rows[0];
}

// GET /api/checklist?date=2026-05-04
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  const date = req.nextUrl.searchParams.get('date') ||
    new Date().toISOString().split('T')[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: templateRows } = await client.query(
      `SELECT id FROM daily_templates WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [DEFAULT_TEMPLATE, userId]
    );
    if (!templateRows.length) {
      await client.query('COMMIT');
      return NextResponse.json<ApiResponse<null>>({ error: 'Checklist template not found' }, { status: 404 });
    }

    const { rows: allItems } = await client.query<TemplateItem>(
      `SELECT * FROM template_items
       WHERE template_id = $1 AND is_active = true
       ORDER BY sort_order, title`,
      [DEFAULT_TEMPLATE]
    );
    const scheduledItems = allItems.filter(item => isScheduledForDate(item, date));
    const scheduledIds = scheduledItems.map(item => item.id);

    const { rows: existing } = await client.query<ChecklistLog>(
      `SELECT * FROM checklist_logs WHERE user_id = $1 AND log_date = $2 AND template_id = $3`,
      [userId, date, DEFAULT_TEMPLATE]
    );

    let logId = existing[0]?.id;
    if (!logId) {
      const { rows: prev } = await client.query(
        `SELECT streak_count FROM checklist_logs
         WHERE user_id = $1 AND template_id = $2 AND log_date = $3::date - 1`,
        [userId, DEFAULT_TEMPLATE, date]
      );
      const prevStreak = prev[0]?.streak_count ?? 0;

      const { rows: logRows } = await client.query<ChecklistLog>(
        `INSERT INTO checklist_logs (user_id, template_id, log_date, total_items, done_items, streak_count)
         VALUES ($1,$2,$3,$4,0,$5) RETURNING *`,
        [userId, DEFAULT_TEMPLATE, date, scheduledItems.length, prevStreak]
      );
      logId = logRows[0].id;
    } else {
      await client.query(
        `DELETE FROM checklist_item_logs
         WHERE log_id = $1 AND NOT (template_item_id = ANY($2::uuid[]))`,
        [logId, scheduledIds]
      );
    }

    for (const itemId of scheduledIds) {
      await client.query(
        `INSERT INTO checklist_item_logs (log_id, template_item_id)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM checklist_item_logs WHERE log_id = $1 AND template_item_id = $2
         )`,
        [logId, itemId]
      );
    }

    await client.query(
      `UPDATE checklist_logs cl
       SET total_items = (
           SELECT COUNT(*) FROM checklist_item_logs WHERE log_id = cl.id
         ),
         done_items = (
           SELECT COUNT(*) FROM checklist_item_logs WHERE log_id = cl.id AND is_done = true
         )
       WHERE cl.id = $1`,
      [logId]
    );

    await client.query('COMMIT');

    const log = await fetchLog(logId);
    return NextResponse.json<ApiResponse<ChecklistLog>>({ data: log });
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
    const userId = await getCurrentUserId();
    const { item_log_id, is_done } = await req.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query<{ log_id: string }>(
        `UPDATE checklist_item_logs cil
         SET is_done = $1, done_at = CASE WHEN $1 THEN NOW() ELSE NULL END
         FROM checklist_logs cl
         WHERE cil.id = $2 AND cil.log_id = cl.id AND cl.user_id = $3
         RETURNING cil.log_id`,
        [is_done, item_log_id, userId]
      );

      if (!rows.length) {
        await client.query('ROLLBACK');
        return NextResponse.json<ApiResponse<null>>({ error: 'Item not found' }, { status: 404 });
      }

      await client.query(
        `UPDATE checklist_logs cl
         SET done_items = (
           SELECT COUNT(*) FROM checklist_item_logs WHERE log_id = cl.id AND is_done = true
         )
         WHERE cl.id = $1`,
        [rows[0].log_id]
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
