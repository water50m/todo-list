// app/api/tasks/[id]/subtasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, Subtask } from '@/types';

// GET /api/tasks/[id]/subtasks
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { rows } = await pool.query<Subtask>(
      `SELECT s.*
       FROM subtasks s
       JOIN tasks t ON t.id = s.task_id
       WHERE s.task_id = $1 AND t.user_id = $2
       ORDER BY s.sort_order ASC, s.id ASC`,
      [id, userId]
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
    const userId = await getCurrentUserId();
    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Title required' }, { status: 400 });
    }
    const { rows: countRows } = await pool.query(
      `SELECT t.id, COUNT(s.id) AS cnt
       FROM tasks t
       LEFT JOIN subtasks s ON s.task_id = t.id
       WHERE t.id = $1 AND t.user_id = $2
       GROUP BY t.id`,
      [id, userId]
    );
    if (!countRows.length) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Task not found' }, { status: 404 });
    }
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getCurrentUserId();
    const { subtask_id, is_done, title } = await req.json();
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (typeof is_done === 'boolean') { sets.push(`is_done = $${idx++}`); vals.push(is_done); }
    if (title?.trim())                { sets.push(`title = $${idx++}`);   vals.push(title.trim()); }
    if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    vals.push(subtask_id);
    vals.push(id);
    vals.push(userId);
    const { rows } = await pool.query<Subtask>(
      `UPDATE subtasks
       SET ${sets.join(',')}
       WHERE id = $${idx++}
         AND task_id = $${idx++}
         AND EXISTS (SELECT 1 FROM tasks WHERE id = $${idx - 1} AND user_id = $${idx})
       RETURNING *`,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const subtask_id = req.nextUrl.searchParams.get('subtask_id');
  if (!subtask_id) return NextResponse.json({ error: 'subtask_id required' }, { status: 400 });
  try {
    const userId = await getCurrentUserId();
    await pool.query(
      `DELETE FROM subtasks s
       USING tasks t
       WHERE s.id = $1 AND s.task_id = $2 AND t.id = s.task_id AND t.user_id = $3`,
      [subtask_id, id, userId],
    );
    return NextResponse.json<ApiResponse<null>>({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete subtask' }, { status: 500 });
  }
}
