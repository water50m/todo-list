// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, Category } from '@/types';

const DEFAULT_USER = '00000000-0000-0000-0000-000000000001';

// GET /api/categories
export async function GET() {
  try {
    const { rows } = await pool.query<Category>(
      `SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC`,
      [DEFAULT_USER]
    );
    return NextResponse.json<ApiResponse<Category[]>>({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(req: NextRequest) {
  try {
    const { name, color, icon } = await req.json();
    if (!name?.trim()) return NextResponse.json<ApiResponse<null>>({ error: 'Name required' }, { status: 400 });

    const { rows } = await pool.query<Category>(
      `INSERT INTO categories (user_id, name, color, icon) VALUES ($1,$2,$3,$4) RETURNING *`,
      [DEFAULT_USER, name.trim(), color || '#378ADD', icon || '📁']
    );
    return NextResponse.json<ApiResponse<Category>>({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create category' }, { status: 500 });
  }
}
