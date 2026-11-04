import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; type: 'success' | 'error' | 'info'; text: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private id = 0;

  show(text: string, type: Toast['type'] = 'info', ms = 3500) {
    const t = { id: ++this.id, type, text };
    this.toasts.update((list) => [...list, t]);
    setTimeout(() => this.dismiss(t.id), ms);
  }
  success(text: string) { this.show(text, 'success'); }
  error(text: string) { this.show(text, 'error', 5000); }
  dismiss(id: number) { this.toasts.update((list) => list.filter((t) => t.id !== id)); }
}
