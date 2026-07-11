import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import {
  FileResponse, FolderContentResponse, FolderResponse, GedItem, GedType, TaskAttachmentLineResponse,
} from '@core/models/ged.models';
import { TASK_FOLDER } from '@core/util/ui.util';
import { FOLDER_DATA, projectRoot, SYSTEM_FOLDER_CONTENT } from '@core/mock/ged';
import { MembersService } from './members.service';
import { Member } from '@core/models/member.models';

export abstract class GedService {
  /**
   * Items in the folder reached by `path` (empty = root) for the given scope.
   * `projectId` (UUID) = GED de projet ; `null` = GED d'organisation.
   */
  abstract folderContent(path: string[], projectId: string | null): Observable<GedItem[]>;
}

@Injectable()
export class GedMockService extends GedService {
  folderContent(path: string[], _projectId: string | null): Observable<GedItem[]> {
    let items: GedItem[];
    if (path.length === 0) {
      items = projectRoot();
    } else {
      const last = path[path.length - 1];
      items = last === TASK_FOLDER ? SYSTEM_FOLDER_CONTENT : (FOLDER_DATA[last] ?? []);
    }
    return of(items).pipe(delay(80));
  }
}

@Injectable()
export class GedHttpService extends BaseHttpService implements GedService {
  private readonly members = inject(MembersService);

  folderContent(path: string[], projectId: string | null): Observable<GedItem[]> {
    return forkJoin({
      roots: this.roots(projectId),
      dir: this.members.directory(),
    }).pipe(switchMap(({ roots, dir }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      if (path.length === 0) {
        return of(roots.map(f => toFolderItem(f, byId)));
      }
      return this.resolveFolder(roots, path).pipe(switchMap(folderId => {
        if (!folderId) return of<GedItem[]>([]);
        return this.get$<FolderContentResponse>('ged', `/ged/folders/${folderId}/content`).pipe(
          map(content => toContentItems(content, byId)),
        );
      }));
    }));
  }

  private roots(projectId: string | null): Observable<FolderResponse[]> {
    return this.get$<FolderResponse[]>('ged', '/ged/folders', projectId ? { projectId } : undefined);
  }

  /**
   * Descend le chemin de noms de dossiers pour retrouver l'UUID du dossier cible.
   * Chaque niveau est résolu par le contenu (sous-dossiers) du niveau précédent.
   */
  private resolveFolder(roots: FolderResponse[], path: string[]): Observable<string | undefined> {
    const first = roots.find(f => displayName(f) === path[0]);
    if (!first) return of(undefined);
    return this.descend(first.id, path.slice(1));
  }

  private descend(folderId: string, rest: string[]): Observable<string | undefined> {
    if (rest.length === 0) return of(folderId);
    return this.get$<FolderContentResponse>('ged', `/ged/folders/${folderId}/content`).pipe(
      switchMap(content => {
        const next = content.subFolders.find(f => displayName(f) === rest[0]);
        if (!next) return of(undefined);
        return this.descend(next.id, rest.slice(1));
      }),
    );
  }
}

// ── Mapping payloads → GedItem ───────────────────────────────────────────────

/** Nom affiché d'un dossier (le dossier système porte le libellé attendu par l'UI). */
function displayName(f: FolderResponse): string {
  return f.folderType === 'TASK_ATTACHMENTS' ? TASK_FOLDER : f.name;
}

function toFolderItem(f: FolderResponse, byId: Map<string, Member>): GedItem {
  const system = f.folderType === 'TASK_ATTACHMENTS';
  return {
    id: f.id,
    type: 'folder',
    name: system ? TASK_FOLDER : f.name,
    owner: system ? '—' : (byId.get(f.createdByUserId)?.name ?? 'Membre'),
    size: '—',
    mod: formatDate(f.createdAt),
    by: byId.get(f.createdByUserId)?.name ?? 'Membre',
    system,
    restricted: f.restricted,
  };
}

function toFileItem(f: FileResponse, byId: Map<string, Member>): GedItem {
  return {
    id: f.id,
    type: gedType(f.name, f.contentType),
    name: f.name,
    owner: byId.get(f.addedByUserId)?.name ?? 'Membre',
    size: formatSize(f.fileSize),
    mod: formatDate(f.addedAt),
    by: byId.get(f.addedByUserId)?.name ?? 'Membre',
    added: formatDate(f.addedAt),
    restricted: f.restricted,
  };
}

function toTaskAttachmentItem(a: TaskAttachmentLineResponse, byId: Map<string, Member>): GedItem {
  return {
    id: a.attachmentId,
    type: gedType(a.fileName, a.contentType),
    name: a.fileName,
    owner: byId.get(a.uploadedByUserId)?.name ?? 'Membre',
    size: formatSize(a.fileSize),
    added: formatDate(a.uploadedAt),
    system: true,
    task: { id: a.taskId, title: a.taskTitle },
  };
}

function toContentItems(content: FolderContentResponse, byId: Map<string, Member>): GedItem[] {
  return [
    ...content.subFolders.map(f => toFolderItem(f, byId)),
    ...content.files.map(f => toFileItem(f, byId)),
    ...content.taskAttachments.map(a => toTaskAttachmentItem(a, byId)),
  ];
}

/** Type d'affichage GED d'un fichier depuis son nom / type MIME. */
function gedType(name: string, contentType?: string): GedType {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const ct = (contentType ?? '').toLowerCase();
  if (ext === 'pdf' || ct.includes('pdf')) return 'pdf';
  if (ext === 'fig') return 'fig';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || ct.startsWith('image')) return 'img';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || ct.includes('spreadsheet') || ct.includes('csv')) return 'sheet';
  return 'doc';
}

/** Taille lisible « 2,4 Mo » / « 880 Ko » (virgule décimale FR). */
function formatSize(bytes?: number): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',').replace(',0', '') + ' Mo';
}

/** Libellé de date relatif (aligné sur le filtre « Date » de la vue GED). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff <= 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff <= 7) return 'Cette semaine';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
