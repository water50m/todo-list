// app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, DailyTemplate } from '@/types';

// GET /api/templates
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { rows } = await pool.query<DailyTemplate>(
      `SELECT dt.*,
        jsonb_agg(
          to_jsonb(ti) ||
          jsonb_build_object(
            'category', CASE WHEN c.id IS NULL THEN NULL ELSE to_jsonb(c) END,
            'tag', CASE WHEN tg.id IS NULL THEN NULL ELSE to_jsonb(tg) END
          )
          ORDER BY ti.sort_order, ti.title
        ) FILTER (WHERE ti.id IS NOT NULL) AS items
       FROM daily_templates dt
       LEFT JOIN template_items ti ON ti.template_id = dt.id AND ti.is_active = true
       LEFT JOIN categories c ON c.id = ti.category_id AND c.user_id = dt.user_id
       LEFT JOIN tags tg ON tg.id = ti.tag_id AND tg.user_id = dt.user_id
       WHERE dt.user_id = $1
       GROUP BY dt.id
       ORDER BY dt.created_at ASC`,
      [userId]
    );
    return NextResponse.json<ApiResponse<DailyTemplate[]>>({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/templates  — create template or add item
// body: { action: 'create_template'|'add_item'|'toggle_item'|'delete_item'|'reorder_item', ...payload }
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json();
    const { action } = body;

    if (action === 'create_template') {
      const { name, reset_time } = body;
      const { rows } = await pool.query(
        `INSERT INTO daily_templates (user_id, name, reset_time) VALUES ($1,$2,$3) RETURNING *`,
        [userId, name || 'New Checklist', reset_time || '00:00']
      );
      return NextResponse.json<ApiResponse<DailyTemplate>>({ data: rows[0] }, { status: 201 });
    }

    if (action === 'add_item') {
      const {
        template_id, title,
        category_id, tag_id,
        recur_type, recur_dates, recur_preset, recur_weekdays,
        recur_interval, recur_interval_unit, recur_start,
        recur_end_type, recur_end_count, recur_end_date,
      } = body;
      if (!template_id || !title?.trim()) {
        return NextResponse.json({ error: 'template_id and title required' }, { status: 400 });
      }
      const { rows: cntRows } = await pool.query(
        `SELECT dt.id, COUNT(ti.*) AS cnt
         FROM daily_templates dt
         LEFT JOIN template_items ti ON ti.template_id = dt.id
         WHERE dt.id = $1 AND dt.user_id = $2
         GROUP BY dt.id`,
        [template_id, userId]
      );
      if (!cntRows.length) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      const { rows } = await pool.query(
        `INSERT INTO template_items (
          template_id, title, sort_order, category_id, tag_id,
          recur_type, recur_dates, recur_preset, recur_weekdays,
          recur_interval, recur_interval_unit, recur_start,
          recur_end_type, recur_end_count, recur_end_date
        )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          template_id,
          title.trim(),
          parseInt(cntRows[0]?.cnt || '0'),
          category_id || null,
          tag_id || null,
          recur_type || 'preset',
          recur_dates?.length ? `{${recur_dates.join(',')}}` : null,
          recur_preset || 'daily',
          recur_weekdays?.length ? `{${recur_weekdays.join(',')}}` : null,
          recur_interval || null,
          recur_interval_unit || null,
          recur_start || null,
          recur_end_type || 'never',
          recur_end_count || null,
          recur_end_date || null,
        ]
      );
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    }

    if (action === 'toggle_item') {
      const { item_id, is_active } = body;
      const { rows } = await pool.query(
        `UPDATE template_items ti
         SET is_active = $1
         FROM daily_templates dt
         WHERE ti.id = $2 AND ti.template_id = dt.id AND dt.user_id = $3
         RETURNING ti.*`,
        [is_active, item_id, userId]
      );
      return NextResponse.json({ data: rows[0] });
    }

    if (action === 'delete_item') {
      const { item_id } = body;
      await pool.query(
        `DELETE FROM template_items ti
         USING daily_templates dt
         WHERE ti.id = $1 AND ti.template_id = dt.id AND dt.user_id = $2`,
        [item_id, userId]
      );
      return NextResponse.json({ message: 'Deleted' });
    }

    if (action === 'update_item') {
      const {
        item_id, title,
        category_id, tag_id,
        recur_type, recur_dates, recur_preset, recur_weekdays,
        recur_interval, recur_interval_unit, recur_start,
        recur_end_type, recur_end_count, recur_end_date,
      } = body;
      const { rows } = await pool.query(
        `UPDATE template_items ti
         SET title = COALESCE($1, ti.title),
             recur_type = COALESCE($2, ti.recur_type),
             recur_dates = $3,
             recur_preset = COALESCE($4, ti.recur_preset),
             recur_weekdays = $5,
             recur_interval = $6,
             recur_interval_unit = $7,
             recur_start = $8,
             recur_end_type = COALESCE($9, ti.recur_end_type),
             recur_end_count = $10,
             recur_end_date = $11,
             category_id = $12,
             tag_id = $13
         FROM daily_templates dt
         WHERE ti.id = $14 AND ti.template_id = dt.id AND dt.user_id = $15
         RETURNING ti.*`,
        [
          title?.trim() || null,
          recur_type || null,
          recur_dates?.length ? `{${recur_dates.join(',')}}` : null,
          recur_preset || null,
          recur_weekdays?.length ? `{${recur_weekdays.join(',')}}` : null,
          recur_interval || null,
          recur_interval_unit || null,
          recur_start || null,
          recur_end_type || null,
          recur_end_count || null,
          recur_end_date || null,
          category_id || null,
          tag_id || null,
          item_id,
          userId,
        ]
      );
      return NextResponse.json({ data: rows[0] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}
