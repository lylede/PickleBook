import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions { resolve: (ok: boolean) => void; }

/** Replaces the browser's confirm() with an in-page dialog. Usage: if (await confirm.ask({...})) { ... } */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.state.set({ ...options, resolve }));
  }

  answer(ok: boolean) {
    this.state()?.resolve(ok);
    this.state.set(null);
  }
}
