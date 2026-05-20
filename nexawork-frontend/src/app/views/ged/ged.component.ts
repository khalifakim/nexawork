import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';

interface GedFolder { id: number; name: string; parentId?: number; projectId?: number; }
interface GedFile   { id: number; folderId: number; name: string; fileUrl: string; addedAt: string; }

@Component({
  selector: 'app-ged',
  standalone: true,
  template: `
    <h4 class="mb-4">Gestion Électronique de Documents</h4>
    <div class="row g-3">
      @for (folder of folders(); track folder.id) {
        <div class="col-md-3">
          <div class="card shadow-sm" style="cursor:pointer" (click)="selectFolder(folder)">
            <div class="card-body text-center">
              <div class="fs-1 mb-2">📁</div>
              <h6 class="mb-0">{{ folder.name }}</h6>
            </div>
          </div>
        </div>
      } @empty {
        <p class="text-muted">Aucun dossier. Les dossiers sont créés automatiquement à la création d'un projet.</p>
      }
    </div>
    @if (selectedFolder()) {
      <div class="mt-4">
        <h6>Fichiers — {{ selectedFolder()!.name }}</h6>
        <div class="list-group">
          @for (file of files(); track file.id) {
            <a [href]="file.fileUrl" target="_blank" class="list-group-item list-group-item-action">
              📄 {{ file.name }}
            </a>
          } @empty {
            <p class="text-muted p-3">Aucun fichier dans ce dossier</p>
          }
        </div>
      </div>
    }
  `,
})
export class GedComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/nexawork-ged-api-v1/api/v1/ged`;

  folders = signal<GedFolder[]>([]);
  selectedFolder = signal<GedFolder | null>(null);
  files = signal<GedFile[]>([]);

  ngOnInit(): void {
    this.http.get<{ data: GedFolder[] }>(`${this.base}/folders`).subscribe(
      res => this.folders.set(res.data));
  }

  selectFolder(folder: GedFolder): void {
    this.selectedFolder.set(folder);
    this.http.get<{ data: GedFile[] }>(`${this.base}/folders/${folder.id}/files`).subscribe(
      res => this.files.set(res.data));
  }
}
