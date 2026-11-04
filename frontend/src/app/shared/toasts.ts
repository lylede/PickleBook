import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'pb-toasts',
  standalone: true,
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="'toast ' + t.type" (click)="toast.dismiss(t.id)">
          <span class="dot">{{ t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i' }}</span>
          <span>{{ t.text }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toasts { position: fixed; z-index: 300; left: 50%; bottom: 20px; transform: translateX(-50%); display: grid; gap: 10px; width: min(420px, calc(100% - 32px)); }
    .toast { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 14px; background: var(--ink); color: #fff; font-weight: 600; font-size: 14px; box-shadow: var(--shadow-lg); animation: pop .35s var(--ease); cursor: pointer; }
    .dot { width: 24px; height: 24px; flex: none; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 13px; background: rgba(255,255,255,.14); }
    .success .dot { background: var(--lime); color: var(--ink); }
    .error { background: #7f1d1d; }
    .error .dot { background: #fecaca; color: #7f1d1d; }
  `],
})
export class Toasts {
  toast = inject(ToastService);
}
