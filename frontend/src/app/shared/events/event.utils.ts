export type EventStatus = 'Upcoming' | 'Ongoing' | 'Past';

export interface ProgramGroup {
  name: string;
  items: string[];
  expanded: boolean;
}

/** Accepts "YYYY-MM-DD" or a full ISO string. Date-only values are read as local time. */
export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value.length <= 10 ? value + 'T00:00:00' : value);
  return isNaN(d.getTime()) ? null : d;
}

export function eventIdOf(e: any): number {
  return e?.event_id ?? e?.id;
}

export function statusOf(e: any): EventStatus {
  const start = toDate(e?.start_date);
  const end = toDate(e?.end_date) ?? start;
  if (!start || !end) return 'Upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (end < today) return 'Past';
  if (start > today) return 'Upcoming';
  return 'Ongoing';
}

/** Plain words for people: "Past" is shown as "Completed". */
export function statusLabel(s: EventStatus): string {
  return s === 'Past' ? 'Completed' : s;
}

/** Green = coming up, amber = happening now, gray = finished. Same colors on every page. */
export function statusClass(s: EventStatus): string {
  switch (s) {
    case 'Upcoming':
      return 'bg-emerald-50 text-emerald-800';
    case 'Ongoing':
      return 'bg-amber-50 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/** "08:30:00" -> "8:30 AM" */
export function formatTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "Oct 16–23, 2026" / "Oct 30 – Nov 2, 2026" / "Oct 16, 2026" */
export function formatDateRange(startStr?: string | null, endStr?: string | null): string {
  const s = toDate(startStr);
  const e = toDate(endStr) ?? s;
  if (!s || !e) return '';
  const mon = (d: Date) => d.toLocaleString('en-US', { month: 'short' });
  if (s.toDateString() === e.toDateString()) {
    return `${mon(s)} ${s.getDate()}, ${s.getFullYear()}`;
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${mon(s)} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${mon(s)} ${s.getDate()}, ${s.getFullYear()} – ${mon(e)} ${e.getDate()}, ${e.getFullYear()}`;
}

export function initialsOf(name?: string | null): string {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}
