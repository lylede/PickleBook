import { Component, computed, input } from '@angular/core';

const STATUS: Record<string, { label: string; icon: string; tone: string }> = {
  pending_payment: { label: 'Awaiting payment', icon: 'bi-hourglass-split', tone: 'warning' },
  for_verification: { label: 'Verifying payment', icon: 'bi-shield-check', tone: 'info' },
  confirmed: { label: 'Confirmed', icon: 'bi-check-circle-fill', tone: 'success' },
  completed: { label: 'Completed', icon: 'bi-check2-all', tone: 'secondary' },
  rejected: { label: 'Payment rejected', icon: 'bi-x-circle-fill', tone: 'danger' },
  cancelled: { label: 'Cancelled', icon: 'bi-slash-circle', tone: 'secondary' },
  pending: { label: 'Pending approval', icon: 'bi-hourglass-split', tone: 'warning' },
  approved: { label: 'Live', icon: 'bi-check-circle-fill', tone: 'success' },
  suspended: { label: 'Suspended', icon: 'bi-slash-circle', tone: 'danger' },
  active: { label: 'Active', icon: 'bi-check-circle-fill', tone: 'success' },
};

/** Booking, facility or user status as a coloured pill with an icon. */
@Component({
  selector: 'pb-status',
  standalone: true,
  template: `
    <span [class]="'badge rounded-pill fw-semibold bg-' + s().tone + '-subtle text-' + s().tone + '-emphasis'">
      <i [class]="'bi ' + s().icon + ' me-1'"></i>{{ s().label }}
    </span>
  `,
})
export class StatusBadge {
  status = input.required<string>();
  s = computed(() => STATUS[this.status()] ?? { label: this.status(), icon: 'bi-circle', tone: 'secondary' });
}
