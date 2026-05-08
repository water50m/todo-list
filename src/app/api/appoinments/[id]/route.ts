// app/api/appointments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, Appointment, AppointmentStatus } from '@/types';

// GET /api/appointments/[id]
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { rows } = await pool.query<Appointment>(
      `SELECT a.*,
        COALESCE(json_agg(jsonb_build_object(
          'id',aa.id,'name',aa.name,'email',aa.email,'rsvp_status',aa.rsvp_status
        )) FILTER (WHERE aa.id IS NOT NULL),'[]') AS attendees
       FROM appointments a
       LEFT JOIN appointment_attendees aa ON aa.appointment_id = a.id
       WHERE a.id = $1 GROUP BY a.id`,
      [id]
    );
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<Appointment>>({ data: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH /api/appointments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const allowed = [
      'title','description','location','start_at','end_at',
      'is_all_day','status','is_recurring','recur_rule',
      'remind_before_min','notes',
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (key in body) { sets.push(`${key} = $${idx++}`); vals.push(body[key] ?? null); }
    }
    if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    vals.push(id);
    const { rows } = await pool.query<Appointment>(
      `UPDATE appointments SET ${sets.join(',')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Update attendees if provided
    if ('attendees' in body && Array.isArray(body.attendees)) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM appointment_attendees WHERE appointment_id = $1', [id]);
        for (const a of body.attendees) {
          await client.query(
            `INSERT INTO appointment_attendees (appointment_id, name, email, rsvp_status) VALUES ($1,$2,$3,$4)`,
            [id, a.name, a.email || null, a.rsvp_status || 'pending']
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    return NextResponse.json<ApiResponse<Appointment>>({ data: rows[0], message: 'Updated' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update appointment' }, { status: 500 });
  }
}

// DELETE /api/appointments/[id]  or soft-cancel via ?cancel=true
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cancel = req.nextUrl.searchParams.get('cancel') === 'true';
  try {
    if (cancel) {
      const { rows } = await pool.query<Appointment>(
        `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *`,
        ['cancelled' as AppointmentStatus, id]
      );
      if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json<ApiResponse<Appointment>>({ data: rows[0], message: 'Cancelled' });
    }
    const { rowCount } = await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
    if (!rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json<ApiResponse<null>>({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete appointment' }, { status: 500 });
  }
}
