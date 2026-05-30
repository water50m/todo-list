import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { isScheduledForDate } from '@/lib/recurrence';
import { ApiResponse, Appointment, CalendarDayEvents, CalendarEventsResponse, CalendarTaskEvent, TemplateItem } from '@/types';

type TemplateItemRow = TemplateItem & {
  template_name: string;
};

type ChecklistLogRow = {
  id: string;
  template_id: string;
  template_name: string;
  date: string;
  done_items: number;
  total_items: number;
};

type ChecklistItemLogRow = {
  log_id: string;
  template_item_id: string;
  is_done: boolean;
  done_at: string | null;
};

function dateOnly(value: string | Date) {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
}

function addDay(map: Map<string, CalendarDayEvents>, date: string) {
  if (!map.has(date)) {
    map.set(date, { date, appointments: [], checklists: [], due_tasks: [], done_tasks: [] });
  }
  return map.get(date)!;
}

function dateRange(from: string, to: string) {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const today = new Date();
    const fallbackFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const fallbackTo = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    const from = req.nextUrl.searchParams.get('from') || fallbackFrom;
    const to = req.nextUrl.searchParams.get('to') || fallbackTo;

    const [appointments, checklistLogs, templateItems, checklistItemLogs, tasks] = await Promise.all([
      pool.query<Appointment & { event_date: string }>(
        `SELECT a.*,
          a.start_at::date::text AS event_date,
          COALESCE(json_agg(jsonb_build_object(
            'id', aa.id, 'name', aa.name, 'email', aa.email, 'rsvp_status', aa.rsvp_status
          )) FILTER (WHERE aa.id IS NOT NULL), '[]') AS attendees
         FROM appointments a
         LEFT JOIN appointment_attendees aa ON aa.appointment_id = a.id
         WHERE a.user_id = $1
           AND a.status != 'cancelled'
           AND a.start_at >= $2
           AND a.start_at <= $3::date + INTERVAL '1 day' - INTERVAL '1 second'
         GROUP BY a.id
         ORDER BY a.start_at ASC`,
        [userId, from, to]
      ),
      pool.query<ChecklistLogRow>(
        `SELECT
          cl.id,
          cl.template_id,
          dt.name AS template_name,
          cl.log_date::text AS date,
          cl.done_items,
          cl.total_items
         FROM checklist_logs cl
         JOIN daily_templates dt ON dt.id = cl.template_id
         WHERE cl.user_id = $1 AND cl.log_date BETWEEN $2 AND $3
         ORDER BY cl.log_date ASC, dt.name ASC`,
        [userId, from, to]
      ),
      pool.query<TemplateItemRow>(
        `SELECT ti.*, dt.name AS template_name
         FROM daily_templates dt
         JOIN template_items ti ON ti.template_id = dt.id
         WHERE dt.user_id = $1
           AND dt.is_active = true
           AND ti.is_active = true
         ORDER BY dt.name ASC, ti.sort_order ASC`,
        [userId]
      ),
      pool.query<ChecklistItemLogRow>(
        `SELECT
          cil.log_id,
          cil.template_item_id,
          cil.is_done,
          cil.done_at::text AS done_at
         FROM checklist_item_logs cil
         JOIN checklist_logs cl ON cl.id = cil.log_id
         WHERE cl.user_id = $1
           AND cl.log_date BETWEEN $2 AND $3`,
        [userId, from, to]
      ),
      pool.query(
        `SELECT
          id,
          title,
          status,
          priority,
          due_date::text AS due_date,
          completed_at::date::text AS completed_date
         FROM tasks
         WHERE user_id = $1
           AND status != 'cancelled'
           AND (
             due_date BETWEEN $2 AND $3
             OR (completed_at IS NOT NULL AND completed_at::date BETWEEN $2 AND $3)
           )
         ORDER BY COALESCE(due_date, completed_at::date), title`,
        [userId, from, to]
      ),
    ]);

    const days = new Map<string, CalendarDayEvents>();

    for (const appt of appointments.rows) {
      const day = addDay(days, dateOnly(appt.event_date));
      day.appointments.push(appt);
    }

    const logMap = new Map<string, ChecklistLogRow>();
    for (const log of checklistLogs.rows) {
      logMap.set(`${log.template_id}:${dateOnly(log.date)}`, log);
    }

    const itemLogMap = new Map<string, ChecklistItemLogRow>();
    for (const itemLog of checklistItemLogs.rows) {
      itemLogMap.set(`${itemLog.log_id}:${itemLog.template_item_id}`, itemLog);
    }

    const templateMap = new Map<string, { name: string; items: TemplateItemRow[] }>();
    for (const item of templateItems.rows) {
      if (!templateMap.has(item.template_id)) {
        templateMap.set(item.template_id, { name: item.template_name, items: [] });
      }
      templateMap.get(item.template_id)!.items.push(item);
    }

    for (const date of dateRange(from, to)) {
      for (const [templateId, template] of templateMap) {
        const scheduledItems = template.items.filter(item => isScheduledForDate(item, date));
        if (!scheduledItems.length) continue;
        const log = logMap.get(`${templateId}:${date}`);
        addDay(days, date).checklists.push({
          id: log?.id || `${templateId}-${date}`,
          template_id: templateId,
          template_name: template.name,
          done_items: Number(log?.done_items || 0),
          total_items: Number(log?.total_items || scheduledItems.length),
          items: scheduledItems.map(item => {
            const itemLog = log ? itemLogMap.get(`${log.id}:${item.id}`) : undefined;
            const itemId = log ? `${log.id}-${item.id}` : `${templateId}-${date}-${item.id}`;
            return {
              id: itemId,
              template_item_id: item.id,
              title: item.title,
              is_done: !!itemLog?.is_done,
              done_at: itemLog?.done_at || undefined,
            };
          }),
        });
      }
    }

    for (const task of tasks.rows) {
      const baseTask: Omit<CalendarTaskEvent, 'date'> = {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
      };
      if (task.due_date) {
        const date = dateOnly(task.due_date);
        addDay(days, date).due_tasks.push({ ...baseTask, date });
      }
      if (task.completed_date && task.status === 'done') {
        const date = dateOnly(task.completed_date);
        addDay(days, date).done_tasks.push({ ...baseTask, date });
      }
    }

    const response: CalendarEventsResponse = {
      from,
      to,
      days: Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };

    return NextResponse.json<ApiResponse<CalendarEventsResponse>>({ data: response });
  } catch (err) {
    console.error(err);
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}
