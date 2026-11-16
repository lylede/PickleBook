import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'pb-toasts',
  standalone: true,
  template: `
    <div class="toast-area" aria-live="polite" aria-atomic="true">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast show align-items-center border-0 w-100" [class.text-bg-dark]="t.type !== 'error'" [class.text-bg-danger]="t.type === 'error'" role="status">
          <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2 fw-semibold">
              <i [class]="'bi ' + (t.type === 'success' ? 'bi-check-circle-fill' : t.type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill')"></i>
              <span>{{ t.text }}</span>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Dismiss" (click)="toast.dismiss(t.id)"></button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-area { position: fixed; z-index: 1090; left: 50%; transform: translateX(-50%); width: min(420px, calc(100% - 24px));
      bottom: calc(var(--pb-tabbar-h) + 12px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 8px; }
    @media (min-width: 992px) { .toast-area { left: auto; right: 24px; bottom: 24px; transform: none; } }
  `],
})
export class Toasts {
  toast = inject(ToastService);
}
