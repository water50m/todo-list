// app/api/tasks/[id]/subtasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, Subtask } from '@/types';

// GET /api/tasks/[id]/subtasks
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { rows } = await pool.query<Subtask>(
      `SELECT * FROM subtasks WHERE task_id = $1 ORDER BY sort_order ASC, id ASC`,
      [id]
    );
    return NextResponse.json<ApiResponse<Subtask[]>>({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch subtasks' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/subtasks
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Title required' }, { status: 400 });
    }
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM subtasks WHERE task_id = $1`,
      [id]
    );
    const sortOrder = parseInt(countRows[0]?.cnt || '0');
    const { rows } = await pool.query<Subtask>(
      `INSERT INTO subtasks (task_id, title, sort_order) VALUES ($1,$2,$3) RETURNING *`,
      [id, title.trim(), sortOrder]
    );
    return NextResponse.json<ApiResponse<Subtask>>({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create subtask' }, { status: 500 });
  }
}

// PATCH /api/tasks/[id]/subtasks  body: { subtask_id, is_done?, title? }
export async function PATCH(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { subtask_id, is_done, title } = await req.json();
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (typeof is_done === 'boolean') { sets.push(`is_done = $${idx++}`); vals.push(is_done); }
    if (title?.trim())                { sets.push(`title = $${idx++}`);   vals.push(title.trim()); }
    if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    vals.push(subtask_id);
    const { rows } = await pool.query<Subtask>(
      `UPDATE subtasks SET ${sets.join(',')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    return NextResponse.json<ApiResponse<Subtask>>({ data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update subtask' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/subtasks?subtask_id=xxx
export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  const subtask_id = req.nextUrl.searchParams.get('subtask_id');
  if (!subtask_id) return NextResponse.json({ error: 'subtask_id required' }, { status: 400 });
  try {
    await pool.query('DELETE FROM subtasks WHERE id = $1', [subtask_id]);
    return NextResponse.json<ApiResponse<null>>({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
