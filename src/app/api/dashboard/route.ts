// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ApiResponse, DashboardStats } from '@/types';

const DEFAULT_USER = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const [
      taskStats,
      tasksByPriority,
      tasksByCategory,
      dailyCompletion,
      upcomingAppts,
      recurringTasks,
      streakRow,
    ] = await Promise.all([
      // Overall task counts
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE status != 'cancelled') AS total,
          COUNT(*) FILTER (WHERE status = 'done') AS done,
          COUNT(*) FILTER (WHERE status != 'done' AND status != 'cancelled' AND due_date < CURRENT_DATE) AS overdue
         FROM tasks WHERE user_id = $1`,
        [DEFAULT_USER]
      ),

      // By priority
      pool.query(
        `SELECT priority, COUNT(*) AS count
         FROM tasks WHERE user_id = $1 AND status != 'cancelled'
         GROUP BY priority`,
        [DEFAULT_USER]
      ),

      // By category
      pool.query(
        `SELECT c.name, c.color, COUNT(t.id) AS count
         FROM tasks t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1 AND t.status != 'cancelled'
         GROUP BY c.id
         ORDER BY count DESC LIMIT 6`,
        [DEFAULT_USER]
      ),

      // Daily completion past 7 days
      pool.query(
        `SELECT
          log_date::text AS date,
          done_items AS done,
          total_items AS total
         FROM checklist_logs
         WHERE user_id = $1 AND log_date >= CURRENT_DATE - 6
         ORDER BY log_date ASC`,
        [DEFAULT_USER]
      ),

      // Upcoming appointments (next 7 days)
      pool.query(
        `SELECT a.*,
          COALESCE(json_agg(jsonb_build_object(
            'id',aa.id,'name',aa.name,'email',aa.email,'rsvp_status',aa.rsvp_status
          )) FILTER (WHERE aa.id IS NOT NULL),'[]') AS attendees
         FROM appointments a
         LEFT JOIN appointment_attendees aa ON aa.appointment_id = a.id
         WHERE a.user_id = $1
           AND a.start_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
           AND a.status != 'cancelled'
         GROUP BY a.id
         ORDER BY a.start_at ASC LIMIT 5`,
        [DEFAULT_USER]
      ),

      // Recurring task completion rates (last 30 days)
      pool.query(
        `SELECT t.title,
          ROUND(
            COUNT(*) FILTER (WHERE t.status = 'done')::numeric / NULLIF(COUNT(*),0) * 100
          ) AS completion_rate
         FROM tasks t
         WHERE t.user_id = $1
           AND t.recur_type != 'once'
           AND t.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY t.id
         ORDER BY completion_rate DESC LIMIT 5`,
        [DEFAULT_USER]
      ),

      // Current streak
      pool.query(
        `SELECT streak_count FROM checklist_logs
         WHERE user_id = $1
         ORDER BY log_date DESC LIMIT 1`,
        [DEFAULT_USER]
      ),
    ]);

    const total = parseInt(taskStats.rows[0]?.total || '0');
    const done  = parseInt(taskStats.rows[0]?.done  || '0');

    const byPriority: Record<string, number> = {};
    for (const r of tasksByPriority.rows) byPriority[r.priority] = parseInt(r.count);

    const stats: DashboardStats = {
      total_tasks: total,
      done_tasks: done,
      overdue_tasks: parseInt(taskStats.rows[0]?.overdue || '0'),
      streak_count: streakRow.rows[0]?.streak_count ?? 0,
      completion_rate: total ? Math.round((done / total) * 100) : 0,
      tasks_by_priority: {
        urgent: byPriority['urgent'] || 0,
        high:   byPriority['high']   || 0,
        med:    byPriority['med']    || 0,
        low:    byPriority['low']    || 0,
      },
      tasks_by_category: tasksByCategory.rows.map(r => ({
        name: r.name, color: r.color, count: parseInt(r.count),
      })),
      daily_completion: dailyCompletion.rows,
      upcoming_appointments: upcomingAppts.rows,
      recurring_tasks: recurringTasks.rows.map(r => ({
        title: r.title,
        completion_rate: parseInt(r.completion_rate || '0'),
      })),
    };

    return NextResponse.json<ApiResponse<DashboardStats>>({ data: stats });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}
