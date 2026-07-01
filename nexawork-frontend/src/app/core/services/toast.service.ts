import { Injectable, signal } from '@angular/core';

export interface ToastPayload { message: string; icon?: 'check' | 'info' | 'warning' | 'danger'; durationMs?: number; }

/**
 * Lightweight app-wide toast (mirrors the `notifyGed` slot in the prototype).
 * Only one toast is visible at a time — the latest one replaces any pending
 * one. Auto-hides after the configured duration.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _current = signal<ToastPayload | null>(null);
  readonly current = this._current.asReadonly();

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(payload: ToastPayload): void {
    if (this.timer != null) clearTimeout(this.timer);
    this._current.set({ icon: 'check', durationMs: 3000, ...payload });
    this.timer = setTimeout(() => {
      this._current.set(null);
      this.timer = null;
    }, payload.durationMs ?? 3000);
  }

  dismiss(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this._current.set(null);
  }
}
