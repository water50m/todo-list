// components/Badge.tsx
import { Priority, Tag } from '@/types';

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  urgent: { label: 'ด่วนมาก', color: '#C93535', bg: '#FEF0F0', border: '#FECACA', dot: '🔴' },
  high:   { label: 'สำคัญ',   color: '#C47A1A', bg: '#FEF5E7', border: '#FDE68A', dot: '🟠' },
  med:    { label: 'ปกติ',    color: '#1E6FB5', bg: '#EBF4FD', border: '#BFDBFE', dot: '🔵' },
  low:    { label: 'ไม่เร่ง', color: '#6B6963', bg: '#F1EFE8', border: '#E2E0D8', dot: '⚪' },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className="badge" style={{
      color: cfg.color, background: cfg.bg, borderColor: cfg.border,
    }}>
      {cfg.dot} {cfg.label}
    </span>
  );
}

export function TagBadge({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span className="badge" style={{
      color: tag.color_text,
      background: tag.color_bg,
      borderColor: tag.color_border,
    }}>
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 0 0 3px', color: 'inherit', opacity: 0.6,
            fontSize: '11px', lineHeight: 1,
          }}
        >✕</button>
      )}
    </span>
  );
}

export { PRIORITY_CONFIG };
