import { Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';

@Component({
  selector: 'pb-confirm',
  standalone: true,
  template: `
    @if (confirm.state(); as c) {
      <div class="modal-backdrop show"></div>
      <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true" (click)="confirm.answer(false)">
        <div class="modal-dialog modal-dialog-centered modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-content">
            <div class="modal-body p-4">
              <h2 class="h5 mb-2">{{ c.title }}</h2>
              <p class="text-secondary mb-4">{{ c.message }}</p>
              <div class="d-grid gap-2">
                <button type="button" class="btn" [class.btn-danger]="c.danger" [class.btn-primary]="!c.danger" (click)="confirm.answer(true)">{{ c.confirmText || 'Confirm' }}</button>
                <button type="button" class="btn btn-light" (click)="confirm.answer(false)">{{ c.cancelText || 'Cancel' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  confirm = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape() { if (this.confirm.state()) this.confirm.answer(false); }
}
