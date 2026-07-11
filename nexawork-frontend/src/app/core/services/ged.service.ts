import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { FilesHttpService } from '@core/http/files.http.service';
import {
  AccessMode, FileResponse, FolderContentResponse, FolderResponse, GedItem, GedType,
  TaskAttachmentLineResponse, VersionResponse,
} from '@core/models/ged.models';
import { TASK_FOLDER } from '@core/util/ui.util';
import { FOLDER_DATA, projectRoot, SYSTEM_FOLDER_CONTENT } from '@core/mock/ged';
import { MembersService } from './members.service';
import { SessionService } from './session.service';
import { Member } from '@core/models/member.models';

export abstract class GedService {
  /**
   * Items in the folder reached by `path` (empty = root) for the given scope.
   * `projectId` (UUID) = GED de projet ; `null` = GED d'organisation.
   */
  abstract folderContent(path: string[], projectId: string | null): Observable<GedItem[]>;

  // ── Écritures (I5b) ─────────────────────────────────────────────────────────
  /** Crée un dossier dans le dossier courant (résolu depuis `path`). */
  abstract createFolder(path: string[], projectId: string | null, name: string, restricted: boolean): Observable<void>;
  /** Importe un fichier dans le dossier courant (upload File Service puis référencement GED). */
  abstract importFile(path: string[], projectId: string | null, file: File, name: string, restricted: boolean): Observable<void>;
  /** Renomme un dossier ou un fichier. */
  abstract renameItem(item: GedItem, newName: string): Observable<void>;
  /** Supprime (corbeille pour un fichier) un dossier ou un fichier. */
  abstract deleteItem(item: GedItem): Observable<void>;

  // ── Bibliothèque (I5c) ──────────────────────────────────────────────────────
  /** Documents dont l'appelant est l'auteur. */
  abstract myDocuments(): Observable<GedItem[]>;
  /** Documents partagés avec l'appelant (grants). */
  abstract sharedWithMe(): Observable<GedItem[]>;
  /** Corbeille de l'appelant (suppression logique). */
  abstract trash(): Observable<GedItem[]>;
  /** Restaure un fichier depuis la corbeille. */
  abstract restoreFile(fileId: string): Observable<void>;
  /** Supprime définitivement un fichier de la corbeille. */
  abstract purgeFile(fileId: string): Observable<void>;
  /** Vide entièrement la corbeille. */
  abstract emptyTrash(): Observable<void>;

  // ── Versions (I5c) ──────────────────────────────────────────────────────────
  abstract versions(fileId: string): Observable<GedVersion[]>;
  /** Ajoute une version (upload File Service puis référencement). */
  abstract addVersion(fileId: string, projectId: string | null, file: File, note: string): Observable<void>;
  abstract restoreVersion(fileId: string, versionId: string): Observable<void>;
}

/** Version d'un document GED — vue d'affichage. */
export interface GedVersion {
  id: string;
  number: number;
  size: string;
  note?: string;
  author: string;
  date: string;
  current: boolean;
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
  // Mock : les écritures ne persistent pas (le mock sert d'affichage figé).
  createFolder(): Observable<void> { return of(void 0).pipe(delay(60)); }
  importFile(): Observable<void> { return of(void 0).pipe(delay(60)); }
  renameItem(): Observable<void> { return of(void 0).pipe(delay(60)); }
  deleteItem(): Observable<void> { return of(void 0).pipe(delay(60)); }

  myDocuments(): Observable<GedItem[]> { return of([]).pipe(delay(60)); }
  sharedWithMe(): Observable<GedItem[]> { return of([]).pipe(delay(60)); }
  trash(): Observable<GedItem[]> { return of([]).pipe(delay(60)); }
  restoreFile(): Observable<void> { return of(void 0).pipe(delay(60)); }
  purgeFile(): Observable<void> { return of(void 0).pipe(delay(60)); }
  emptyTrash(): Observable<void> { return of(void 0).pipe(delay(60)); }
  versions(): Observable<GedVersion[]> { return of([]).pipe(delay(60)); }
  addVersion(): Observable<void> { return of(void 0).pipe(delay(60)); }
  restoreVersion(): Observable<void> { return of(void 0).pipe(delay(60)); }
}

@Injectable()
export class GedHttpService extends BaseHttpService implements GedService {
  private readonly members = inject(MembersService);
  private readonly files = inject(FilesHttpService);
  private readonly session = inject(SessionService);

  createFolder(path: string[], projectId: string | null, name: string, restricted: boolean): Observable<void> {
    return this.parentFolderId(path, projectId).pipe(switchMap(parentId =>
      this.post$<FolderResponse>('ged', '/ged/folders', {
        name, parentId: parentId ?? null, projectId: projectId ?? null,
        accessMode: restricted ? 'PRIVATE' : 'OPEN' as AccessMode,
      }).pipe(map(() => void 0))));
  }

  importFile(path: string[], projectId: string | null, file: File, name: string, restricted: boolean): Observable<void> {
    return this.parentFolderId(path, projectId).pipe(switchMap(folderId =>
      this.files.upload('ged', file, {
        workspaceId: this.session.activeWorkspaceId(),
        ...(projectId ? { projectId } : {}),
      }).pipe(switchMap(stored =>
        this.post$<FileResponse>('ged', '/ged/files', {
          folderId: folderId ?? null,
          name: name.trim() || stored.fileName,
          fileUrl: stored.downloadUrl,
          fileSize: stored.size,
          contentType: stored.contentType,
          sourceFileId: stored.id,
          accessMode: restricted ? 'PRIVATE' : 'OPEN' as AccessMode,
        }).pipe(map(() => void 0))))));
  }

  renameItem(item: GedItem, newName: string): Observable<void> {
    if (!item.id) return of(void 0);
    const path = item.type === 'folder' ? `/ged/folders/${item.id}` : `/ged/files/${item.id}`;
    return this.patch$<unknown>('ged', path, { name: newName }).pipe(map(() => void 0));
  }

  deleteItem(item: GedItem): Observable<void> {
    if (!item.id) return of(void 0);
    const path = item.type === 'folder' ? `/ged/folders/${item.id}` : `/ged/files/${item.id}`;
    return this.delete$<void>('ged', path);
  }

  /** UUID du dossier courant (fin de `path`), ou `undefined` à la racine. */
  private parentFolderId(path: string[], projectId: string | null): Observable<string | undefined> {
    if (path.length === 0) return of(undefined);
    return this.roots(projectId).pipe(switchMap(roots => this.resolveFolder(roots, path)));
  }

  // ── Bibliothèque ────────────────────────────────────────────────────────────
  myDocuments(): Observable<GedItem[]> { return this.library('/ged/my-documents'); }
  sharedWithMe(): Observable<GedItem[]> { return this.library('/ged/shared-with-me'); }
  trash(): Observable<GedItem[]> { return this.library('/ged/trash'); }

  private library(path: string): Observable<GedItem[]> {
    return forkJoin({
      files: this.get$<FileResponse[]>('ged', path),
      dir: this.members.directory(),
    }).pipe(map(({ files, dir }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      return files.map(f => toFileItem(f, byId));
    }));
  }

  restoreFile(fileId: string): Observable<void> {
    return this.post$<FileResponse>('ged', `/ged/files/${fileId}/restore`, {}).pipe(map(() => void 0));
  }
  purgeFile(fileId: string): Observable<void> {
    return this.delete$<void>('ged', `/ged/trash/${fileId}`);
  }
  emptyTrash(): Observable<void> {
    return this.delete$<void>('ged', '/ged/trash');
  }

  // ── Versions ────────────────────────────────────────────────────────────────
  versions(fileId: string): Observable<GedVersion[]> {
    return forkJoin({
      list: this.get$<VersionResponse[]>('ged', `/ged/files/${fileId}/versions`),
      dir: this.members.directory(),
    }).pipe(map(({ list, dir }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      return list.map(v => ({
        id: v.id,
        number: v.versionNumber,
        size: formatSize(v.fileSize),
        note: v.note,
        author: byId.get(v.uploadedBy)?.name ?? 'Membre',
        date: formatDate(v.createdAt),
        current: v.current,
      }));
    }));
  }

  addVersion(fileId: string, projectId: string | null, file: File, note: string): Observable<void> {
    return this.files.upload('ged', file, {
      workspaceId: this.session.activeWorkspaceId(),
      ...(projectId ? { projectId } : {}),
    }).pipe(switchMap(stored =>
      this.post$<VersionResponse>('ged', `/ged/files/${fileId}/versions`, {
        sourceFileId: stored.id,
        fileUrl: stored.downloadUrl,
        fileSize: stored.size,
        note: note || undefined,
      }).pipe(map(() => void 0))));
  }

  restoreVersion(fileId: string, versionId: string): Observable<void> {
    return this.post$<VersionResponse>('ged', `/ged/files/${fileId}/versions/${versionId}/restore`, {}).pipe(map(() => void 0));
  }

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
