// app/calendar/page.tsx
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appointment, AppointmentStatus, CalendarDayEvents, CalendarEventsResponse } from '@/types';
import Toaster from '@/components/Toaster';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_DAYS   = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const REMIND_OPTS = [
  { value: 0,    label: 'ไม่แจ้ง' },
  { value: 5,    label: '5 นาที' },
  { value: 15,   label: '15 นาที' },
  { value: 30,   label: '30 นาที' },
  { value: 60,   label: '1 ชั่วโมง' },
  { value: 1440, label: '1 วัน' },
];

const EMPTY_FORM = {
  title: '', description: '', location: '',
  start_at: '', end_at: '', is_all_day: false,
  status: 'confirmed' as AppointmentStatus,
  remind_before_min: 15, notes: '', is_recurring: false, recur_rule: '',
};

const EMPTY_DAY: CalendarDayEvents = {
  date: '',
  appointments: [],
  checklists: [],
  due_tasks: [],
  done_tasks: [],
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function progressColor(done: number, total: number) {
  if (!total) return 'var(--text-muted)';
  const pct = done / total;
  if (pct >= 1) return 'var(--success)';
  if (pct >= 0.7) return 'var(--med)';
  if (pct > 0) return 'var(--high)';
  return 'var(--danger)';
}

function dayTitle(date: Date) {
  return date.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CalendarPage() {
  const today = new Date();
  const toast = useToast();

  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const [calendar, setCalendar] = useState<CalendarEventsResponse | null>(null);
  const [navLoading, setNavLoading] = useState<'prev' | 'next' | null>(null);

  const [filters, setFilters] = useState({
    appointments: true,
    checklists: true,
    tasks: true,
  });

  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [confirm, setConfirm]       = useState<{ open: boolean; id: string; soft: boolean }>({
    open: false, id: '', soft: false,
  });
  const [attendees, setAttendees]   = useState<{name:string;email:string}[]>([]);
  const [newAttName, setNewAttName] = useState('');
  const [newAttEmail, setNewAttEmail] = useState('');

  const monthFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthTo = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const fetchCalendar = useCallback(async () => {
    try {
      const eventRes = await fetch(`/api/calendar/events?from=${monthFrom}&to=${monthTo}`).then(r => r.json());
      setCalendar(eventRes.data || null);
    } finally {
      setNavLoading(null);
    }
  }, [monthFrom, monthTo]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDayEvents>();
    for (const day of calendar?.days || []) map.set(day.date, day);
    return map;
  }, [calendar]);

  const selectedKey = dateKey(selected);
  const selectedEvents = dayMap.get(selectedKey) || { ...EMPTY_DAY, date: selectedKey };

  const changeMonth = (delta: number) => {
    setNavLoading(delta < 0 ? 'prev' : 'next');
    const next = new Date(year, month + delta, 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setYear(next.getFullYear());
    setMonth(next.getMonth());
    setSelected(new Date(next.getFullYear(), next.getMonth(), Math.min(selected.getDate(), lastDay)));
  };

  const setMonthValue = (nextMonth: number) => {
    setNavLoading(null);
    const lastDay = new Date(year, nextMonth + 1, 0).getDate();
    setMonth(nextMonth);
    setSelected(new Date(year, nextMonth, Math.min(selected.getDate(), lastDay)));
  };

  const setYearValue = (nextYear: number) => {
    setNavLoading(null);
    const lastDay = new Date(nextYear, month + 1, 0).getDate();
    setYear(nextYear);
    setSelected(new Date(nextYear, month, Math.min(selected.getDate(), lastDay)));
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  const openCreate = (date = selected) => {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    const e = new Date(d); e.setHours(10, 0, 0, 0);
    setForm({ ...EMPTY_FORM, start_at: toLocalISO(d), end_at: toLocalISO(e) });
    setEditId(null);
    setAttendees([]);
    setNewAttName(''); setNewAttEmail('');
    setShowForm(true);
  };

  const openEdit = (a: Appointment) => {
    setForm({
      title: a.title, description: a.description || '', location: a.location || '',
      start_at: toLocalISO(new Date(a.start_at)),
      end_at:   toLocalISO(new Date(a.end_at)),
      is_all_day: a.is_all_day, status: a.status,
      remind_before_min: a.remind_before_min || 15,
      notes: a.notes || '', is_recurring: a.is_recurring, recur_rule: a.recur_rule || '',
    });
    setEditId(a.id);
    setAttendees((a.attendees || []).map(at => ({ name: at.name, email: at.email || '' })));
    setNewAttName(''); setNewAttEmail('');
    setShowForm(true);
  };

  const saveAppt = async () => {
    if (!form.title.trim() || !form.start_at || !form.end_at) {
      toast.show('กรุณาใส่ชื่อ, วันเวลาเริ่ม และสิ้นสุด', 'error'); return;
    }
    setSaving(true);
    const url    = editId ? `/api/appointments/${editId}` : '/api/appointments';
    const method = editId ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, start_at: new Date(form.start_at).toISOString(), end_at: new Date(form.end_at).toISOString(), attendees }),
    });
    setSaving(false);
    if (res.ok) {
      toast.show(editId ? 'แก้ไขนัดหมายแล้ว ✓' : 'สร้างนัดหมายแล้ว ✓');
      setShowForm(false); setEditId(null);
      fetchCalendar();
    } else {
      toast.show('เกิดข้อผิดพลาด', 'error');
    }
  };

  const doDelete = async (id: string, soft: boolean) => {
    const url = soft ? `/api/appointments/${id}?cancel=true` : `/api/appointments/${id}`;
    await fetch(url, { method: soft ? 'PATCH' : 'DELETE' });
    toast.show(soft ? 'ยกเลิกนัดหมายแล้ว' : 'ลบนัดหมายแล้ว', 'info');
    fetchCalendar();
  };

  const setF = (partial: Partial<typeof form>) => setForm(f => ({ ...f, ...partial }));

  return (
    <>
      <Toaster toasts={toast.toasts} onDismiss={toast.dismiss} />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.soft ? 'ยกเลิกนัดหมาย?' : 'ลบนัดหมาย?'}
        message={confirm.soft ? 'สถานะจะเปลี่ยนเป็น "ยกเลิก" แต่ยังเก็บข้อมูลไว้' : 'ลบถาวร ไม่สามารถกู้คืนได้'}
        confirmLabel={confirm.soft ? 'ยกเลิกนัด' : 'ลบถาวร'}
        danger
        onConfirm={() => { doDelete(confirm.id, confirm.soft); setConfirm(c => ({ ...c, open: false })); }}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      <div className="page-stack calendar-page">
        <section className="page-stack">
          <div className="page-header" style={{ alignItems:'flex-end' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 600 }}>ปฏิทินรวม</h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                รวม daily checklist, task และนัดหมายในเดือนเดียวกัน
              </p>
            </div>
            <div className="toolbar calendar-toolbar">
              <div className="calendar-month-controls">
                <button className="btn btn-secondary btn-icon btn-sm calendar-month-arrow" onClick={() => changeMonth(-1)} disabled={navLoading === 'prev'}>
                  {navLoading === 'prev' ? <span className="spinner" style={{ width:14, height:14 }} /> : '‹'}
                </button>
                <select className="input calendar-month-select" value={month} onChange={e => setMonthValue(Number(e.target.value))}>
                  {TH_MONTHS.map((name, index) => (
                    <option key={name} value={index}>{name}</option>
                  ))}
                </select>
                <select className="input calendar-year-select" value={year} onChange={e => setYearValue(Number(e.target.value))}>
                  {Array.from({ length: 9 }, (_, index) => year - 4 + index).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button className="btn btn-secondary btn-icon btn-sm calendar-month-arrow" onClick={() => changeMonth(1)} disabled={navLoading === 'next'}>
                  {navLoading === 'next' ? <span className="spinner" style={{ width:14, height:14 }} /> : '›'}
                </button>
              </div>
              {([
                ['appointments', 'นัดหมาย'],
                ['checklists', 'Daily'],
                ['tasks', 'Tasks'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  className={`btn btn-sm calendar-filter-btn ${filters[key] ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="card calendar-board" style={{ padding: 18 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap: 8 }}>
              {TH_DAYS.map(day => (
                <div key={day} style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', padding:'4px 0' }}>{day}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`blank-${i}`} className="calendar-day-blank" />
              ))}
              {monthDays.map(thisDate => {
                const key = dateKey(thisDate);
                const events = dayMap.get(key) || { ...EMPTY_DAY, date: key };
                const isSelected = sameDay(thisDate, selected);
                const isToday = sameDay(thisDate, today);
                return (
                  <button
                    key={key}
                    className="calendar-day-cell"
                    onClick={() => setSelected(thisDate)}
                    style={{
                      minHeight: 150,
                      textAlign:'left',
                      padding: 12,
                      borderRadius:'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      background: isSelected ? 'var(--accent-soft)' : 'rgba(255,255,255,0.72)',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                      cursor:'pointer',
                    }}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{
                        width:24, height:24, borderRadius:'50%',
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:isToday ? 700 : 500,
                        color: isToday ? 'var(--accent-fg)' : 'var(--text-primary)',
                        background: isToday ? 'var(--accent)' : 'transparent',
                      }}>{thisDate.getDate()}</span>
                      {filters.appointments && events.appointments.length > 0 && (
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>{events.appointments.length} นัด</span>
                      )}
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {filters.checklists && events.checklists.slice(0, 2).map(item => (
                        <div key={item.id} style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                          <span style={{
                            width:7, height:7, borderRadius:'50%', flexShrink:0,
                            background: progressColor(item.done_items, item.total_items),
                          }} />
                          <span style={{ fontSize:10, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {item.template_name} {item.done_items}/{item.total_items}
                          </span>
                        </div>
                      ))}
                      {filters.tasks && events.due_tasks.length > 0 && (
                        <div style={{ fontSize:10, color:'var(--high)' }}>งาน {events.due_tasks.length}</div>
                      )}
                      {filters.tasks && events.done_tasks.length > 0 && (
                        <div style={{ fontSize:10, color:'var(--success)' }}>เสร็จ {events.done_tasks.length}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600 }}>{dayTitle(selected)}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  เลือกจากช่องวันในปฏิทินเพื่อดูรายละเอียดหรือเพิ่มนัดหมาย
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => openCreate(selected)}>+ เพิ่มนัดหมาย</button>
            </div>

            <div className="calendar-day-detail-grid">
              <div>
                <div className="section-label" style={{ marginBottom:8 }}>Daily Checklist</div>
                {selectedEvents.checklists.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>ไม่มี checklist log</div>
                ) : selectedEvents.checklists.map(item => (
                  <div key={item.id} style={{ fontSize:12, marginBottom:6, display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:progressColor(item.done_items, item.total_items) }} />
                    <span>{item.template_name} {item.done_items}/{item.total_items}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="section-label" style={{ marginBottom:8 }}>Tasks</div>
                {[...selectedEvents.due_tasks, ...selectedEvents.done_tasks].length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>ไม่มี task ในวันนี้</div>
                ) : (
                  <>
                    {selectedEvents.due_tasks.map(task => (
                      <div key={`due-${task.id}`} style={{ fontSize:12, marginBottom:6, color:'var(--high)' }}>• {task.title}</div>
                    ))}
                    {selectedEvents.done_tasks.map(task => (
                      <div key={`done-${task.id}`} style={{ fontSize:12, marginBottom:6, color:'var(--success)' }}>✓ {task.title}</div>
                    ))}
                  </>
                )}
              </div>
              <div>
                <div className="section-label" style={{ marginBottom:8 }}>นัดหมาย</div>
                {selectedEvents.appointments.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>ไม่มีนัดหมาย</div>
                ) : selectedEvents.appointments.map(a => (
                  <div key={a.id} style={{
                    fontSize:12, marginBottom:8, padding:'8px 10px',
                    border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)',
                    background:'var(--bg)',
                  }}>
                    <div className="calendar-appointment-row">
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontWeight:500 }}>{a.title}</div>
                        <div style={{ color:'var(--text-muted)', marginTop:2 }}>
                          {a.is_all_day ? 'ทั้งวัน' : `${fmtTime(a.start_at)} - ${fmtTime(a.end_at)}`}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:12 }}
                          onClick={() => openEdit(a)} title="แก้ไข">✏</button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:12, color:'var(--text-muted)' }}
                          onClick={() => setConfirm({ open:true, id:a.id, soft:true })} title="ยกเลิกนัด">🚫</button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:12, color:'var(--danger)' }}
                          onClick={() => setConfirm({ open:true, id:a.id, soft:false })} title="ลบ">🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 100, backdropFilter: 'blur(2px)',
          }} />
          <div className="card calendar-modal" style={{
            zIndex: 101, padding: 24,
            boxShadow: 'var(--shadow-lg)', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{editId ? 'แก้ไขนัดหมาย' : 'เพิ่มนัดหมาย'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>x</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>ชื่อนัดหมาย *</label>
                <input className="input" value={form.title} onChange={e => setF({ title: e.target.value })} autoFocus placeholder="เช่น ประชุมทีม, นัดหมอ..." />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>สถานที่</label>
                <input className="input" value={form.location} onChange={e => setF({ location: e.target.value })} placeholder="เช่น ออฟฟิศ, ออนไลน์..." />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="allday" checked={form.is_all_day} onChange={e => setF({ is_all_day: e.target.checked })} />
                <label htmlFor="allday" style={{ fontSize: 13, cursor: 'pointer' }}>ทั้งวัน</label>
              </div>

              {!form.is_all_day && (
                <div className="calendar-modal-row">
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>เริ่ม *</label>
                    <input type="datetime-local" className="input" value={form.start_at} onChange={e => setF({ start_at: e.target.value })} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>สิ้นสุด *</label>
                    <input type="datetime-local" className="input" value={form.end_at} onChange={e => setF({ end_at: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="calendar-modal-row">
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>สถานะ</label>
                  <select className="input" value={form.status} onChange={e => setF({ status: e.target.value as AppointmentStatus })}>
                    <option value="confirmed">ยืนยัน</option>
                    <option value="pending">รอยืนยัน</option>
                    <option value="cancelled">ยกเลิก</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>แจ้งเตือนล่วงหน้า</label>
                  <select className="input" value={form.remind_before_min} onChange={e => setF({ remind_before_min: parseInt(e.target.value) })}>
                    {REMIND_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                <textarea className="input" value={form.notes} onChange={e => setF({ notes: e.target.value })}
                  rows={3} placeholder="รายละเอียดเพิ่มเติม..." style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={e => setF({ is_recurring: e.target.checked })} />
                <label htmlFor="recurring" style={{ fontSize: 13, cursor: 'pointer' }}>ทำซ้ำ (Recurring)</label>
              </div>
              {form.is_recurring && (
                <input className="input" value={form.recur_rule} onChange={e => setF({ recur_rule: e.target.value })}
                  placeholder="iCal RRULE เช่น FREQ=WEEKLY;BYDAY=MO" style={{ fontSize: 12 }} />
              )}

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  ผู้เข้าร่วม ({attendees.length} คน)
                </label>
                {attendees.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {attendees.map((att, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)',
                      }}>
                        <span style={{ fontSize: 13, flex: 1 }}>👤 {att.name}{att.email && ` (${att.email})`}</span>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}
                          onClick={() => setAttendees(prev => prev.filter((_, j) => j !== i))}>x</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <input className="input" value={newAttName} onChange={e => setNewAttName(e.target.value)}
                    placeholder="ชื่อ *" style={{ flex: 1, minWidth: 100, padding: '6px 10px', fontSize: 13 }} />
                  <input className="input" value={newAttEmail} onChange={e => setNewAttEmail(e.target.value)}
                    placeholder="อีเมล (ไม่บังคับ)" type="email"
                    style={{ flex: 1, minWidth: 140, padding: '6px 10px', fontSize: 13 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newAttName.trim()) {
                        setAttendees(prev => [...prev, { name: newAttName.trim(), email: newAttEmail.trim() }]);
                        setNewAttName(''); setNewAttEmail('');
                      }
                    }} />
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (!newAttName.trim()) return;
                      setAttendees(prev => [...prev, { name: newAttName.trim(), email: newAttEmail.trim() }]);
                      setNewAttName(''); setNewAttEmail('');
                    }}>+ เพิ่ม</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={saveAppt} disabled={saving}>
                {saving ? <><span className="spinner" /> กำลังบันทึก...</> : (editId ? 'บันทึก' : '+ เพิ่ม')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
