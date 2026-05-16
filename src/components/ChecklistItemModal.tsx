'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Category, Tag, TemplateItem } from '@/types';
import DatePicker, { DatePickerValue } from './DatePicker';

interface Props {
  open: boolean;
  templateId: string;
  item?: TemplateItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const INITIAL_SCHEDULE: DatePickerValue = {
  recur_type: 'preset',
  recur_preset: 'daily',
  recur_end_type: 'never',
};

function scheduleFromItem(item?: TemplateItem | null): DatePickerValue {
  if (!item) return INITIAL_SCHEDULE;
  return {
    recur_type: item.recur_type || 'preset',
    recur_dates: item.recur_dates,
    recur_preset: item.recur_preset || 'daily',
    recur_weekdays: item.recur_weekdays,
    recur_interval: item.recur_interval,
    recur_interval_unit: item.recur_interval_unit,
    recur_start: item.recur_start,
    recur_end_type: item.recur_end_type || 'never',
    recur_end_count: item.recur_end_count,
    recur_end_date: item.recur_end_date,
    due_date: item.recur_type === 'once' ? item.recur_start : undefined,
  };
}

export default function ChecklistItemModal({ open, templateId, item, onClose, onSaved }: Props) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tagId, setTagId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [schedule, setSchedule] = useState<DatePickerValue>(INITIAL_SCHEDULE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title || '');
    setCategoryId(item?.category_id || '');
    setTagId(item?.tag_id || '');
    setSchedule(scheduleFromItem(item));
    setError('');
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/categories').then(res => res.json()),
      fetch('/api/tags').then(res => res.json()),
    ]).then(([categoryData, tagData]) => {
      setCategories(categoryData.data || []);
      setTags(tagData.data || []);
    }).catch(() => {
      setCategories([]);
      setTags([]);
    });
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!title.trim()) {
      setError('กรุณาใส่ชื่อรายการ');
      return;
    }

    setLoading(true);
    setError('');
    const payload = {
      action: item ? 'update_item' : 'add_item',
      template_id: templateId,
      item_id: item?.id,
      title: title.trim(),
      category_id: categoryId || null,
      tag_id: tagId || null,
      ...schedule,
      recur_start: schedule.recur_type === 'once' ? schedule.due_date : schedule.recur_start,
    };

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{
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
              {item ? 'แก้ไข Daily Checklist' : 'เพิ่ม Daily Checklist'}
            </h2>
            {error && <p style={{ fontSize:12, color:'var(--danger)', marginTop:3 }}>{error}</p>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ fontSize:18 }}>x</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:500, marginBottom:6, color:'var(--text-secondary)' }}>
              ชื่อรายการ <span style={{ color:'var(--danger)' }}>*</span>
            </label>
            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="เช่น อ่านหนังสือ, รดน้ำต้นไม้..."
              autoFocus
            />
          </div>

          <div>
            <div className="section-label" style={{ marginBottom:8 }}>วันที่ต้องทำ</div>
            <DatePicker value={schedule} onChange={setSchedule} showTime={false} />
          </div>

          <div className="calendar-modal-row">
            <div style={{ flex:1 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, marginBottom:6, color:'var(--text-secondary)' }}>
                หมวดหมู่
              </label>
              <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">ไม่เลือกหมวดหมู่</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex:1 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:500, marginBottom:6, color:'var(--text-secondary)' }}>
                Tag
              </label>
              <select className="input" value={tagId} onChange={e => setTagId(e.target.value)}>
                <option value="">ไม่เลือก tag</option>
                {tags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{
          padding:'16px 24px',
          borderTop:'1px solid var(--border-subtle)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? <><span className="spinner" />กำลังบันทึก...</> : 'บันทึก'}
          </button>
        </div>
      </div>
    </>
  );
}
