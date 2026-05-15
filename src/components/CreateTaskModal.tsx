'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Priority, Task } from '@/types';

interface Props {
  open: boolean;
  task?: Task | null;
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'urgent', label: 'ด่วนมาก' },
  { value: 'high', label: 'สำคัญ' },
  { value: 'med', label: 'ปกติ' },
  { value: 'low', label: 'ไม่เร่ง' },
];

const INITIAL = {
  title: '',
  description: '',
  priority: 'med' as Priority,
};

export default function CreateTaskModal({ open, task, onClose, onCreated }: Props) {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'med',
    });
    setError('');
  }, [open, task]);

  if (!open) return null;

  const set = (partial: Partial<typeof INITIAL>) => setForm(f => ({ ...f, ...partial }));

  const submit = async () => {
    if (!form.title.trim()) {
      setError('กรุณาใส่ชื่องาน');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(task ? `/api/tasks/${task.id}` : '/api/tasks', {
        method: task ? 'PATCH' : 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setError('');
    onClose();
  };

  return (
    <>
      <div onClick={close} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.3)',
        zIndex:100, backdropFilter:'blur(2px)',
      }} />

      <div className="slide-up task-drawer" style={{
        background:'var(--bg-card)',
        borderLeft:'1px solid var(--border)',
        zIndex:101, display:'flex', flexDirection:'column',
        boxShadow:'var(--shadow-lg)',
      }}>
        <div style={{
          padding:'20px 24px 16px',
          borderBottom:'1px solid var(--border-subtle)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:600 }}>
              {task ? 'แก้ไข Task' : 'สร้าง Task ใหม่'}
            </h2>
            {error && <p style={{ fontSize:12, color:'var(--danger)', marginTop:3 }}>{error}</p>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={close} style={{ fontSize:18 }}>x</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:500, marginBottom:6, color:'var(--text-secondary)' }}>
              ชื่องาน <span style={{ color:'var(--danger)' }}>*</span>
            </label>
            <input
              className="input"
              value={form.title}
              onChange={e => set({ title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="เช่น ส่งรายงาน, ซื้อของ..."
              autoFocus
            />
          </div>

          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:500, marginBottom:6, color:'var(--text-secondary)' }}>
              รายละเอียด
            </label>
            <textarea
              className="input"
              value={form.description}
              onChange={e => set({ description: e.target.value })}
              placeholder="รายละเอียดเพิ่มเติม..."
              rows={5}
              style={{ resize:'vertical', fontFamily:'var(--font-body)' }}
            />
          </div>

          <div>
            <div style={{ fontSize:12, fontWeight:500, marginBottom:8, color:'var(--text-secondary)' }}>
              ความสำคัญ
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 }}>
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`btn ${form.priority === p.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => set({ priority: p.value })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          padding:'16px 24px',
          borderTop:'1px solid var(--border-subtle)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <button className="btn btn-ghost" onClick={close}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <><span className="spinner" />กำลังบันทึก...</> : task ? 'บันทึก' : 'เพิ่ม Task'}
          </button>
        </div>
      </div>
    </>
  );
}
