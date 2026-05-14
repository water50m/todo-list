// app/dashboard/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardStats, Appointment } from '@/types';

const PRIORITY_ORDER = ['urgent','high','med','low'] as const;
const PRIORITY_LABELS: Record<string,string> = { urgent:'ด่วนมาก', high:'สำคัญ', med:'ปกติ', low:'ไม่เร่ง' };
const PRIORITY_COLORS: Record<string,string> = {
  urgent:'var(--urgent)', high:'var(--high)', med:'var(--med)', low:'var(--low)',
};

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
      <div style={{ fontSize: 28, fontWeight: 600, color: accent || 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color }: { label:string; value:number; max:number; color:string }) {
  const pct = max > 0 ? Math.round((value/max)*100) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
      <span style={{ width:80, fontSize:12, color:'var(--text-secondary)', flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, background:'var(--bg-muted)', borderRadius:99, height:8, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.6s ease' }} />
      </div>
      <span style={{ width:24, fontSize:12, color:'var(--text-primary)', textAlign:'right', flexShrink:0 }}>{value}</span>
    </div>
  );
}

function MiniLineChart({ data }: { data: Array<{date:string; done:number; total:number}> }) {
  if (!data.length) return (
    <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:12 }}>
      ไม่มีข้อมูล
    </div>
  );
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const W=280, H=80, PAD=6;
  const xStep = (W-PAD*2) / Math.max(data.length-1, 1);
  const pts = (key: 'done'|'total') =>
    data.map((d,i) => `${PAD+i*xStep},${H-PAD-(d[key]/maxVal)*(H-PAD*2)}`).join(' ');
  const TH_D = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  return (
    <svg viewBox={`0 0 ${W} ${H+18}`} style={{ width:'100%', overflow:'visible' }}>
      <polyline points={pts('total')} fill="none" stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 3" />
      {data.length > 1 && (
        <polygon
          points={`${PAD},${H-PAD} ${pts('done')} ${PAD+(data.length-1)*xStep},${H-PAD}`}
          fill="var(--med)" opacity={0.12} />
      )}
      <polyline points={pts('done')} fill="none" stroke="var(--med)" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d,i) => {
        const x=PAD+i*xStep, y=H-PAD-(d.done/maxVal)*(H-PAD*2);
        const dow = new Date(d.date).getDay();
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill="var(--med)" />
            <text x={x} y={H+14} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{TH_D[dow]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      setStats(d.data || null);
      setLoading(false);
    });
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

  const maxPriority = Math.max(...Object.values(stats.tasks_by_priority), 1);
  const maxCategory = Math.max(...stats.tasks_by_category.map(c => c.count), 1);

  return (
    <div className="page-stack">
      {/* Header */}
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

      {/* Stat cards — clickable to filter tasks */}
      <div className="dashboard-stats">
        <StatCard value={stats.total_tasks} label="งานทั้งหมด" sub="รายการที่สร้าง"
          onClick={() => router.push('/tasks')} />
        <StatCard value={`${stats.completion_rate}%`} label="Completion Rate"
          sub={`เสร็จ ${stats.done_tasks} รายการ`} accent="var(--success)"
          onClick={() => router.push('/tasks?status=done')} />
        <StatCard value={stats.overdue_tasks} label="เกินกำหนด" sub="ต้องรีบทำ"
          accent={stats.overdue_tasks > 0 ? 'var(--danger)' : undefined}
          onClick={() => router.push('/tasks?status=todo')} />
        <StatCard value={`🔥 ${stats.streak_count}`} label="Daily Streak"
          sub="วันติดต่อกัน" accent="var(--high)"
          onClick={() => router.push('/daily')} />
      </div>

      {/* Charts row */}
      <div className="dashboard-grid">
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>ความคืบหน้า 7 วัน</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:12 }}>
              <span><span style={{ color:'var(--med)' }}>——</span> เสร็จ</span>
              <span style={{ color:'var(--border)' }}>- - -</span>
              <span style={{ color:'var(--text-muted)' }}>ทั้งหมด</span>
            </div>
          </div>
          <MiniLineChart data={stats.daily_completion} />
        </div>

        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Priority Breakdown</div>
          {PRIORITY_ORDER.map(p => (
            <BarRow key={p}
              label={PRIORITY_LABELS[p]} value={stats.tasks_by_priority[p]}
              max={maxPriority} color={PRIORITY_COLORS[p]} />
          ))}
        </div>
      </div>

      {/* Second row */}
      <div className="dashboard-grid">
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>หมวดหมู่</div>
          {stats.tasks_by_category.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>ยังไม่มีข้อมูล</div>
          ) : stats.tasks_by_category.map(cat => (
            <BarRow key={cat.name} label={cat.name} value={cat.count} max={maxCategory} color={cat.color} />
          ))}
        </div>

        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Recurring Tasks (30 วัน)</div>
          {stats.recurring_tasks.length === 0 ? (
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>ยังไม่มี recurring tasks</div>
          ) : stats.recurring_tasks.map(rt => (
            <div key={rt.title} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:'var(--text-secondary)' }}>{rt.title}</span>
                <span style={{ fontWeight:500 }}>{rt.completion_rate}%</span>
              </div>
              <div style={{ background:'var(--bg-muted)', borderRadius:99, height:6, overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:99, width:`${rt.completion_rate}%`,
                  background: rt.completion_rate >= 80 ? 'var(--success)' : rt.completion_rate >= 50 ? 'var(--med)' : 'var(--high)',
                  transition:'width 0.5s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="card" style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>นัดหมายที่กำลังจะมา (7 วัน)</div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/calendar')}>
            ดูทั้งหมด →
          </button>
        </div>
        {stats.upcoming_appointments.length === 0 ? (
          <div style={{ fontSize:12, color:'var(--text-muted)', padding:'4px 0' }}>ไม่มีนัดหมายในช่วงนี้</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {stats.upcoming_appointments.map((a: Appointment) => {
              const start = new Date(a.start_at);
              const diff  = Math.ceil((start.getTime() - Date.now()) / 86400000);
              return (
                <div key={a.id} onClick={() => router.push('/calendar')}
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

      {/* Quick actions */}
      <div className="quick-actions-grid">
        {[
          { icon:'📋', label:'ดู Tasks ทั้งหมด',     href:'/tasks' },
          { icon:'☀️', label:'Daily Checklist',      href:'/daily' },
          { icon:'⚙️', label:'จัดการ Template',      href:'/settings' },
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
