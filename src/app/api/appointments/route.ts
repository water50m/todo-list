// app/api/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, Appointment } from '@/types';

// GET /api/appointments?from=2026-05-01&to=2026-05-31
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions = ['a.user_id = $1'];
  const params: unknown[] = [userId];
  let idx = 2;

  if (from) { conditions.push(`a.start_at >= $${idx++}`); params.push(from); }
  if (to)   { conditions.push(`a.start_at <= $${idx++}`); params.push(to + ' 23:59:59'); }

  try {
    const { rows } = await pool.query<Appointment>(
      `SELECT a.*,
        COALESCE(json_agg(jsonb_build_object(
          'id', aa.id, 'name', aa.name, 'email', aa.email, 'rsvp_status', aa.rsvp_status
        )) FILTER (WHERE aa.id IS NOT NULL), '[]') AS attendees
      FROM appointments a
      LEFT JOIN appointment_attendees aa ON aa.appointment_id = a.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY a.id
      ORDER BY a.start_at ASC`,
      params
    );
    return NextResponse.json<ApiResponse<Appointment[]>>({ data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}

// POST /api/appointments
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json();
    const {
      title, description, location, start_at, end_at,
      is_all_day, status, is_recurring, recur_rule,
      remind_before_min, notes, attendees,
    } = body;

    if (!title?.trim() || !start_at || !end_at) {
      return NextResponse.json<ApiResponse<null>>({ error: 'title, start_at, end_at are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<Appointment>(
        `INSERT INTO appointments
          (user_id,title,description,location,start_at,end_at,is_all_day,status,is_recurring,recur_rule,remind_before_min,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          userId, title.trim(), description || null, location || null,
          start_at, end_at, is_all_day ?? false, status || 'confirmed',
          is_recurring ?? false, recur_rule || null, remind_before_min || null, notes || null,
        ]
      );

      const appt = rows[0];

      if (attendees?.length) {
        for (const a of attendees) {
          await client.query(
            `INSERT INTO appointment_attendees (appointment_id, name, email, rsvp_status) VALUES ($1,$2,$3,$4)`,
            [appt.id, a.name, a.email || null, a.rsvp_status || 'pending']
          );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json<ApiResponse<Appointment>>({ data: appt }, { status: 201 });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to create appointment' }, { status: 500 });
  }
}
