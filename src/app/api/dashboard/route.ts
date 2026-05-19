// app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { ApiResponse, DashboardStats } from '@/types';

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const [
      taskStats,
      tasksByPriority,
      tasksByCategory,
      dailyCompletion,
      checklistRankingRows,
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
        [userId]
      ),

      // By priority
      pool.query(
        `SELECT priority, COUNT(*) AS count
         FROM tasks WHERE user_id = $1 AND status != 'cancelled'
         GROUP BY priority`,
        [userId]
      ),

      // By category
      pool.query(
        `SELECT c.name, c.color, COUNT(t.id) AS count
         FROM tasks t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1 AND t.status != 'cancelled'
         GROUP BY c.id
         ORDER BY count DESC LIMIT 6`,
        [userId]
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
        [userId]
      ),

      // Checklist item consistency ranking (last 30 logged occurrences)
      pool.query<{
        id: string;
        title: string;
        date: string | null;
        is_done: boolean | null;
      }>(
        `SELECT
          ti.id,
          ti.title,
          item_log.log_date::text AS date,
          item_log.is_done
         FROM template_items ti
         JOIN daily_templates dt ON dt.id = ti.template_id
         LEFT JOIN (
           SELECT
             cil.template_item_id,
             cl.log_date,
             cil.is_done
           FROM checklist_item_logs cil
           JOIN checklist_logs cl ON cl.id = cil.log_id
           WHERE cl.user_id = $1
             AND cl.log_date >= CURRENT_DATE - 29
         ) item_log ON item_log.template_item_id = ti.id
         WHERE dt.user_id = $1
           AND ti.is_active = true
         ORDER BY ti.sort_order, ti.title, item_log.log_date DESC`,
        [userId]
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
        [userId]
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
        [userId]
      ),

      // Current streak
      pool.query(
        `SELECT streak_count FROM checklist_logs
         WHERE user_id = $1
         ORDER BY log_date DESC LIMIT 1`,
        [userId]
      ),
    ]);

    const total = parseInt(taskStats.rows[0]?.total || '0');
    const done  = parseInt(taskStats.rows[0]?.done  || '0');

    const byPriority: Record<string, number> = {};
    for (const r of tasksByPriority.rows) byPriority[r.priority] = parseInt(r.count);

    const rankingMap = new Map<string, {
      id: string;
      title: string;
      logs: Array<{ date: string; is_done: boolean }>;
    }>();

    for (const row of checklistRankingRows.rows) {
      const current = rankingMap.get(row.id) || { id: row.id, title: row.title, logs: [] };
      if (row.date) {
        current.logs.push({ date: row.date, is_done: !!row.is_done });
      }
      rankingMap.set(row.id, current);
    }

    const checklistRankings = Array.from(rankingMap.values())
      .map(item => {
        const logs = item.logs.sort((a, b) => b.date.localeCompare(a.date));
        let currentStreak = 0;
        for (const log of logs) {
          if (!log.is_done) break;
          currentStreak += 1;
        }

        const doneCount = logs.filter(log => log.is_done).length;
        const totalCount = logs.length;
        const lastDone = logs.find(log => log.is_done)?.date;

        return {
          id: item.id,
          title: item.title,
          current_streak: currentStreak,
          completion_rate: totalCount ? Math.round((doneCount / totalCount) * 100) : 0,
          done_count: doneCount,
          total_count: totalCount,
          last_done_date: lastDone,
        };
      })
      .filter(item => item.total_count > 0)
      .sort((a, b) =>
        b.current_streak - a.current_streak ||
        b.completion_rate - a.completion_rate ||
        b.done_count - a.done_count ||
        a.title.localeCompare(b.title)
      )
      .slice(0, 5);

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
      checklist_rankings: checklistRankings,
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
