// app/settings/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { DailyTemplate, TemplateItem, Category, Tag } from '@/types';
import Toaster from '@/components/Toaster';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

const SLOT_LABEL: Record<string, string> = {
  morning: '🌅 เช้า', afternoon: '🌞 กลางวัน', evening: '🌙 เย็น',
};
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

  // template form
  const [newTmplName, setNewTmplName]   = useState('');
  const [newTmplTime, setNewTmplTime]   = useState('00:00');
  const [addingTmpl, setAddingTmpl]     = useState(false);
  const [expandedTmpl, setExpanded]     = useState<string|null>(null);
  const [itemInputs, setItemInputs]     = useState<Record<string,{title:string;slot:string}>>({});
  const [editingItem, setEditingItem]   = useState<{id:string;title:string;slot:string}|null>(null);

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
  const createTemplate = async () => {
    if (!newTmplName.trim() || addingTmpl) return;
    setAddingTmpl(true);
    const res = await fetch('/api/templates', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create_template', name:newTmplName.trim(), reset_time:newTmplTime }),
    });
    if (res.ok) { toast.show('สร้าง template แล้ว ✓'); setNewTmplName(''); fetchAll(); }
    setAddingTmpl(false);
  };

  const addItem = async (templateId: string) => {
    const inp = itemInputs[templateId];
    if (!inp?.title?.trim()) return;
    const res = await fetch('/api/templates', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'add_item', template_id:templateId, title:inp.title.trim(), time_slot:inp.slot||'morning' }),
    });
    if (res.ok) {
      toast.show('เพิ่มรายการแล้ว ✓');
      setItemInputs(prev => ({ ...prev, [templateId]:{ title:'', slot:'morning' } }));
      fetchAll();
    }
  };

  const saveEditItem = async () => {
    if (!editingItem) return;
    await fetch('/api/templates', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update_item', item_id:editingItem.id, title:editingItem.title, time_slot:editingItem.slot }),
    });
    toast.show('แก้ไขแล้ว ✓'); setEditingItem(null); fetchAll();
  };

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

  return (
    <>
      <Toaster toasts={toast.toasts} onDismiss={toast.dismiss} />
      <ConfirmDialog
        open={confirm.open} title={confirm.label} danger
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c=>({...c,open:false}))}
      />

      <div style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:660 }}>
        <h1 style={{ fontSize:22, fontWeight:600 }}>Settings</h1>

        {/* Tabs */}
        <div style={{ borderBottom:'1px solid var(--border-subtle)', display:'flex' }}>
          {([
            { id:'templates' as SettingsTab, label:'☀ Daily Templates' },
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
            <div className="card" style={{ padding:'16px 20px' }}>
              <div className="section-label" style={{ marginBottom:10 }}>สร้าง Template ใหม่</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <input className="input" value={newTmplName}
                  onChange={e => setNewTmplName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && createTemplate()}
                  placeholder="ชื่อ template..." style={{ flex:1, minWidth:150 }} />
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>reset เวลา</span>
                  <input type="time" className="input" value={newTmplTime}
                    onChange={e => setNewTmplTime(e.target.value)}
                    style={{ width:'auto', padding:'7px 10px' }} />
                </div>
                <button className="btn btn-primary" onClick={createTemplate} disabled={addingTmpl}>
                  {addingTmpl ? '...' : '+ สร้าง'}
                </button>
              </div>
            </div>

            {templates.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'24px 0', fontSize:13 }}>
                ยังไม่มี template — สร้างแรกได้เลย
              </div>
            )}

            {templates.map(tmpl => (
              <div key={tmpl.id} className="card" style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div>
                    <span style={{ fontSize:14, fontWeight:600 }}>{tmpl.name}</span>
                    <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:8 }}>
                      reset {tmpl.reset_time} · {(tmpl.items||[]).filter((i:TemplateItem)=>i.is_active).length} รายการ active
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => setExpanded(expandedTmpl===tmpl.id ? null : tmpl.id)}>
                    {expandedTmpl===tmpl.id ? '▲ ซ่อน' : '▼ แสดง'}
                  </button>
                </div>

                {expandedTmpl===tmpl.id && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
                    {(['morning','afternoon','evening'] as const).map(slot => {
                      const items = (tmpl.items||[]).filter((it:TemplateItem)=>it.time_slot===slot);
                      if (!items.length) return null;
                      return (
                        <div key={slot}>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5 }}>{SLOT_LABEL[slot]}</div>
                          {items.map((it:TemplateItem) => (
                            <div key={it.id} style={{ marginBottom:4 }}>
                              {editingItem?.id === it.id ? (
                                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                  <input className="input" value={editingItem.title}
                                    onChange={e => setEditingItem(ei => ei ? {...ei, title:e.target.value} : null)}
                                    style={{ flex:1, padding:'6px 10px', fontSize:13 }} />
                                  <select className="input" value={editingItem.slot}
                                    onChange={e => setEditingItem(ei => ei ? {...ei, slot:e.target.value} : null)}
                                    style={{ width:'auto', padding:'6px 10px', fontSize:12 }}>
                                    <option value="morning">เช้า</option>
                                    <option value="afternoon">กลางวัน</option>
                                    <option value="evening">เย็น</option>
                                  </select>
                                  <button className="btn btn-primary btn-sm" onClick={saveEditItem}>✓</button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingItem(null)}>✕</button>
                                </div>
                              ) : (
                                <div style={{
                                  display:'flex', alignItems:'center', gap:8,
                                  padding:'7px 10px', borderRadius:'var(--radius-sm)',
                                  background:'var(--bg)', border:'1px solid var(--border-subtle)',
                                  opacity:it.is_active ? 1 : 0.45,
                                }}>
                                  <input type="checkbox" checked={it.is_active}
                                    onChange={() => toggleItem(it.id, it.is_active)} style={{ cursor:'pointer' }} />
                                  <span style={{ flex:1, fontSize:13 }}>{it.title}</span>
                                  <button className="btn btn-ghost btn-icon btn-sm" style={{ fontSize:12 }}
                                    onClick={() => setEditingItem({ id:it.id, title:it.title, slot:it.time_slot })}>✏</button>
                                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--text-muted)', fontSize:13 }}
                                    onClick={() => deleteItem(it.id)}>🗑</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* Add item row */}
                    <div style={{ ...box, marginTop:4, display:'flex', flexDirection:'column', gap:8 }}>
                      <div className="section-label">เพิ่มรายการใหม่</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <input className="input" style={{ flex:1, minWidth:120, padding:'6px 10px', fontSize:13 }}
                          value={itemInputs[tmpl.id]?.title||''}
                          onChange={e => setItemInputs(prev => ({
                            ...prev, [tmpl.id]:{ ...prev[tmpl.id], title:e.target.value, slot:prev[tmpl.id]?.slot||'morning' },
                          }))}
                          onKeyDown={e => e.key==='Enter' && addItem(tmpl.id)}
                          placeholder="ชื่อรายการ..." />
                        <select className="input" style={{ width:'auto', padding:'6px 10px', fontSize:13 }}
                          value={itemInputs[tmpl.id]?.slot||'morning'}
                          onChange={e => setItemInputs(prev => ({
                            ...prev, [tmpl.id]:{ ...prev[tmpl.id], slot:e.target.value, title:prev[tmpl.id]?.title||'' },
                          }))}>
                          <option value="morning">เช้า</option>
                          <option value="afternoon">กลางวัน</option>
                          <option value="evening">เย็น</option>
                        </select>
                        <button className="btn btn-secondary btn-sm" onClick={() => addItem(tmpl.id)}>+ เพิ่ม</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
