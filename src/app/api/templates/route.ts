// app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, DailyTemplate } from '@/types';

const DEFAULT_USER = '00000000-0000-0000-0000-000000000001';

// GET /api/templates
export async function GET() {
  try {
    const { rows } = await pool.query<DailyTemplate>(
      `SELECT dt.*,
        json_agg(ti.* ORDER BY ti.time_slot, ti.sort_order) FILTER (WHERE ti.id IS NOT NULL) AS items
       FROM daily_templates dt
       LEFT JOIN template_items ti ON ti.template_id = dt.id AND ti.is_active = true
       WHERE dt.user_id = $1
       GROUP BY dt.id
       ORDER BY dt.created_at ASC`,
      [DEFAULT_USER]
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
    const body = await req.json();
    const { action } = body;

    if (action === 'create_template') {
      const { name, reset_time } = body;
      const { rows } = await pool.query(
        `INSERT INTO daily_templates (user_id, name, reset_time) VALUES ($1,$2,$3) RETURNING *`,
        [DEFAULT_USER, name || 'New Checklist', reset_time || '00:00']
      );
      return NextResponse.json<ApiResponse<DailyTemplate>>({ data: rows[0] }, { status: 201 });
    }

    if (action === 'add_item') {
      const { template_id, title, time_slot } = body;
      if (!template_id || !title?.trim()) {
        return NextResponse.json({ error: 'template_id and title required' }, { status: 400 });
      }
      const { rows: cntRows } = await pool.query(
        `SELECT COUNT(*) AS cnt FROM template_items WHERE template_id = $1`,
        [template_id]
      );
      const { rows } = await pool.query(
        `INSERT INTO template_items (template_id, title, time_slot, sort_order)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [template_id, title.trim(), time_slot || 'morning', parseInt(cntRows[0]?.cnt || '0')]
      );
      return NextResponse.json({ data: rows[0] }, { status: 201 });
    }

    if (action === 'toggle_item') {
      const { item_id, is_active } = body;
      const { rows } = await pool.query(
        `UPDATE template_items SET is_active = $1 WHERE id = $2 RETURNING *`,
        [is_active, item_id]
      );
      return NextResponse.json({ data: rows[0] });
    }

    if (action === 'delete_item') {
      const { item_id } = body;
      await pool.query('DELETE FROM template_items WHERE id = $1', [item_id]);
      return NextResponse.json({ message: 'Deleted' });
    }

    if (action === 'update_item') {
      const { item_id, title, time_slot } = body;
      const { rows } = await pool.query(
        `UPDATE template_items SET title = COALESCE($1, title), time_slot = COALESCE($2, time_slot)
         WHERE id = $3 RETURNING *`,
        [title || null, time_slot || null, item_id]
      );
      return NextResponse.json({ data: rows[0] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}
