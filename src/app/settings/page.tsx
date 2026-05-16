// app/settings/page.tsx
'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { DailyTemplate, TemplateItem, Category, Tag } from '@/types';
import Toaster from '@/components/Toaster';
import ConfirmDialog from '@/components/ConfirmDialog';
import ChecklistItemModal from '@/components/ChecklistItemModal';
import { useToast } from '@/hooks/useToast';

const PALETTE = [
  { bg:'#E6F1FB', text:'#0C447C', border:'#B5D4F4', dot:'#378ADD' },
  { bg:'#E1F5EE', text:'#085041', border:'#9FE1CB', dot:'#1D9E75' },
  { bg:'#FAEEDA', text:'#633806', border:'#FAC775', dot:'#EF9F27' },
  { bg:'#FAECE7', text:'#712B13', border:'#F5C4B3', dot:'#D85A30' },
  { bg:'#FBEAF0', text:'#72243E', border:'#F4C0D1', dot:'#D4537E' },
  { bg:'#EEEDFE', text:'#3C3489', border:'#CECBF6', dot:'#7F77DD' },
  { bg:'#F1EFE8', text:'#444441', border:'#D3D1C7', dot:'#888780' },
  { bg:'#FCEBEB', text:'#791F1F', border:'#F7C1C1', dot:'#C93535' },
];
const CAT_COLORS = PALETTE.map(p => p.dot);
const WEEKDAYS = ['อา','จ','อ','พ','พฤ','ศ','ส'];

function scheduleLabel(item: TemplateItem) {
  if (item.recur_type === 'once') return item.recur_start ? `วันที่ ${item.recur_start}` : 'วันเดียว';
  if (item.recur_type === 'multi') return `${item.recur_dates?.length || 0} วันที่เลือก`;
  if (item.recur_type === 'custom') {
    const unit = { day:'วัน', week:'สัปดาห์', month:'เดือน' }[item.recur_interval_unit || 'day'];
    return `ทุก ${item.recur_interval || 1} ${unit}`;
  }
  if (item.recur_preset === 'weekday') return 'จันทร์-ศุกร์';
  if (item.recur_preset === 'weekend') return 'เสาร์-อาทิตย์';
  if (item.recur_preset === 'custom-days') {
    const days = item.recur_weekdays?.map(day => WEEKDAYS[day]).join(', ');
    return days ? `ทุก ${days}` : 'เลือกวันในสัปดาห์';
  }
  return 'ทุกวัน';
}

type SettingsTab = 'templates' | 'categories' | 'tags';

export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab]               = useState<SettingsTab>('templates');
  const [templates, setTemplates]   = useState<DailyTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags]             = useState<Tag[]>([]);
  const [loading, setLoading]       = useState(true);
  const [confirm, setConfirm]       = useState<{ open:boolean; label:string; onConfirm:()=>void }>({
    open:false, label:'', onConfirm:()=>{},
  });

  const [checklistEditor, setChecklistEditor] = useState<{
    open: boolean;
    templateId: string;
    item?: TemplateItem | null;
  }>({ open:false, templateId:'', item:null });

  // category form
  const [newCatName, setNewCatName]     = useState('');
  const [newCatIcon, setNewCatIcon]     = useState('📁');
  const [newCatColor, setNewCatColor]   = useState(CAT_COLORS[0]);
  const [addingCat, setAddingCat]       = useState(false);
  const [editingCat, setEditingCat]     = useState<Category|null>(null);

  // tag form
  const [newTagName, setNewTagName]     = useState('');
  const [newTagPalette, setNewTagPal]   = useState(0);
  const [addingTag, setAddingTag]       = useState(false);
  const [editingTag, setEditingTag]     = useState<Tag|null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [t, c, tg] = await Promise.all([
      fetch('/api/templates').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ]);
    setTemplates(t.data || []);
    setCategories(c.data || []);
    setTags(tg.data || []);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  // ── helpers ──
  const askConfirm = (label: string, fn: ()=>void) =>
    setConfirm({ open:true, label, onConfirm: async () => { setConfirm(c=>({...c,open:false})); await fn(); } });

  // ── Template actions ──
  const toggleItem = async (itemId: string, isActive: boolean) => {
    await fetch('/api/templates', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'toggle_item', item_id:itemId, is_active:!isActive }),
    });
    fetchAll();
  };

  const deleteItem = (itemId: string) =>
    askConfirm('ลบรายการนี้?', async () => {
      await fetch('/api/templates', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action:'delete_item', item_id:itemId }),
      });
      toast.show('ลบแล้ว', 'info'); fetchAll();
    });

  // ── Category actions ──
  const createCategory = async () => {
    if (!newCatName.trim() || addingCat) return;
    setAddingCat(true);
    await fetch('/api/categories', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name:newCatName.trim(), icon:newCatIcon, color:newCatColor }),
    });
    toast.show('สร้างหมวดหมู่แล้ว ✓');
    setNewCatName(''); setNewCatIcon('📁'); setAddingCat(false); fetchAll();
  };

  const saveCategory = async () => {
    if (!editingCat) return;
    await fetch(`/api/categories/${editingCat.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name:editingCat.name, icon:editingCat.icon, color:editingCat.color }),
    });
    toast.show('แก้ไขแล้ว ✓'); setEditingCat(null); fetchAll();
  };

  const deleteCategory = (cat: Category) =>
    askConfirm(`ลบหมวดหมู่ "${cat.name}"?`, async () => {
      await fetch(`/api/categories/${cat.id}`, { method:'DELETE' });
      toast.show('ลบแล้ว', 'info'); fetchAll();
    });

  // ── Tag actions ──
  const createTag = async () => {
    if (!newTagName.trim() || addingTag) return;
    setAddingTag(true);
    const pal = PALETTE[newTagPalette];
    await fetch('/api/tags', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name:newTagName.trim(), color_bg:pal.bg, color_text:pal.text, color_border:pal.border }),
    });
    toast.show('สร้าง tag แล้ว ✓'); setNewTagName(''); setAddingTag(false); fetchAll();
  };

  const saveTag = async () => {
    if (!editingTag) return;
    await fetch(`/api/tags/${editingTag.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name:editingTag.name, color_bg:editingTag.color_bg, color_text:editingTag.color_text, color_border:editingTag.color_border }),
    });
    toast.show('แก้ไขแล้ว ✓'); setEditingTag(null); fetchAll();
  };

  const deleteTag = (tag: Tag) =>
    askConfirm(`ลบ tag "${tag.name}"?`, async () => {
      await fetch(`/api/tags/${tag.id}`, { method:'DELETE' });
      toast.show('ลบแล้ว', 'info'); fetchAll();
    });

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <span className="spinner" style={{ width:24, height:24 }} />
    </div>
  );

  const box = { border:'1px solid var(--border)', borderRadius:'var(--radius-md)', padding:'12px 14px', background:'var(--bg)' };
  const defaultTemplate = templates[0];

  return (
    <>
      <Toaster toasts={toast.toasts} onDismiss={toast.dismiss} />
      <ConfirmDialog
        open={confirm.open} title={confirm.label} danger
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c=>({...c,open:false}))}
      />
      <ChecklistItemModal
        open={checklistEditor.open}
        templateId={checklistEditor.templateId}
        item={checklistEditor.item}
        onClose={() => setChecklistEditor({ open:false, templateId:'', item:null })}
        onSaved={() => { toast.show('บันทึก checklist แล้ว ✓'); fetchAll(); }}
      />

      <div className="page-stack settings-container">
        <h1 style={{ fontSize:22, fontWeight:600 }}>Settings</h1>

        {/* Tabs */}
        <div style={{ borderBottom:'1px solid var(--border-subtle)', display:'flex' }}>
          {([
            { id:'templates' as SettingsTab, label:'☀ Template' },
            { id:'categories' as SettingsTab, label:'🗂 หมวดหมู่' },
            { id:'tags' as SettingsTab, label:'🏷 Tags' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:'9px 0', marginRight:20,
              background:'none', border:'none', cursor:'pointer',
              fontSize:13, fontWeight:tab===t.id ? 600 : 400,
              color:tab===t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom:tab===t.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TEMPLATES ── */}
        {tab === 'templates' && (
          <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {!defaultTemplate ? (
              <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'24px 0', fontSize:13 }}>
                ยังไม่มี template ในระบบ
              </div>
            ) : (
              <div className="card" style={{ padding:'16px 18px' }}>
                <div style={{
                  display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                  gap:12, marginBottom:14, flexWrap:'wrap',
                }}>
                  <div>
                    <div className="section-label" style={{ marginBottom:3 }}>Template</div>
                    <div style={{ fontSize:16, fontWeight:700 }}>{defaultTemplate.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                      reset {defaultTemplate.reset_time} · {(defaultTemplate.items || []).length} รายการ
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => setChecklistEditor({ open:true, templateId:defaultTemplate.id, item:null })}>
                    + เพิ่มรายการ
                  </button>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(defaultTemplate.items || []).length === 0 && (
                    <div style={{ ...box, color:'var(--text-muted)', fontSize:13 }}>
                      ยังไม่มีรายการใน checklist นี้
                    </div>
                  )}

                  {(defaultTemplate.items || []).map((it:TemplateItem) => (
                    <div key={it.id} style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'10px 10px', borderRadius:'var(--radius-sm)',
                      background:'var(--bg)', border:'1px solid var(--border-subtle)',
                      opacity:it.is_active ? 1 : 0.45,
                    }}>
                      <input type="checkbox" checked={it.is_active}
                        onChange={() => toggleItem(it.id, it.is_active)} style={{ cursor:'pointer' }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:13, fontWeight:600 }}>{it.title}</span>
                          {it.category && (
                            <span className="badge" style={{
                              color:it.category.color,
                              borderColor:it.category.color,
                              background:'rgba(255,255,255,0.72)',
                            }}>
                              {it.category.icon} {it.category.name}
                            </span>
                          )}
                          {it.tag && (
                            <span className="badge" style={{
                              background:it.tag.color_bg,
                              color:it.tag.color_text,
                              borderColor:it.tag.color_border,
                            }}>
                              {it.tag.name}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                          {scheduleLabel(it)}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:12 }}
                        onClick={() => setChecklistEditor({ open:true, templateId:defaultTemplate.id, item:it })}
                        aria-label="แก้ไขรายการ">✏</button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--text-muted)', fontSize:13 }}
                        onClick={() => deleteItem(it.id)}
                        aria-label="ลบรายการ">🗑</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab === 'categories' && (
          <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card" style={{ padding:'16px 20px' }}>
              <div className="section-label" style={{ marginBottom:10 }}>สร้างหมวดหมู่ใหม่</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <input className="input" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && createCategory()}
                  placeholder="ชื่อหมวดหมู่..." style={{ flex:1, minWidth:140 }} />
                <input className="input" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}
                  style={{ width:60, textAlign:'center', fontSize:18, padding:'7px 6px' }} />
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {CAT_COLORS.map(col => (
                    <div key={col} onClick={() => setNewCatColor(col)} style={{
                      width:22, height:22, borderRadius:'50%', background:col, cursor:'pointer',
                      border:`2.5px solid ${newCatColor===col ? 'var(--text-primary)' : 'transparent'}`,
                      transition:'border 0.1s',
                    }} />
                  ))}
                </div>
                <button className="btn btn-primary" onClick={createCategory} disabled={addingCat}>
                  {addingCat ? '...' : '+ สร้าง'}
                </button>
              </div>
            </div>

            {categories.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'24px 0', fontSize:13 }}>
                ไม่มีหมวดหมู่
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {categories.map(cat => (
                <div key={cat.id} className="card" style={{
                  padding:'12px 16px', borderLeft:`3px solid ${cat.color}`,
                }}>
                  {editingCat?.id === cat.id ? (
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <input className="input" value={editingCat.name}
                        onChange={e => setEditingCat(ec => ec ? {...ec, name:e.target.value} : null)}
                        style={{ flex:1, minWidth:120 }} />
                      <input className="input" value={editingCat.icon}
                        onChange={e => setEditingCat(ec => ec ? {...ec, icon:e.target.value} : null)}
                        style={{ width:60, textAlign:'center', fontSize:18, padding:'7px 6px' }} />
                      <div style={{ display:'flex', gap:4 }}>
                        {CAT_COLORS.map(col => (
                          <div key={col} onClick={() => setEditingCat(ec => ec ? {...ec, color:col} : null)} style={{
                            width:20, height:20, borderRadius:'50%', background:col, cursor:'pointer',
                            border:`2px solid ${editingCat.color===col ? 'var(--text-primary)' : 'transparent'}`,
                          }} />
                        ))}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={saveCategory}>✓ บันทึก</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingCat(null)}>ยกเลิก</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <span style={{ fontSize:20 }}>{cat.icon}</span>
                      <span style={{ flex:1, fontSize:14, fontWeight:500 }}>{cat.name}</span>
                      <div style={{ width:12, height:12, borderRadius:'50%', background:cat.color }} />
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:12 }}
                        onClick={() => setEditingCat(cat)}>✏</button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--text-muted)', fontSize:13 }}
                        onClick={() => deleteCategory(cat)}>🗑</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAGS ── */}
        {tab === 'tags' && (
          <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card" style={{ padding:'16px 20px' }}>
              <div className="section-label" style={{ marginBottom:10 }}>สร้าง Tag ใหม่</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <input className="input" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && createTag()}
                  placeholder="ชื่อ tag..." style={{ flex:1, minWidth:140 }} />
                <div style={{ display:'flex', gap:5 }}>
                  {PALETTE.map((pal, i) => (
                    <div key={i} onClick={() => setNewTagPal(i)} style={{
                      width:22, height:22, borderRadius:'50%', background:pal.dot, cursor:'pointer',
                      border:`2.5px solid ${newTagPalette===i ? 'var(--text-primary)' : 'transparent'}`,
                      transition:'border 0.1s',
                    }} />
                  ))}
                </div>
                {/* Preview */}
                {newTagName && (
                  <span className="badge" style={{
                    background:PALETTE[newTagPalette].bg,
                    color:PALETTE[newTagPalette].text,
                    borderColor:PALETTE[newTagPalette].border,
                  }}>{newTagName}</span>
                )}
                <button className="btn btn-primary" onClick={createTag} disabled={addingTag}>
                  {addingTag ? '...' : '+ สร้าง'}
                </button>
              </div>
            </div>

            {tags.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'24px 0', fontSize:13 }}>
                ยังไม่มี tag — สร้างแรกได้เลย
              </div>
            )}

            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {tags.map(tag => (
                <div key={tag.id}>
                  {editingTag?.id === tag.id ? (
                    <div style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 12px',
                      border:'1px solid var(--border)', borderRadius:'var(--radius-md)', background:'var(--bg)' }}>
                      <input className="input" value={editingTag.name}
                        onChange={e => setEditingTag(et => et ? {...et, name:e.target.value} : null)}
                        style={{ width:120, padding:'5px 10px', fontSize:13 }} />
                      <div style={{ display:'flex', gap:4 }}>
                        {PALETTE.map((pal, i) => (
                          <div key={i} onClick={() => setEditingTag(et => et ? {
                            ...et, color_bg:pal.bg, color_text:pal.text, color_border:pal.border
                          } : null)} style={{
                            width:18, height:18, borderRadius:'50%', background:pal.dot, cursor:'pointer',
                            border:`2px solid ${editingTag.color_border===pal.border ? 'var(--text-primary)' : 'transparent'}`,
                          }} />
                        ))}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={saveTag}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingTag(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span className="badge" style={{
                        background:tag.color_bg, color:tag.color_text, borderColor:tag.color_border,
                        padding:'4px 10px', fontSize:12,
                      }}>{tag.name}</span>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:11, opacity:0.6 }}
                        onClick={() => setEditingTag(tag)}>✏</button>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:11, opacity:0.6, color:'var(--danger)' }}
                        onClick={() => deleteTag(tag)}>✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
