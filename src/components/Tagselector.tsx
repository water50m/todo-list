// components/TagSelector.tsx
'use client';
import { useState, useEffect } from 'react';
import { Tag, Priority, Category } from '@/types';
import { TagBadge, PriorityBadge } from './Badge';

const PRIORITY_OPTIONS: { value: Priority; label: string; dot: string; color: string; bg: string; border: string }[] = [
  { value:'urgent', label:'ด่วนมาก', dot:'🔴', color:'#C93535', bg:'#FEF0F0', border:'#FECACA' },
  { value:'high',   label:'สำคัญ',   dot:'🟠', color:'#C47A1A', bg:'#FEF5E7', border:'#FDE68A' },
  { value:'med',    label:'ปกติ',    dot:'🔵', color:'#1E6FB5', bg:'#EBF4FD', border:'#BFDBFE' },
  { value:'low',    label:'ไม่เร่ง', dot:'⚪', color:'#6B6963', bg:'#F1EFE8', border:'#E2E0D8' },
];

const COLOR_PALETTE = [
  { bg:'#E6F1FB', text:'#0C447C', border:'#B5D4F4' },
  { bg:'#E1F5EE', text:'#085041', border:'#9FE1CB' },
  { bg:'#FAEEDA', text:'#633806', border:'#FAC775' },
  { bg:'#FAECE7', text:'#712B13', border:'#F5C4B3' },
  { bg:'#FBEAF0', text:'#72243E', border:'#F4C0D1' },
  { bg:'#EEEDFE', text:'#3C3489', border:'#CECBF6' },
  { bg:'#F1EFE8', text:'#444441', border:'#D3D1C7' },
  { bg:'#FCEBEB', text:'#791F1F', border:'#F7C1C1' },
];

interface Props {
  selectedTagIds: string[];
  selectedCategoryId?: string;
  priority: Priority;
  onTagsChange: (ids: string[]) => void;
  onCategoryChange: (id?: string) => void;
  onPriorityChange: (p: Priority) => void;
}

export default function TagSelector({
  selectedTagIds, selectedCategoryId, priority,
  onTagsChange, onCategoryChange, onPriorityChange,
}: Props) {
  const [tags, setTags]           = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName]     = useState('');
  const [colorIdx, setColorIdx]   = useState(0);
  const [creating, setCreating]   = useState(false);

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(d => setTags(d.data || []));
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d.data || []));
  }, []);

  const toggleTag = (id: string) =>
    onTagsChange(selectedTagIds.includes(id)
      ? selectedTagIds.filter(t => t !== id)
      : [...selectedTagIds, id]);

  const createTag = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    const col = COLOR_PALETTE[colorIdx];
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name: newName.trim(), ...col }),
    });
    const data = await res.json();
    if (data.data) {
      setTags(prev => [...prev, data.data]);
      onTagsChange([...selectedTagIds, data.data.id]);
      setNewName('');
    }
    setCreating(false);
  };

  const deleteTag = async (id: string) => {
    if (!confirm('ลบ tag นี้?')) return;
    await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    setTags(prev => prev.filter(t => t.id !== id));
    onTagsChange(selectedTagIds.filter(tid => tid !== id));
  };

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));

  const box = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    background: 'var(--bg)',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Selected preview */}
      {(selectedTags.length > 0 || selectedCategoryId || priority) && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'10px 14px', background:'var(--bg-muted)', borderRadius:'var(--radius-md)' }}>
          <PriorityBadge priority={priority} />
          {selectedCategoryId && (() => {
            const cat = categories.find(c => c.id === selectedCategoryId);
            return cat ? (
              <span className="badge" style={{ borderColor:'var(--border)', background:'var(--bg-card)', color:'var(--text-primary)' }}>
                {cat.icon} {cat.name}
              </span>
            ) : null;
          })()}
          {selectedTags.map(t => <TagBadge key={t.id} tag={t} onRemove={() => toggleTag(t.id)} />)}
        </div>
      )}

      {/* Priority */}
      <div>
        <div className="section-label" style={{ marginBottom:8 }}>ความสำคัญ</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
          {PRIORITY_OPTIONS.map(p => (
            <div key={p.value} onClick={() => onPriorityChange(p.value)}
              style={{
                padding: '8px 6px', textAlign:'center', cursor:'pointer',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${priority === p.value ? p.color : 'var(--border)'}`,
                background: priority === p.value ? p.bg : 'var(--bg)',
                transition: 'all 0.12s',
              }}>
              <div style={{ fontSize:16 }}>{p.dot}</div>
              <div style={{ fontSize:11, marginTop:3, fontWeight: priority === p.value ? 500 : 400, color: priority === p.value ? p.color : 'var(--text-secondary)' }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <div className="section-label" style={{ marginBottom:8 }}>หมวดหมู่ <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(เลือก 1)</span></div>
        <div style={box}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {categories.map(cat => {
              const sel = selectedCategoryId === cat.id;
              return (
                <div key={cat.id} onClick={() => onCategoryChange(sel ? undefined : cat.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 99,
                    border: `1px solid ${sel ? cat.color : 'var(--border)'}`,
                    background: sel ? cat.color + '22' : 'var(--bg-card)',
                    fontSize: 12, cursor:'pointer', fontWeight: sel ? 500 : 400,
                    color: sel ? cat.color : 'var(--text-secondary)',
                    transition: 'all 0.12s', display:'flex', alignItems:'center', gap:5,
                  }}>
                  <span>{cat.icon}</span> {cat.name}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="section-label" style={{ marginBottom:8 }}>Tags <span style={{ fontWeight:400, textTransform:'none', letterSpacing:0 }}>(เลือกได้หลายอัน)</span></div>
        <div style={box}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: tags.length ? 10 : 0 }}>
            {tags.map(tag => {
              const sel = selectedTagIds.includes(tag.id);
              return (
                <div key={tag.id} onClick={() => toggleTag(tag.id)}
                  style={{
                    padding: '4px 11px', borderRadius: 99,
                    border: `1px solid ${sel ? tag.color_border : 'var(--border)'}`,
                    background: sel ? tag.color_bg : 'var(--bg-card)',
                    color: sel ? tag.color_text : 'var(--text-secondary)',
                    fontSize: 12, cursor:'pointer', fontWeight: sel ? 500 : 400,
                    outline: sel ? `2px solid ${tag.color_border}` : 'none',
                    outlineOffset: 1,
                    transition: 'all 0.12s',
                  }}>
                  {tag.name}
                  {!selectedTagIds.includes(tag.id) && (
                    <span onClick={ev => { ev.stopPropagation(); deleteTag(tag.id); }}
                      style={{ marginLeft:4, opacity:0, fontSize:10, cursor:'pointer', color:'var(--text-muted)' }}
                      className="tag-del">✕</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Create new tag */}
          <div style={{ borderTop: tags.length ? '1px solid var(--border-subtle)' : 'none', paddingTop: tags.length ? 10 : 0 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>สร้าง tag ใหม่</div>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              {/* Color dots */}
              <div style={{ display:'flex', gap:4 }}>
                {COLOR_PALETTE.map((col, i) => (
                  <div key={i} onClick={() => setColorIdx(i)}
                    style={{
                      width:18, height:18, borderRadius:'50%',
                      background: col.border,
                      border: `2px solid ${colorIdx === i ? 'var(--text-primary)' : 'transparent'}`,
                      cursor:'pointer', transition:'border 0.1s',
                    }} />
                ))}
              </div>
              <input className="input" value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createTag()}
                placeholder="ชื่อ tag..."
                style={{ flex:1, minWidth:100, padding:'5px 10px', fontSize:12 }} />
              <button className="btn btn-secondary btn-sm" onClick={createTag} disabled={creating}>
                {creating ? '...' : '+ เพิ่ม'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// Note: delete tag added via API DELETE /api/tags/[id]
