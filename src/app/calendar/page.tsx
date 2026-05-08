// app/calendar/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Appointment, AppointmentStatus } from '@/types';
import Toaster from '@/components/Toaster';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_DAYS   = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  confirmed: '#1D9E75', pending: '#EF9F27', cancelled: '#C93535',
};
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'ยืนยัน', pending: 'รอยืนยัน', cancelled: 'ยกเลิก',
};
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toLocalISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CalendarPage() {
  const today = new Date();
  const toast = useToast();

  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);
  const [appts, setAppts]   = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

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

  const fetchAppts = async () => {
    setLoading(true);
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const to   = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const res  = await fetch(`/api/appointments?from=${from}&to=${to}`);
    const data = await res.json();
    setAppts(data.data || []);
    setLoading(false);
  };
  useEffect(() => { fetchAppts(); }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const hasAppt = (d: number) => appts.some(a => a.status !== 'cancelled' && sameDay(new Date(a.start_at), new Date(year, month, d)));
  const selectedAppts = appts.filter(a => sameDay(new Date(a.start_at), selected)).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const openCreate = () => {
    // Pre-fill start_at with selected date 09:00
    const d = new Date(selected);
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
      fetchAppts();
    } else {
      toast.show('เกิดข้อผิดพลาด', 'error');
    }
  };

  const doDelete = async (id: string, soft: boolean) => {
    const url = soft ? `/api/appointments/${id}?cancel=true` : `/api/appointments/${id}`;
    await fetch(url, { method: soft ? 'PATCH' : 'DELETE' });
    toast.show(soft ? 'ยกเลิกนัดหมายแล้ว' : 'ลบนัดหมายแล้ว', 'info');
    fetchAppts();
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

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── Left: Mini Calendar ── */}
        <div style={{ flexShrink: 0, width: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600 }}>ปฏิทิน</h1>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ นัดหมาย</button>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={prevMonth}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{TH_MONTHS[month]} {year}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={nextMonth}>›</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {TH_DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', padding: '3px 0' }}>{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`b${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                const thisDate = new Date(year, month, d);
                const isSel   = sameDay(thisDate, selected);
                const isToday = sameDay(thisDate, today);
                const hasEvt  = hasAppt(d);
                return (
                  <div key={d} onClick={() => setSelected(thisDate)} style={{
                    height: 32, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    background: isSel ? 'var(--accent)' : 'transparent',
                    color: isSel ? 'var(--accent-fg)' : isToday ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isToday ? 700 : 400, fontSize: 13,
                    border: isToday && !isSel ? '1.5px solid var(--border)' : 'none',
                    transition: 'all 0.1s', gap: 1,
                  }}>
                    {d}
                    {hasEvt && (
                      <div style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: isSel ? 'rgba(255,255,255,0.7)' : 'var(--med)',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Month summary */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', fontSize: 12, color: 'var(--text-muted)' }}>
              {appts.filter(a => a.status !== 'cancelled').length} นัดหมายในเดือนนี้
            </div>
          </div>
        </div>

        {/* ── Right: Day appointments ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>
              {selected.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {selectedAppts.filter(a => a.status !== 'cancelled').length} นัดหมาย
            </p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="spinner" style={{ width: 20, height: 20 }} />
            </div>
          ) : selectedAppts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>ไม่มีนัดหมายในวันนี้</div>
              <button className="btn btn-secondary btn-sm" onClick={openCreate}>+ เพิ่มนัดหมาย</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedAppts.map(a => (
                <div key={a.id} className="card fade-in" style={{
                  padding: '14px 16px',
                  borderLeft: `3px solid ${STATUS_COLOR[a.status]}`,
                  opacity: a.status === 'cancelled' ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {a.is_all_day
                          ? <span>📅 ทั้งวัน</span>
                          : <span>🕐 {fmtTime(a.start_at)} – {fmtTime(a.end_at)}</span>}
                        {a.location && <span>📍 {a.location}</span>}
                        {a.remind_before_min ? <span>🔔 {a.remind_before_min} นาทีก่อน</span> : null}
                        {a.is_recurring && <span>🔁 ซ้ำ</span>}
                      </div>
                      {a.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>{a.notes}</div>
                      )}
                      {(a.attendees?.length || 0) > 0 && (
                        <div style={{ marginTop: 7, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {a.attendees!.map(att => (
                            <span key={att.id} className="badge" style={{
                              borderColor: 'var(--border)', background: 'var(--bg-muted)', color: 'var(--text-secondary)',
                            }}>👤 {att.name}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span className="badge" style={{
                        borderColor: STATUS_COLOR[a.status] + '66',
                        background: STATUS_COLOR[a.status] + '18',
                        color: STATUS_COLOR[a.status],
                      }}>{STATUS_LABEL[a.status]}</span>

                      {a.status !== 'cancelled' && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm"
                            style={{ fontSize: 13, color: 'var(--text-muted)' }}
                            onClick={() => openEdit(a)} title="แก้ไข">✏️</button>
                          <button className="btn btn-ghost btn-icon btn-sm"
                            style={{ fontSize: 13, color: 'var(--text-muted)' }}
                            onClick={() => setConfirm({ open: true, id: a.id, soft: true })} title="ยกเลิกนัด">🚫</button>
                          <button className="btn btn-ghost btn-icon btn-sm"
                            style={{ fontSize: 13, color: 'var(--text-muted)' }}
                            onClick={() => setConfirm({ open: true, id: a.id, soft: false })} title="ลบ">🗑</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create/Edit Form Modal ── */}
      {showForm && (
        <>
          <div onClick={() => setShowForm(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 100, backdropFilter: 'blur(2px)',
          }} />
          <div className="card slide-up" style={{
            position: 'fixed', top: '10%', left: '40%',
            transform: 'translate(-50%,-50%)',
            width: 480, zIndex: 101, padding: 24,
            boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{editId ? 'แก้ไขนัดหมาย' : 'เพิ่มนัดหมาย'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>✕</button>
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
                <div style={{ display: 'flex', gap: 10 }}>
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

              <div style={{ display: 'flex', gap: 10 }}>
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
              {/* Attendees */}
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
                          onClick={() => setAttendees(prev => prev.filter((_, j) => j !== i))}>✕</button>
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
                {saving ? <><span className="spinner" /> กำลังบันทึก...</> : (editId ? '✓ บันทึก' : '+ เพิ่ม')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
