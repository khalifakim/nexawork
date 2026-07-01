import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkspaceLoaderOverlayComponent } from '@shared/overlays/workspace-loader/workspace-loader-overlay.component';
import { ToastComponent } from '@shared/overlays/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, WorkspaceLoaderOverlayComponent, ToastComponent],
  template: `
    <router-outlet />
    <app-workspace-loader />
    <app-toast />
  `,
})
export class AppComponent {}
