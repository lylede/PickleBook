import { Pipe, PipeTransform } from '@angular/core';

/** 13 -> "1:00 PM" */
export function hourLabel(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const suffix = hr < 12 ? 'AM' : 'PM';
  const twelve = hr % 12 === 0 ? 12 : hr % 12;
  return `${twelve}:00 ${suffix}`;
}

@Pipe({ name: 'hour', standalone: true })
export class HourPipe implements PipeTransform {
  transform(h: number | null | undefined): string { return h == null ? '' : hourLabel(Number(h)); }
}

/** 1234.5 -> "₱1,234.50" (decimals only when needed) */
@Pipe({ name: 'peso', standalone: true })
export class PesoPipe implements PipeTransform {
  transform(v: number | string | null | undefined): string {
    const n = Number(v || 0);
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
}

const STATUS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  for_verification: 'Verifying payment',
  confirmed: 'Confirmed',
  rejected: 'Payment rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
  pending: 'Pending approval',
  approved: 'Approved',
  suspended: 'Suspended',
  active: 'Active',
};

@Pipe({ name: 'status', standalone: true })
export class StatusPipe implements PipeTransform {
  transform(s: string | null | undefined): string { return s ? STATUS[s] || s : ''; }
}

/** "2026-11-05" -> "Thu, Nov 5, 2026" */
@Pipe({ name: 'niceDate', standalone: true })
export class NiceDatePipe implements PipeTransform {
  transform(d: string | null | undefined, short = false): string {
    if (!d) return '';
    const date = new Date(d.slice(0, 10) + 'T00:00:00');
    return date.toLocaleDateString('en-US', short
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/** Local date as YYYY-MM-DD */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const SHARED_PIPES = [HourPipe, PesoPipe, StatusPipe, NiceDatePipe];
