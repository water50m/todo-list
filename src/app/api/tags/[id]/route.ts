// app/api/tags/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, Tag } from '@/types';

// PATCH /api/tags/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { name, color_bg, color_text, color_border } = await req.json();
    const { rows } = await pool.query<Tag>(
      `UPDATE tags SET
        name         = COALESCE($1, name),
        color_bg     = COALESCE($2, color_bg),
        color_text   = COALESCE($3, color_text),
        color_border = COALESCE($4, color_border)
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name || null, color_bg || null, color_text || null, color_border || null, id, userId]
    );
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<Tag>>({ data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE /api/tags/[id]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { rowCount } = await pool.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<null>>({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}
