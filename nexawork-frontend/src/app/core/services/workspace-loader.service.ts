import { Injectable, signal } from '@angular/core';

/** Duration, in ms, the workspace entry loader is shown before navigation. */
export const WORKSPACE_LOADER_DURATION_MS = 1150;

/**
 * Global visibility state for the workspace entry loader.
 *
 * Mirrors the prototype's `showLoader` boolean + setTimeout(..., 1150): callers
 * trigger `show()` and the loader auto-hides after the fixed duration so the
 * animation can play out smoothly before the route actually changes.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceLoaderService {
  private readonly _visible = signal(false);
  readonly visible = this._visible.asReadonly();

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(durationMs: number = WORKSPACE_LOADER_DURATION_MS): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
    }
    this._visible.set(true);
    this.timer = setTimeout(() => {
      this._visible.set(false);
      this.timer = null;
    }, durationMs);
  }

  hide(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this._visible.set(false);
  }
}
