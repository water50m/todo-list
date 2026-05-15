// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, Category } from '@/types';

// PATCH /api/categories/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { name, color, icon } = await req.json();
    const { rows } = await pool.query<Category>(
      `UPDATE categories SET
        name  = COALESCE($1, name),
        color = COALESCE($2, color),
        icon  = COALESCE($3, icon)
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [name || null, color || null, icon || null, id, userId]
    );
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<Category>>({ data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { rowCount } = await pool.query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<null>>({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}
