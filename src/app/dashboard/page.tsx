// app/dashboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment, ChecklistItemLog, ChecklistLog, DashboardStats } from '@/types';

function pct(done: number, total: number) {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function shortDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', { weekday:'short', day:'numeric' });
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function StatCard({ value, label, sub, accent, onClick }: {
  value: string|number; label: string; sub?: string; accent?: string; onClick?: () => void;
}) {
  return (
    <div className="card" onClick={onClick} style={{
      padding: '16px 20px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s',
    }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    onMouseLeave={e => { if (onClick) e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
      <div style={{ fontSize:28, fontWeight:700, color:accent || 'var(--text-primary)', lineHeight:1.1 }}>{value}</div>
      <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function MiniLineChart({ data }: { data: Array<{date:string; done:number; total:number}> }) {
  if (!data.length) return (
    <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:12 }}>
      ยังไม่มีข้อมูล daily checklist
    </div>
  );
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const W=320, H=96, PAD=8;
  const xStep = (W-PAD*2) / Math.max(data.length-1, 1);
  const pts = (key: 'done'|'total') =>
    data.map((d,i) => `${PAD+i*xStep},${H-PAD-(d[key]/maxVal)*(H-PAD*2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H+22}`} style={{ width:'100%', overflow:'visible' }}>
      <polyline points={pts('total')} fill="none" stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 3" />
      {data.length > 1 && (
        <polygon
          points={`${PAD},${H-PAD} ${pts('done')} ${PAD+(data.length-1)*xStep},${H-PAD}`}
          fill="var(--accent-2)" opacity={0.12} />
      )}
      <polyline points={pts('done')} fill="none" stroke="var(--accent-2)" strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((d,i) => {
        const x=PAD+i*xStep, y=H-PAD-(d.done/maxVal)*(H-PAD*2);
        return (
          <g key={d.date}>
            <circle cx={x} cy={y} r={3.5} fill="var(--accent-2)" />
            <text x={x} y={H+16} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{shortDate(d.date)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function UpcomingAppointmentsCard({ appointments, nowMs, onOpen }: { appointments: Appointment[]; nowMs: number; onOpen: () => void }) {
  return (
    <div className="card" style={{ padding:'16px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>นัดหมายที่กำลังจะมา (7 วัน)</div>
        <button className="btn btn-ghost btn-sm" onClick={onOpen}>ดูทั้งหมด →</button>
      </div>
      {appointments.length === 0 ? (
        <div style={{ fontSize:12, color:'var(--text-muted)', padding:'4px 0' }}>ไม่มีนัดหมายในช่วงนี้</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {appointments.map((a: Appointment) => {
            const start = new Date(a.start_at);
            const diff  = Math.ceil((start.getTime() - nowMs) / 86400000);
            return (
              <div key={a.id} onClick={onOpen}
                style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'10px 14px', background:'var(--bg)',
                  borderRadius:'var(--radius-md)', border:'1px solid var(--border-subtle)',
                  cursor:'pointer', transition:'box-shadow 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ textAlign:'center', width:36, flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:700, lineHeight:1 }}>{start.getDate()}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>
                    {start.toLocaleDateString('th-TH', { month:'short' })}
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{a.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:1 }}>
                    {start.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
                    {a.location && ` · ${a.location}`}
                  </div>
                </div>
                <span className="badge" style={{
                  borderColor: diff===0 ? 'var(--urgent)' : diff<=2 ? '#FDE68A' : 'var(--border)',
                  background:  diff===0 ? 'var(--urgent-bg)' : diff<=2 ? 'var(--high-bg)' : 'var(--bg-muted)',
                  color:       diff===0 ? 'var(--urgent)' : diff<=2 ? 'var(--high)' : 'var(--text-muted)',
                  flexShrink:0,
                }}>
                  {diff===0 ? 'วันนี้' : diff===1 ? 'พรุ่งนี้' : `${diff} วัน`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TodayChecklistCard({ log, onOpen }: { log: ChecklistLog | null; onOpen: () => void }) {
  const items = (log?.items || []).slice(0, 6);
  const rate = pct(log?.done_items || 0, log?.total_items || 0);

  return (
    <div className="card" style={{ padding:'18px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14, marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>Daily Checklist วันนี้</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
            {(log?.done_items || 0)}/{(log?.total_items || 0)} รายการเสร็จแล้ว
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onOpen}>เปิด Daily</button>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
        <div style={{
          width:78, height:78, borderRadius:'50%',
          display:'grid', placeItems:'center',
          background:`conic-gradient(var(--accent-2) ${rate * 3.6}deg, var(--bg-muted) 0deg)`,
          flexShrink:0,
        }}>
          <div style={{
            width:58, height:58, borderRadius:'50%', background:'var(--bg-card)',
            display:'grid', placeItems:'center', fontSize:18, fontWeight:800,
          }}>
            {rate}%
          </div>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ background:'var(--bg-muted)', borderRadius:99, height:10, overflow:'hidden' }}>
            <div style={{
              width:`${rate}%`, height:'100%', borderRadius:99,
              background: rate === 100 ? 'var(--success)' : 'var(--accent-2)',
              transition:'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:8 }}>
            {rate === 100 ? 'วันนี้ครบแล้ว เยี่ยมมาก' : log?.total_items ? `เหลือ ${(log.total_items - log.done_items)} รายการ` : 'วันนี้ยังไม่มี checklist'}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 0' }}>ยังไม่มีรายการสำหรับวันนี้</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {items.map((item: ChecklistItemLog) => (
            <div key={item.id} style={{
              display:'flex', alignItems:'center', gap:9,
              padding:'8px 10px', border:'1px solid var(--border-subtle)',
              borderRadius:'var(--radius-md)', background:'var(--bg)',
            }}>
              <span style={{
                width:18, height:18, borderRadius:'var(--radius-sm)',
                display:'grid', placeItems:'center',
                border:`1px solid ${item.is_done ? 'var(--success)' : 'var(--border)'}`,
                background:item.is_done ? 'var(--success)' : 'var(--bg-card)',
                color:'white', fontSize:10, flexShrink:0,
              }}>
                {item.is_done ? '✓' : ''}
              </span>
              <span style={{
                flex:1, minWidth:0, fontSize:13,
                color:item.is_done ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration:item.is_done ? 'line-through' : 'none',
              }}>
                {item.template_item?.title}
              </span>
              {item.done_at && (
                <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>
                  {new Date(item.done_at).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeekDailyCard({ data }: { data: Array<{date:string; done:number; total:number}> }) {
  const total = data.reduce((sum, day) => sum + day.total, 0);
  const done = data.reduce((sum, day) => sum + day.done, 0);
  const completeDays = data.filter(day => day.total > 0 && day.done === day.total).length;
  const activeDays = data.filter(day => day.total > 0).length;
  const rate = pct(done, total);

  return (
    <div className="card" style={{ padding:'16px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>ภาพรวม Daily 7 วัน</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
            เสร็จ {done}/{total} รายการ
          </div>
        </div>
        <span className="badge" style={{
          background:'var(--med-bg)', borderColor:'#BFDBFE', color:'var(--med)',
        }}>
          เฉลี่ย {rate}%
        </span>
      </div>
      <MiniLineChart data={data} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:8, marginTop:12 }}>
        <div style={{ background:'var(--bg)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px' }}>
          <div style={{ fontSize:17, fontWeight:800 }}>{activeDays}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>วันที่มี checklist</div>
        </div>
        <div style={{ background:'var(--bg)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px' }}>
          <div style={{ fontSize:17, fontWeight:800, color:'var(--success)' }}>{completeDays}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>วันที่ครบทั้งหมด</div>
        </div>
        <div style={{ background:'var(--bg)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px' }}>
          <div style={{ fontSize:17, fontWeight:800, color:'var(--accent-2)' }}>{Math.max(total - done, 0)}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>รายการที่เหลือ</div>
        </div>
      </div>
    </div>
  );
}

function TaskSnapshotCard({ stats, onOpen }: { stats: DashboardStats; onOpen: () => void }) {
  return (
    <div className="card" style={{ padding:'16px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700 }}>Task Snapshot</div>
        <button className="btn btn-ghost btn-sm" onClick={onOpen}>ดู Tasks →</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:8 }}>
        <div style={{ background:'var(--bg)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px' }}>
          <div style={{ fontSize:18, fontWeight:800 }}>{stats.total_tasks}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>ทั้งหมด</div>
        </div>
        <div style={{ background:'var(--bg)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px' }}>
          <div style={{ fontSize:18, fontWeight:800, color:'var(--success)' }}>{stats.completion_rate}%</div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>เสร็จแล้ว</div>
        </div>
        <div style={{ background:'var(--bg)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)', padding:'10px' }}>
          <div style={{ fontSize:18, fontWeight:800, color:stats.overdue_tasks ? 'var(--danger)' : 'var(--text-primary)' }}>
            {stats.overdue_tasks}
          </div>
          <div style={{ fontSize:11, color:'var(--text-muted)' }}>เกินกำหนด</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayLog, setTodayLog] = useState<ChecklistLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    const load = async () => {
      const today = localDateKey();
      const checklistData = await fetch(`/api/checklist?date=${today}`).then(r => r.json()).catch(() => ({ data:null }));
      const dashboardData = await fetch('/api/dashboard').then(r => r.json());
      setTodayLog(checklistData.data || null);
      setStats(dashboardData.data || null);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <span className="spinner" style={{ width:24, height:24 }} />
    </div>
  );
  if (!stats) return (
    <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
      ไม่สามารถโหลดข้อมูลได้ — กรุณาตรวจสอบ database connection
    </div>
  );

  const todayRate = pct(todayLog?.done_items || 0, todayLog?.total_items || 0);
  const weekDone = stats.daily_completion.reduce((sum, day) => sum + day.done, 0);
  const weekTotal = stats.daily_completion.reduce((sum, day) => sum + day.total, 0);
  const weekRate = pct(weekDone, weekTotal);

  return (
    <div className="page-stack">
      <div className="page-header" style={{ alignItems:'flex-end' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, marginBottom:4 }}>Dashboard</h1>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
          ↻ รีเฟรช
        </button>
      </div>

      {stats.upcoming_appointments.length > 0 && (
        <UpcomingAppointmentsCard appointments={stats.upcoming_appointments} nowMs={nowMs} onOpen={() => router.push('/calendar')} />
      )}

      <div className="dashboard-stats">
        <StatCard value={`${todayRate}%`} label="Daily วันนี้"
          sub={`${todayLog?.done_items || 0}/${todayLog?.total_items || 0} รายการ`}
          accent="var(--accent-2)" onClick={() => router.push('/daily')} />
        <StatCard value={`🔥 ${stats.streak_count}`} label="Daily Streak"
          sub="วันติดต่อกัน" accent="var(--high)" onClick={() => router.push('/daily')} />
        <StatCard value={`${weekRate}%`} label="Daily 7 วัน"
          sub={`เสร็จ ${weekDone}/${weekTotal} รายการ`} accent="var(--success)"
          onClick={() => router.push('/calendar')} />
        <StatCard value={stats.overdue_tasks} label="Task เกินกำหนด" sub="แสดงแบบย่อ"
          accent={stats.overdue_tasks > 0 ? 'var(--danger)' : undefined}
          onClick={() => router.push('/tasks?status=todo')} />
      </div>

      <div className="dashboard-grid">
        <TodayChecklistCard log={todayLog} onOpen={() => router.push('/daily')} />
        <WeekDailyCard data={stats.daily_completion} />
      </div>

      <div className="dashboard-grid">
        <TaskSnapshotCard stats={stats} onOpen={() => router.push('/tasks')} />
        {stats.upcoming_appointments.length === 0 ? (
          <UpcomingAppointmentsCard appointments={stats.upcoming_appointments} nowMs={nowMs} onOpen={() => router.push('/calendar')} />
        ) : (
          <div className="card" style={{ padding:'16px 20px' }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>ทางลัด Daily</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 }}>
              <button className="btn btn-secondary" onClick={() => router.push('/daily')} style={{ justifyContent:'center' }}>
                เปิด Daily
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/settings')} style={{ justifyContent:'center' }}>
                แก้ Template
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="quick-actions-grid">
        {[
          { icon:'☀️', label:'Daily Checklist', href:'/daily' },
          { icon:'📅', label:'ปฏิทินรวม', href:'/calendar' },
          { icon:'⚙️', label:'จัดการ Template', href:'/settings' },
        ].map(a => (
          <button key={a.href} onClick={() => router.push(a.href)}
            className="card btn"
            style={{
              padding:'14px 16px', justifyContent:'flex-start', gap:10,
              fontSize:13, fontWeight:500, background:'var(--bg-card)',
              border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)',
              cursor:'pointer', transition:'box-shadow 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)'}>
            <span style={{ fontSize:18 }}>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
