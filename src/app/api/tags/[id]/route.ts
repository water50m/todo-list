// app/api/tags/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, Tag } from '@/types';

// PATCH /api/tags/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { name, color_bg, color_text, color_border } = await req.json();
    const { rows } = await pool.query<Tag>(
      `UPDATE tags SET
        name         = COALESCE($1, name),
        color_bg     = COALESCE($2, color_bg),
        color_text   = COALESCE($3, color_text),
        color_border = COALESCE($4, color_border)
       WHERE id = $5 RETURNING *`,
      [name || null, color_bg || null, color_text || null, color_border || null, id]
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
    const { rowCount } = await pool.query('DELETE FROM tags WHERE id = $1', [id]);
    if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<null>>({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}
