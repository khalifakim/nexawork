import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorkspaceLoaderService } from '@core/services/workspace-loader.service';

/**
 * Fullscreen loader shown when entering a workspace from the onboarding flow.
 *
 * Reproduces verbatim the `loaderScreen()` overlay in
 * `NexaWork Onboarding.dc.html`: ink background, brand mark + wordmark, and
 * the `nxloader` indeterminate progress bar.
 */
@Component({
  selector: 'app-workspace-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loader.visible()) {
      <div class="wl" role="status" aria-label="Chargement de l'espace de travail">
        <div class="wl__brand">
          <svg class="wl__mark" width="56" height="56" viewBox="0 0 120 120" aria-hidden="true">
            <g style="isolation:isolate">
              <circle cx="60" cy="43" r="25" fill="#7E81F2" style="mix-blend-mode:screen"></circle>
              <circle cx="43" cy="73" r="25" fill="#3FCB8C" style="mix-blend-mode:screen"></circle>
              <circle cx="77" cy="73" r="25" fill="#FF8351" style="mix-blend-mode:screen"></circle>
            </g>
          </svg>
          <span class="wl__word">
            nexa<span class="wl__word--accent">work</span><span class="wl__word--accent">.</span>
          </span>
        </div>
        <div class="wl__bar" aria-hidden="true">
          <div class="wl__bar-fill"></div>
        </div>
      </div>
    }
  `,
  styles: [`
    .wl { position: fixed; inset: 0; z-index: 200; background: #16131F;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 36px; }
    .wl__brand { display: flex; align-items: center; gap: 16px; }
    .wl__word { font-family: var(--nx-font); font-size: 32px; font-weight: 700; color: #fff; letter-spacing: -.03em; }
    .wl__word--accent { color: #5B5FE9; }
    .wl__bar { width: 280px; height: 4px; border-radius: 4px; background: rgba(255,255,255,.15); overflow: hidden; }
    .wl__bar-fill { width: 40%; height: 100%; border-radius: 4px; background: rgba(236,234,228,.85);
      animation: nxloader 0.6s ease-in-out infinite; }
  `],
})
export class WorkspaceLoaderOverlayComponent {
  protected readonly loader = inject(WorkspaceLoaderService);
}
