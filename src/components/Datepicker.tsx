// components/DatePicker.tsx
'use client';
import { useState } from 'react';
import { CreateTaskInput, RecurType, PresetType } from '@/types';

type DatePickerValue = Pick<CreateTaskInput,
  'recur_type'|'recur_dates'|'recur_preset'|'recur_weekdays'|
  'recur_interval'|'recur_interval_unit'|'recur_start'|
  'recur_end_type'|'recur_end_count'|'recur_end_date'|'due_date'|'due_time'
>;

interface Props {
  value: DatePickerValue;
  onChange: (v: DatePickerValue) => void;
}

const WEEKDAYS = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

const MODES: { id: RecurType; label: string; sub: string }[] = [
  { id: 'once',   label: 'วันเดียว',           sub: 'เลือก 1 วันจากปฏิทิน' },
  { id: 'multi',  label: 'หลายวัน (จิ้มเอง)',  sub: 'เลือกอิสระหลายวัน' },
  { id: 'preset', label: 'ทำซ้ำแบบ Preset',    sub: 'ทุกวัน / จ–ศ / ส–อา' },
  { id: 'custom', label: 'Pattern กำหนดเอง',   sub: 'ทุก N วัน/สัปดาห์/เดือน' },
];

const PRESETS: { id: PresetType; label: string; sub: string }[] = [
  { id: 'daily',       label: 'ทุกวัน',                   sub: 'จันทร์ – อาทิตย์' },
  { id: 'weekday',     label: 'ทุกวัน จันทร์ – ศุกร์',   sub: 'วันทำงาน 5 วัน' },
  { id: 'weekend',     label: 'ทุก เสาร์ – อาทิตย์',     sub: 'วันหยุดสุดสัปดาห์' },
  { id: 'custom-days', label: 'เลือกวันเองในสัปดาห์',    sub: 'กดเลือกได้หลายวัน' },
];

export default function DatePicker({ value, onChange }: Props) {
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const todayStr = today.toISOString().split('T')[0];
  const multiSet = new Set(value.recur_dates || []);

  const set = (partial: Partial<DatePickerValue>) => onChange({ ...value, ...partial });

  function renderCal(mode: 'once' | 'multi') {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];

    // Blanks
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells.push({ d, dateStr });
    }

    const isSelected = (dateStr: string) =>
      mode === 'once' ? value.due_date === dateStr : multiSet.has(dateStr);

    const handleClick = (dateStr: string) => {
      if (mode === 'once') {
        set({ due_date: dateStr });
      } else {
        const next = new Set(multiSet);
        if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
        set({ recur_dates: Array.from(next) });
      }
    };

    return (
      <div>
        {/* Cal nav */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => {
            if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); }
            else setCalMonth(m => m-1);
          }}>‹</button>
          <span style={{ fontSize:13, fontWeight:500 }}>{TH_MONTHS[calMonth]} {calYear}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => {
            if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); }
            else setCalMonth(m => m+1);
          }}>›</button>
        </div>
        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, textAlign:'center' }}>
          {WEEKDAYS.map(d => (
            <div key={d} style={{ fontSize:10, color:'var(--text-muted)', padding:'3px 0' }}>{d}</div>
          ))}
          {cells.map((cell, i) => cell === null ? (
            <div key={`blank-${i}`} />
          ) : (
            <div key={cell.dateStr}
              onClick={() => handleClick(cell.dateStr)}
              style={{
                height: 30, display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius: 'var(--radius-sm)', fontSize: 12, cursor:'pointer',
                background: isSelected(cell.dateStr) ? 'var(--accent)' : 'transparent',
                color: isSelected(cell.dateStr) ? 'var(--accent-fg)' :
                       cell.dateStr === todayStr ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: cell.dateStr === todayStr ? 600 : 400,
                border: cell.dateStr === todayStr && !isSelected(cell.dateStr) ? '1px solid var(--border)' : 'none',
                transition: 'all 0.1s',
              }}
            >{cell.d}</div>
          ))}
        </div>
        {mode === 'multi' && multiSet.size > 0 && (
          <div style={{ marginTop:8, fontSize:12, color:'var(--text-secondary)' }}>
            เลือกแล้ว {multiSet.size} วัน
          </div>
        )}
      </div>
    );
  }

  function buildPreview(): string {
    switch (value.recur_type) {
      case 'once':
        return value.due_date ? `วันที่ ${value.due_date}` : 'ยังไม่ได้เลือกวัน';
      case 'multi':
        return (value.recur_dates?.length || 0) > 0
          ? `${value.recur_dates!.length} วันที่เลือก`
          : 'ยังไม่ได้เลือกวัน';
      case 'preset': {
        const labels: Record<string, string> = {
          daily: 'ทำซ้ำทุกวัน', weekday: 'ทำซ้ำทุก จ–ศ',
          weekend: 'ทำซ้ำทุก ส–อา', 'custom-days': 'ทำซ้ำวันที่เลือก',
        };
        let txt = labels[value.recur_preset || ''] || '-';
        if (value.recur_preset === 'custom-days' && value.recur_weekdays?.length) {
          txt += ` (${value.recur_weekdays.map(d => WEEKDAYS[d]).join(', ')})`;
        }
        return txt;
      }
      case 'custom': {
        const unit = { day:'วัน', week:'สัปดาห์', month:'เดือน' }[value.recur_interval_unit || 'day'];
        let txt = `ทุก ${value.recur_interval || 1} ${unit}`;
        if (value.recur_interval_unit === 'week' && value.recur_weekdays?.length) {
          txt += ` (${value.recur_weekdays.map(d => WEEKDAYS[d]).join(', ')})`;
        }
        if (value.recur_end_type === 'count') txt += ` จำนวน ${value.recur_end_count || 1} ครั้ง`;
        else if (value.recur_end_type === 'date' && value.recur_end_date) txt += ` ถึง ${value.recur_end_date}`;
        else txt += ' ไม่มีสิ้นสุด';
        return txt;
      }
    }
    return '';
  }

  const box = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    background: 'var(--bg)',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Mode selector */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {MODES.map(m => (
          <div key={m.id} onClick={() => set({ recur_type: m.id })}
            style={{
              ...box,
              cursor:'pointer',
              background: value.recur_type === m.id ? 'var(--bg-muted)' : 'var(--bg)',
              borderColor: value.recur_type === m.id ? 'var(--accent)' : 'var(--border)',
              transition: 'all 0.12s',
            }}>
            <div style={{ fontSize:13, fontWeight:500 }}>{m.label}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Panel */}
      <div style={box}>
        {value.recur_type === 'once' && renderCal('once')}

        {value.recur_type === 'multi' && renderCal('multi')}

        {value.recur_type === 'preset' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {PRESETS.map(p => (
              <div key={p.id} onClick={() => set({ recur_preset: p.id })}
                style={{
                  ...box, cursor:'pointer',
                  background: value.recur_preset === p.id ? 'var(--bg-muted)' : 'var(--bg)',
                  borderColor: value.recur_preset === p.id ? 'var(--accent)' : 'var(--border)',
                }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{p.label}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{p.sub}</div>
              </div>
            ))}
            {value.recur_preset === 'custom-days' && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', paddingTop:4 }}>
                {WEEKDAYS.map((d, i) => {
                  const on = (value.recur_weekdays || []).includes(i);
                  return (
                    <div key={i} onClick={() => {
                      const cur = value.recur_weekdays || [];
                      set({ recur_weekdays: on ? cur.filter(x => x !== i) : [...cur, i] });
                    }} style={{
                      width:36, height:36, borderRadius:'50%',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:12, cursor:'pointer',
                      background: on ? 'var(--accent)' : 'var(--bg-muted)',
                      color: on ? 'var(--accent-fg)' : 'var(--text-secondary)',
                      fontWeight: on ? 600 : 400,
                      transition: 'all 0.12s',
                    }}>{d}</div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {value.recur_type === 'custom' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>ทำซ้ำทุก</span>
              <input type="number" min={1} max={365} value={value.recur_interval || 1}
                onChange={e => set({ recur_interval: parseInt(e.target.value)||1 })}
                className="input" style={{ width:64, textAlign:'center', padding:'6px 10px' }} />
              <select value={value.recur_interval_unit || 'day'}
                onChange={e => set({ recur_interval_unit: e.target.value as 'day'|'week'|'month' })}
                className="input" style={{ width:'auto', padding:'6px 10px' }}>
                <option value="day">วัน</option>
                <option value="week">สัปดาห์</option>
                <option value="month">เดือน</option>
              </select>
            </div>

            {value.recur_interval_unit === 'week' && (
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>วันที่ทำในสัปดาห์</div>
                <div style={{ display:'flex', gap:6 }}>
                  {WEEKDAYS.map((d, i) => {
                    const on = (value.recur_weekdays || []).includes(i);
                    return (
                      <div key={i} onClick={() => {
                        const cur = value.recur_weekdays || [];
                        set({ recur_weekdays: on ? cur.filter(x => x !== i) : [...cur, i] });
                      }} style={{
                        width:34, height:34, borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, cursor:'pointer',
                        background: on ? 'var(--accent)' : 'var(--bg-muted)',
                        color: on ? 'var(--accent-fg)' : 'var(--text-secondary)',
                        transition: 'all 0.12s',
                      }}>{d}</div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>เริ่มวันที่</span>
              <input type="date" value={value.recur_start || todayStr}
                onChange={e => set({ recur_start: e.target.value })}
                className="input" style={{ width:'auto', padding:'6px 10px' }} />
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, color:'var(--text-secondary)' }}>สิ้นสุด</span>
              <select value={value.recur_end_type || 'never'}
                onChange={e => set({ recur_end_type: e.target.value as 'never'|'count'|'date' })}
                className="input" style={{ width:'auto', padding:'6px 10px' }}>
                <option value="never">ไม่มีสิ้นสุด</option>
                <option value="count">จำนวนครั้ง</option>
                <option value="date">วันที่กำหนด</option>
              </select>
              {value.recur_end_type === 'count' && (
                <>
                  <input type="number" min={1} value={value.recur_end_count || 10}
                    onChange={e => set({ recur_end_count: parseInt(e.target.value)||1 })}
                    className="input" style={{ width:64, textAlign:'center', padding:'6px 10px' }} />
                  <span style={{ fontSize:13, color:'var(--text-secondary)' }}>ครั้ง</span>
                </>
              )}
              {value.recur_end_type === 'date' && (
                <input type="date" value={value.recur_end_date || ''}
                  onChange={e => set({ recur_end_date: e.target.value })}
                  className="input" style={{ width:'auto', padding:'6px 10px' }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div style={{
        padding: '10px 14px',
        background: 'var(--bg-muted)',
        borderRadius: 'var(--radius-md)',
        fontSize: 13,
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>สรุป:</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{buildPreview()}</span>
      </div>

      {/* Time */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <span style={{ fontSize:13, color:'var(--text-secondary)', flexShrink:0 }}>เวลา (ไม่บังคับ)</span>
        <input type="time" value={value.due_time || ''}
          onChange={e => set({ due_time: e.target.value })}
          className="input" style={{ width:'auto', padding:'6px 10px' }} />
      </div>
    </div>
  );
}
