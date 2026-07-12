import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { api } from '@core/http/api.config';
import { ToastService } from './toast.service';

/**
 * Rapports PDF (§17). Télécharge le PDF généré par le Project Service et le
 * remet à l'utilisateur (clic programmatique). L'état `busy` alimente le
 * spinner des boutons « Générer un rapport ».
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  /** Vrai pendant la génération — les vues désactivent le bouton. */
  readonly busy = signal(false);

  /**
   * Rapport d'un projet (§17.2). `workspaceName` est affiché en en-tête du PDF
   * (les workspaces sont gérés par l'Auth Service, inconnus du Project Service).
   */
  projectReport(projectId: string, workspaceName?: string): void {
    this.download(api('project', `/projects/${projectId}/report`), 'Rapport_projet', workspaceName);
  }

  /** Rapport global du workspace (§17.1). `workspaceName` affiché en en-tête. */
  workspaceReport(workspaceId: string, workspaceName?: string): void {
    this.download(api('project', `/workspaces/${workspaceId}/report`), 'Rapport_global', workspaceName);
  }

  private download(url: string, prefix: string, workspaceName?: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    const params = workspaceName ? new HttpParams().set('ws', workspaceName) : undefined;
    this.http.get(url, { responseType: 'blob', params }).subscribe({
      next: blob => {
        this.save(blob, prefix);
        this.busy.set(false);
        this.toast.show({ message: 'Rapport généré' });
      },
      error: () => {
        this.busy.set(false);
        // Le message d'erreur backend est déjà affiché par l'intercepteur.
      },
    });
  }

  private save(blob: Blob, prefix: string): void {
    const date = new Date().toISOString().slice(0, 10);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `${prefix}_${date}.pdf`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }
}
