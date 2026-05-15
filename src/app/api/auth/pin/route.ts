// app/api/auth/pin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signSession, setSessionCookie, verifyPin } from '@/lib/auth';
import pool from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { pin?: unknown };
    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

    if (!pin) {
      return NextResponse.json(
        { ok: false, success: false, error: 'PIN is required' },
        { status: 400 },
      );
    }

    const { rows } = await pool.query<{
      id: string;
      name: string;
      pin_hash: string;
    }>(
      `SELECT id, name, pin_hash
       FROM users
       WHERE is_active = true
       ORDER BY created_at ASC`,
    );

    const user = rows.find((row) => verifyPin(pin, row.pin_hash));

    if (!user) {
      return NextResponse.json(
        { ok: false, success: false, error: 'Invalid PIN' },
        { status: 401 },
      );
    }

    const token = signSession(user.id);
    const response = NextResponse.json({
      ok: true,
      success: true,
      token,
      user: { id: user.id, name: user.name },
    });

    setSessionCookie(response, token);

    return response;
  } catch (err) {
    console.error('PIN auth failed:', err);
    return NextResponse.json(
      { ok: false, success: false, error: 'Failed to authenticate PIN' },
      { status: 500 },
    );
  }
}
