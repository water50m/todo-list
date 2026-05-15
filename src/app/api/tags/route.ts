// app/api/tags/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, Tag } from '@/types';

// GET /api/tags
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const { rows } = await pool.query<Tag>(
      `SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    );
    return NextResponse.json<ApiResponse<Tag[]>>({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { name, color_bg, color_text, color_border } = await req.json();
    if (!name?.trim()) return NextResponse.json<ApiResponse<null>>({ error: 'Name required' }, { status: 400 });

    const { rows } = await pool.query<Tag>(
      `INSERT INTO tags (user_id, name, color_bg, color_text, color_border)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userId, name.trim(), color_bg || '#E6F1FB', color_text || '#0C447C', color_border || '#B5D4F4']
    );
    return NextResponse.json<ApiResponse<Tag>>({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create tag' }, { status: 500 });
  }
}
