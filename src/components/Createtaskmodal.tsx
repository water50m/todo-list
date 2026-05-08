// components/CreateTaskModal.tsx
'use client';
import { useState } from 'react';
import { CreateTaskInput, Priority } from '@/types';
import DatePicker from './DatePicker';
import TagSelector from './TagSelector';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Step = 'basic' | 'date' | 'tags';

const STEPS: { id: Step; label: string }[] = [
  { id: 'basic', label: '1. งาน' },
  { id: 'date',  label: '2. วันที่' },
  { id: 'tags',  label: '3. Tags' },
];

const INITIAL: CreateTaskInput = {
  title: '', description: '',
  priority: 'med', recur_type: 'once',
  recur_end_type: 'never',
  tag_ids: [],
};

export default function CreateTaskModal({ open, onClose, onCreated }: Props) {
  const [step, setStep]       = useState<Step>('basic');
  const [form, setForm]       = useState<CreateTaskInput>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  if (!open) return null;

  const set = (partial: Partial<CreateTaskInput>) => setForm(f => ({ ...f, ...partial }));

  const submit = async () => {
    if (!form.title.trim()) { setError('กรุณาใส่ชื่องาน'); setStep('basic'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
      setForm(INITIAL);
      setStep('basic');
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.3)',
        zIndex:100, backdropFilter:'blur(2px)',
      }} />

      {/* Drawer */}
      <div className="slide-up" style={{
        position:'fixed', right:0, top:0, bottom:0,
        width: 480, background:'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        zIndex:101, display:'flex', flexDirection:'column',
        boxShadow:'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{
          padding:'20px 24px 16px',
          borderBottom:'1px solid var(--border-subtle)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:600 }}>สร้าง Task ใหม่</h2>
            {error && <p style={{ fontSize:12, color:'var(--danger)', marginTop:3 }}>{error}</p>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize:18 }}>✕</button>
        </div>

        {/* Steps */}
        <div style={{
          display:'flex', borderBottom:'1px solid var(--border-subtle)',
          padding:'0 24px',
        }}>
          {STEPS.map(s => (
            <button key={s.id} onClick={() => setStep(s.id)}
              style={{
                padding:'10px 0', marginRight:20,
                background:'none', border:'none', cursor:'pointer',
                fontSize:13, fontWeight: step === s.id ? 600 : 400,
                color: step === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: step === s.id ? '2px solid var(--accent)' : '2px solid transparent',
                transition:'all 0.12s',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* Step 1: Basic */}
          {step === 'basic' && (
            <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, marginBottom:6, color:'var(--text-secondary)' }}>
                  ชื่องาน <span style={{ color:'var(--danger)' }}>*</span>
                </label>
                <input className="input" value={form.title}
                  onChange={e => set({ title: e.target.value })}
                  placeholder="เช่น ออกกำลังกาย, ส่งรายงาน..."
                  autoFocus />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:500, marginBottom:6, color:'var(--text-secondary)' }}>
                  รายละเอียด (ไม่บังคับ)
                </label>
                <textarea className="input" value={form.description || ''}
                  onChange={e => set({ description: e.target.value })}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  rows={4} style={{ resize:'vertical', fontFamily:'var(--font-body)' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setStep('date')}>
                  ถัดไป: วันที่ →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Date */}
          {step === 'date' && (
            <div className="fade-in">
              <DatePicker
                value={form}
                onChange={partial => set(partial)}
              />
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                <button className="btn btn-primary" onClick={() => setStep('tags')}>
                  ถัดไป: Tags →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tags */}
          {step === 'tags' && (
            <div className="fade-in">
              <TagSelector
                selectedTagIds={form.tag_ids || []}
                selectedCategoryId={form.category_id}
                priority={form.priority}
                onTagsChange={ids => set({ tag_ids: ids })}
                onCategoryChange={id => set({ category_id: id })}
                onPriorityChange={(p: Priority) => set({ priority: p })}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:'16px 24px',
          borderTop:'1px solid var(--border-subtle)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <button className="btn btn-ghost" onClick={() => {
            setForm(INITIAL); setStep('basic'); setError(''); onClose();
          }}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <><span className="spinner" />กำลังบันทึก...</> : '✓ เพิ่ม Task'}
          </button>
        </div>
      </div>
    </>
  );
}
