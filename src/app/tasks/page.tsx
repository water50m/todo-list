// app/tasks/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Task, TaskStatus } from '@/types';
import { PriorityBadge, TagBadge } from '@/components/Badge';
import CreateTaskModal from '@/components/CreateTaskModal';
import Toaster from '@/components/Toaster';
import { useToast } from '@/hooks/useToast';

const STATUS_TABS = [
  { value: '',            label: 'ทั้งหมด' },
  { value: 'todo',        label: 'ยังไม่ทำ' },
  { value: 'in_progress', label: 'กำลังทำ' },
  { value: 'done',        label: 'เสร็จแล้ว' },
];

const PRIORITY_OPTS = [
  { value: '',       label: 'ทุก Priority' },
  { value: 'urgent', label: '🔴 ด่วนมาก' },
  { value: 'high',   label: '🟠 สำคัญ' },
  { value: 'med',    label: '🔵 ปกติ' },
  { value: 'low',    label: '⚪ ไม่เร่ง' },
];

function formatDate(d?: string) {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.floor((date.getTime() - now.getTime()) / 86400000);
  if (diff < 0)  return { label: `เกิน ${Math.abs(diff)} วัน`, overdue: true };
  if (diff === 0) return { label: 'วันนี้', overdue: false };
  if (diff === 1) return { label: 'พรุ่งนี้', overdue: false };
  return { label: d, overdue: false };
}

export default function TasksPage() {
  const router  = useRouter();
  const toast   = useToast();

  const [tasks, setTasks]           = useState<Task[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatus]   = useState('');
  const [priorityFilter, setPriority] = useState('');
  const [categoryFilter, setCategory] = useState('');
  const [search, setSearch]         = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.data || []));
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter)   params.set('status',      statusFilter);
    if (priorityFilter) params.set('priority',     priorityFilter);
    if (categoryFilter) params.set('category_id',  categoryFilter);
    if (search)         params.set('search',        search);
    const res  = await fetch(`/api/tasks?${params}`);
    const data = await res.json();
    setTasks(data.data || []);
    setLoading(false);
  }, [statusFilter, priorityFilter, categoryFilter, search]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleDone = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    // optimistic
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const deleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    toast.show('ลบ task แล้ว', 'info');
  };

  const overdueCount = tasks.filter(t =>
    t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
  ).length;

  return (
    <>
      <Toaster toasts={toast.toasts} onDismiss={toast.dismiss} />
      <div className="page-stack">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Tasks</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {tasks.length} รายการ
              {overdueCount > 0 && (
                <span style={{ marginLeft: 8, color: 'var(--danger)', fontWeight: 500 }}>
                  · เกินกำหนด {overdueCount} รายการ
                </span>
              )}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + สร้าง Task
          </button>
        </div>

        {/* Filters */}
        <div className="toolbar">
          <input className="input task-search" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 ค้นหา..."
            style={{ padding: '7px 12px', fontSize: 13 }} />

          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => setStatus(t.value)}
                className={`btn btn-sm ${statusFilter === t.value ? 'btn-primary' : 'btn-secondary'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <select className="input" value={priorityFilter}
            onChange={e => setPriority(e.target.value)}
            style={{ width: 'auto', padding: '7px 10px', fontSize: 13 }}>
            {PRIORITY_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          <select className="input" value={categoryFilter}
            onChange={e => setCategory(e.target.value)}
            style={{ width: 'auto', padding: '7px 10px', fontSize: 13 }}>
            <option value="">ทุกหมวดหมู่</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          {(statusFilter || priorityFilter || categoryFilter || search) && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setStatus(''); setPriority(''); setCategory(''); setSearch(''); }}>
              ✕ ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>ไม่มี task ที่ตรงกับเงื่อนไข</div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}
              onClick={() => setShowCreate(true)}>+ สร้าง Task แรก</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.map(task => {
              const done     = task.status === 'done';
              const dateInfo = formatDate(task.due_date || undefined);
              return (
                <div key={task.id} className="card fade-in"
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  style={{
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    cursor: 'pointer',
                    opacity: done ? 0.55 : 1,
                    transition: 'opacity 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}>

                  {/* Checkbox */}
                  <div onClick={ev => toggleDone(ev, task)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      border: `1.5px solid ${done ? 'var(--success)' : 'var(--border)'}`,
                      background: done ? 'var(--success)' : 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {done && <span style={{ fontSize: 10, color: 'white' }}>✓</span>}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 500, marginBottom: 5,
                      textDecoration: done ? 'line-through' : 'none',
                      color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{task.title}</div>

                    {task.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.5 }}>
                        {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                      <PriorityBadge priority={task.priority} />

                      {task.category && (
                        <span className="badge" style={{
                          borderColor: 'var(--border)', background: 'var(--bg-muted)', color: 'var(--text-secondary)',
                        }}>
                          {task.category.icon} {task.category.name}
                        </span>
                      )}

                      {task.tags?.map(tag => <TagBadge key={tag.id} tag={tag} />)}

                      {dateInfo && (
                        <span className="badge" style={{
                          borderColor: dateInfo.overdue ? 'var(--danger)' : 'var(--border)',
                          background:  dateInfo.overdue ? 'var(--danger-bg)' : 'var(--bg-muted)',
                          color:       dateInfo.overdue ? 'var(--danger)' : 'var(--text-secondary)',
                        }}>
                          {dateInfo.overdue ? '⚠️' : '📅'} {dateInfo.label}
                          {task.due_time && ` ${task.due_time.slice(0, 5)}`}
                        </span>
                      )}

                      {task.recur_type !== 'once' && (
                        <span className="badge" style={{
                          borderColor: 'var(--border)', background: 'var(--bg-muted)', color: 'var(--text-muted)',
                        }}>🔁 ซ้ำ</span>
                      )}

                      {(task.subtasks?.length || 0) > 0 && (
                        <span className="badge" style={{
                          borderColor: 'var(--border)', background: 'var(--bg-muted)', color: 'var(--text-muted)',
                        }}>
                          ☰ {task.subtasks!.filter(s => s.is_done).length}/{task.subtasks!.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button onClick={e => deleteTask(e, task.id)}
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                    title="ลบ">🗑</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { fetchTasks(); toast.show('สร้าง task แล้ว ✓'); }}
      />
    </>
  );
}
