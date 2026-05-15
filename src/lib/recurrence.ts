import { TemplateItem } from '@/types';

type ScheduledItem = Pick<TemplateItem,
  'recur_type' | 'recur_dates' | 'recur_preset' | 'recur_weekdays' |
  'recur_interval' | 'recur_interval_unit' | 'recur_start' |
  'recur_end_type' | 'recur_end_count' | 'recur_end_date'
>;

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateOnly(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value).split('T')[0];
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(start: string, end: string): number {
  return Math.floor((parseDate(end).getTime() - parseDate(start).getTime()) / DAY_MS);
}

function monthsBetween(start: string, end: string): number {
  const s = parseDate(start);
  const e = parseDate(end);
  return (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
}

function matchesEnd(item: ScheduledItem, date: string): boolean {
  const endType = item.recur_end_type || 'never';
  if (endType === 'date') {
    const endDate = toDateOnly(item.recur_end_date);
    if (endDate && date > endDate) return false;
  }
  return true;
}

export function isScheduledForDate(item: ScheduledItem, date: string): boolean {
  const recurType = item.recur_type || 'preset';
  const day = parseDate(date).getUTCDay();

  if (recurType === 'once') {
    return toDateOnly(item.recur_start) === date;
  }

  if (recurType === 'multi') {
    return (item.recur_dates || []).some(d => toDateOnly(d) === date);
  }

  if (recurType === 'preset') {
    const preset = item.recur_preset || 'daily';
    if (preset === 'daily') return true;
    if (preset === 'weekday') return day >= 1 && day <= 5;
    if (preset === 'weekend') return day === 0 || day === 6;
    if (preset === 'custom-days') return (item.recur_weekdays || []).includes(day);
    return true;
  }

  const start = toDateOnly(item.recur_start);
  if (!start || date < start || !matchesEnd(item, date)) return false;

  const interval = Math.max(1, item.recur_interval || 1);
  const unit = item.recur_interval_unit || 'day';

  if (unit === 'day') {
    return daysBetween(start, date) % interval === 0;
  }

  if (unit === 'week') {
    const weekdays = item.recur_weekdays?.length ? item.recur_weekdays : [parseDate(start).getUTCDay()];
    return weekdays.includes(day) && Math.floor(daysBetween(start, date) / 7) % interval === 0;
  }

  const diffMonths = monthsBetween(start, date);
  return diffMonths >= 0 && diffMonths % interval === 0 && parseDate(start).getUTCDate() === parseDate(date).getUTCDate();
}

