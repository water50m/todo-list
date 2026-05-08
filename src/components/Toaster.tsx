// components/Toaster.tsx
'use client';
import { Toast } from '@/hooks/useToast';

const ICONS: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' };
const COLORS: Record<string, { bg: string; border: string; color: string }> = {
  success: { bg: 'var(--success-bg)', border: '#BBF7D0', color: 'var(--success)' },
  error:   { bg: 'var(--danger-bg)',  border: '#FECACA', color: 'var(--danger)' },
  info:    { bg: 'var(--med-bg)',     border: '#BFDBFE', color: 'var(--med)' },
};

interface Props {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function Toaster({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999,
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type];
        return (
          <div key={t.id} className="fade-in" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            minWidth: 220, maxWidth: 360,
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: c.color, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{ICONS[t.type]}</span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{t.message}</span>
            <button onClick={() => onDismiss(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 14, padding: '0 0 0 4px', lineHeight: 1,
            }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}
