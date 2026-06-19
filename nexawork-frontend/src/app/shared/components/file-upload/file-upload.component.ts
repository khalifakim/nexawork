import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';

export interface UploadedFile {
  id: number;
  originalName: string;
  contentType: string;
  size: number;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  template: `
    <div class="d-flex align-items-center gap-2">
      <label class="btn btn-sm btn-outline-secondary mb-0" style="cursor:pointer">
        {{ label }}
        <input type="file" class="d-none" [accept]="accept"
          (change)="onFileSelected($event)" [disabled]="uploading" />
      </label>
      @if (uploading) {
        <span class="spinner-border spinner-border-sm text-primary" role="status"></span>
      }
      @if (errorMsg) {
        <span class="text-danger small">{{ errorMsg }}</span>
      }
    </div>
  `,
})
export class FileUploadComponent {
  @Input() label = 'Choisir un fichier';
  @Input() accept = '*/*';
  @Input() projectId?: number;
  @Input() taskId?: number;
  @Output() uploaded = new EventEmitter<UploadedFile>();

  private readonly http = inject(HttpClient);
  uploading = false;
  errorMsg = '';

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.errorMsg = '';

    const formData = new FormData();
    formData.append('file', file);
    if (this.projectId) formData.append('projectId', String(this.projectId));
    if (this.taskId)    formData.append('taskId',    String(this.taskId));

    this.http.post<{ data: UploadedFile }>(
      `${environment.apiUrl}/nexawork-file-api-v1/api/v1/files`, formData
    ).subscribe({
      next: res => { this.uploaded.emit(res.data); this.uploading = false; },
      error: () => { this.errorMsg = 'Échec de l\'upload'; this.uploading = false; },
    });
  }
}
