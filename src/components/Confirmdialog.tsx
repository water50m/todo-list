// components/ConfirmDialog.tsx
'use client';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'ยืนยัน', danger = false, onConfirm, onCancel,
}: Props) {
  if (!open) return null;
  return (
    <>
      <div onClick={onCancel} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }} />
      <div className="card fade-in" style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 360, zIndex: 201, padding: 24,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
        {message && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{message}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={onConfirm}
            style={danger ? { background: 'var(--danger)' } : {}}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
