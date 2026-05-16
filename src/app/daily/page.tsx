// app/daily/page.tsx
'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChecklistLog, ChecklistItemLog, TemplateItem } from '@/types';
import Toaster from '@/components/Toaster';
import ChecklistItemModal from '@/components/ChecklistItemModal';
import { useToast } from '@/hooks/useToast';

function formatDate(d: Date) {
  return d.toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

export default function DailyPage() {
  const router = useRouter();
  const toast  = useToast();

  const [log, setLog]         = useState<ChecklistLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);

  const dateStr = viewDate.toISOString().split('T')[0];
  const isToday = dateStr === new Date().toISOString().split('T')[0];

  const fetchLog = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/checklist?date=${dateStr}`);
    const data = await res.json();
    setLog(data.data || null);
    setLoading(false);
  }, [dateStr]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const toggle = async (item: ChecklistItemLog) => {
    if (!isToday) return; // can't modify past days
    const newDone = !item.is_done;
    // Optimistic
    setLog(prev => {
      if (!prev) return prev;
      const items = prev.items!.map(it => it.id === item.id ? { ...it, is_done: newDone } : it);
      return { ...prev, items, done_items: items.filter(it => it.is_done).length };
    });
    await fetch('/api/checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_log_id: item.id, is_done: newDone }),
    });
    if (newDone) toast.show(`✓ ${item.template_item?.title}`, 'success');
  };

  const prevDay = () => setViewDate(d => { const n=new Date(d); n.setDate(n.getDate()-1); return n; });
  const nextDay = () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
    setViewDate(d => {
      const n=new Date(d); n.setDate(n.getDate()+1);
      return n > tomorrow ? d : n; // can't go to future beyond tomorrow
    });
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <span className="spinner" style={{ width:24, height:24 }} />
    </div>
  );
  if (!log) return (
    <div className="card" style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
      <div style={{ fontSize:28, marginBottom:12 }}>📋</div>
      ไม่พบ checklist — ไปที่{' '}
      <button className="btn btn-ghost btn-sm" onClick={() => router.push('/settings')}>
        Settings → Template
      </button> เพื่อตั้งค่า
    </div>
  );

  const pct = log.total_items > 0 ? Math.round((log.done_items / log.total_items) * 100) : 0;

  return (
    <>
      <Toaster toasts={toast.toasts} onDismiss={toast.dismiss} />
      <ChecklistItemModal
        open={!!editingItem}
        templateId={editingItem?.template_id || log.template_id}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSaved={() => { toast.show('บันทึก checklist แล้ว ✓'); fetchLog(); }}
      />

      <div className="page-stack daily-container">

        {/* Header */}
        <div className="page-header" style={{ alignItems:'center' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:600, marginBottom:4 }}>Daily Checklist</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={prevDay}>‹</button>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>
                {formatDate(viewDate)} {isToday && <span style={{ color:'var(--med)', fontWeight:500 }}>· วันนี้</span>}
              </span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={nextDay}
                style={{ opacity: isToday ? 0.3 : 1 }} disabled={isToday}>›</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {log.streak_count > 0 && (
              <div style={{
                display:'flex', alignItems:'center', gap:6, padding:'8px 12px',
                background:'var(--high-bg)', border:'1px solid #FDE68A', borderRadius:'var(--radius-lg)',
              }}>
                <span style={{ fontSize:18 }}>🔥</span>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--high)', lineHeight:1 }}>{log.streak_count}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>วันติดกัน</div>
                </div>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/settings')}>
              ⚙ จัดการ
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>ความคืบหน้า</span>
            <span style={{ fontSize:13, fontWeight:600 }}>
              {log.done_items}/{log.total_items} ({pct}%)
            </span>
          </div>
          <div style={{ background:'var(--bg-muted)', borderRadius:99, height:10, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:99, width:`${pct}%`,
              background: pct===100 ? 'var(--success)' : pct>=70 ? 'var(--med)' : pct>=40 ? 'var(--high)' : 'var(--danger)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          {pct === 100 && (
            <div style={{ marginTop:10, fontSize:13, color:'var(--success)', fontWeight:600 }}>
              🎉 เยี่ยม! ทำครบทุกรายการแล้ววันนี้
            </div>
          )}
          {!isToday && (
            <div style={{ marginTop:8, fontSize:12, color:'var(--text-muted)' }}>
              📅 กำลังดูข้อมูลวันที่ผ่านมา — ไม่สามารถแก้ไขได้
            </div>
          )}
        </div>

        {/* Checklist items */}
        {(log.items || []).length === 0 ? (
          <div className="card" style={{ padding:28, textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
            วันนี้ยังไม่มีรายการที่ต้องทำ
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(log.items || []).map(item => (
              <div key={item.id} className="card"
                onClick={() => toggle(item)}
                style={{
                  padding:'12px 16px',
                  display:'flex', alignItems:'center', gap:12,
                  cursor: isToday ? 'pointer' : 'default',
                  opacity: item.is_done ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (isToday) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>

                <div style={{
                  width:20, height:20, borderRadius:'var(--radius-sm)', flexShrink:0,
                  border:`1.5px solid ${item.is_done ? 'var(--success)' : 'var(--border)'}`,
                  background: item.is_done ? 'var(--success)' : 'var(--bg)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 0.15s',
                }}>
                  {item.is_done && <span style={{ fontSize:11, color:'white' }}>✓</span>}
                </div>

                <span style={{
                  flex:1, fontSize:14,
                  textDecoration: item.is_done ? 'line-through' : 'none',
                  color: item.is_done ? 'var(--text-muted)' : 'var(--text-primary)',
                }}>
                  {item.template_item?.title}
                </span>

                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  {item.done_at && (
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                      {new Date(item.done_at).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}
                    </span>
                  )}
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    aria-label="แก้ไขรายการ"
                    title="แก้ไขรายการ"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.template_item) setEditingItem(item.template_item);
                    }}
                    style={{ fontSize:13, minHeight:28, opacity:0.72 }}
                  >
                    ⚙
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}
