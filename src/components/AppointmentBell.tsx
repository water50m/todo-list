'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment } from '@/types';

function dateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function AppointmentBell() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const today = new Date();
    const from = dateKey(today);
    const to = dateKey(addDays(today, 7));

    fetch(`/api/appointments?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(data => {
        const rows: Appointment[] = data.data || [];
        setAppointments(rows.filter(item => item.status !== 'cancelled'));
      })
      .catch(() => setAppointments([]));
  }, []);

  const todayKey = dateKey(new Date());
  const todaysAppointments = useMemo(
    () => appointments.filter(item => dateKey(new Date(item.start_at)) === todayKey),
    [appointments, todayKey]
  );

  if (!todaysAppointments.length) return null;

  return (
    <div className="appointment-bell">
      {open && (
        <div className="appointment-bell-popover card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, marginBottom:8 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>นัดหมายวันนี้</div>
              <div style={{ fontSize:11, color:'var(--text-muted)' }}>{todaysAppointments.length} รายการ</div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)} aria-label="ปิดแจ้งเตือน">x</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {todaysAppointments.map(item => (
              <button
                key={item.id}
                className="appointment-bell-item"
                onClick={() => router.push('/calendar')}
              >
                <span style={{ fontWeight:650, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {item.title}
                </span>
                <span style={{ color:'var(--text-muted)', fontSize:11, flexShrink:0 }}>
                  {item.is_all_day ? 'ทั้งวัน' : fmtTime(item.start_at)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="appointment-bell-button"
        onClick={() => setOpen(value => !value)}
        aria-label="แจ้งเตือนนัดหมายวันนี้"
        title="แจ้งเตือนนัดหมายวันนี้"
      >
        <span aria-hidden>🔔</span>
        <span className="appointment-bell-count">{todaysAppointments.length}</span>
      </button>
    </div>
  );
}
