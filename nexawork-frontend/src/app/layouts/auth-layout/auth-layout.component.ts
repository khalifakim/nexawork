import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LogoComponent } from '@shared/ui/logo/logo.component';

/**
 * Onboarding shell: dark brand panel on the left, the current onboarding screen
 * (router-outlet) on the right. Mirrors `NexaWork Onboarding.dc.html`.
 */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LogoComponent],
  template: `
    <div class="auth">
      <aside class="brand">
        <svg class="brand__bg" width="540" height="540" viewBox="0 0 120 120">
          <circle cx="60" cy="43" r="25" fill="#fff"></circle>
          <circle cx="43" cy="73" r="25" fill="#fff"></circle>
          <circle cx="77" cy="73" r="25" fill="#fff"></circle>
        </svg>
        <div class="brand__inner">
          <app-logo [markSize]="54" [fontSize]="36" [onDark]="true" class="brand__logo" />
          <h2>L'espace de travail unifié de votre équipe.</h2>
          <p>Tâches, projets, documents, canaux et visio — réunis dans un seul espace clair et rapide.</p>
        </div>
        <div class="brand__footer">© 2026 nexa<span style="color:#7E81F2">work.</span></div>
      </aside>
      <main class="panel">
        <div class="panel__inner">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: [`
    .auth { height: 100vh; display: flex; overflow: hidden; background: var(--nx-bg); }
    .brand { flex: 0 0 46%; min-width: 380px; background: var(--nx-ink); color: #fff;
             display: flex; flex-direction: column; justify-content: center; padding: 52px 56px; position: relative; overflow: hidden; }
    .brand__bg { position: absolute; right: -150px; bottom: -160px; opacity: .06; }
    .brand__inner { position: relative; max-width: 420px; }
    .brand__logo { margin-bottom: 30px; }
    .brand h2 { font-size: 32px; font-weight: 700; letter-spacing: -.025em; line-height: 1.16; margin: 0 0 18px; }
    .brand p { font-size: 15.5px; line-height: 1.6; color: rgba(255,255,255,.6); margin: 0; }
    .brand__footer { position: absolute; bottom: 52px; left: 56px; font-size: 12.5px; color: rgba(255,255,255,.4); }
    .panel { flex: 1; background: var(--nx-bg); display: flex; align-items: center; justify-content: center; padding: 40px; overflow-y: auto; }
    .panel__inner { width: 100%; max-width: 420px; animation: nxFade .25s ease; }

    @media (max-width: 860px) { .brand { display: none; } }
  `],
})
export class AuthLayoutComponent {}
