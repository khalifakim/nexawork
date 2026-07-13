import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { map, delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { FilesHttpService } from '@core/http/files.http.service';
import {
  AccessMode, FileResponse, FolderContentResponse, FolderResponse, GedItem, GedType,
  GrantResponse, TaskAttachmentLineResponse, VersionResponse,
} from '@core/models/ged.models';
import { TASK_FOLDER, avatarColorFor } from '@core/util/ui.util';
import { FOLDER_DATA, projectRoot, SYSTEM_FOLDER_CONTENT } from '@core/mock/ged';
import { MembersService } from './members.service';
import { SessionService } from './session.service';
import { ProjectsService } from './projects.service';
import { Member } from '@core/models/member.models';
import { ProjectTeam } from '@core/models/project.models';

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
  /** Tous les fichiers d'un espace, à plat (racine + sous-dossiers). `null` = organisation. */
  abstract allFiles(projectId: string | null): Observable<GedItem[]>;
  /** Documents dont l'appelant est l'auteur. */
  abstract myDocuments(): Observable<GedItem[]>;
  /** Documents partagés avec l'appelant (grants). */
  abstract sharedWithMe(): Observable<GedItem[]>;
  /** Corbeille de l'appelant (suppression logique). */
  abstract trash(): Observable<GedItem[]>;
  /** Restaure un élément depuis la corbeille (fichier ou dossier). */
  abstract restoreFile(fileId: string, isFolder?: boolean): Observable<void>;
  /** Supprime définitivement un élément de la corbeille (fichier ou dossier). */
  abstract purgeFile(fileId: string, isFolder?: boolean): Observable<void>;
  /** Vide entièrement la corbeille. */
  abstract emptyTrash(): Observable<void>;

  // ── Versions (I5c) ──────────────────────────────────────────────────────────
  abstract versions(fileId: string): Observable<GedVersion[]>;
  /** Ajoute une version (upload File Service puis référencement). */
  abstract addVersion(fileId: string, projectId: string | null, file: File, note: string): Observable<void>;
  abstract restoreVersion(fileId: string, versionId: string): Observable<void>;

  // ── Accès / grants (I5c) ────────────────────────────────────────────────────
  /** Grants d'un élément (dossier ou fichier), par UUID. */
  abstract grantsOf(item: GedItem): Observable<GedGrant[]>;
  /** Applique le mode d'accès + la liste de bénéficiaires (diff côté service). */
  abstract saveAccess(item: GedItem, mode: AccessMode, grants: GedGrantInput[]): Observable<void>;
}

/** Bénéficiaire d'un accès — vue d'affichage (nom résolu). */
export interface GedGrant {
  id: string;
  granteeId: string;
  type: 'user' | 'team';
  name: string;
  color: string;
  level: 'READER' | 'EDITOR';
  owner: boolean;
}

/** Bénéficiaire soumis à l'enregistrement (par UUID). */
export interface GedGrantInput {
  granteeId: string;
  type: 'user' | 'team';
  level: 'READER' | 'EDITOR';
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

  allFiles(_projectId: string | null): Observable<GedItem[]> { return of([]).pipe(delay(60)); }
  myDocuments(): Observable<GedItem[]> { return of([]).pipe(delay(60)); }
  sharedWithMe(): Observable<GedItem[]> { return of([]).pipe(delay(60)); }
  trash(): Observable<GedItem[]> { return of([]).pipe(delay(60)); }
  restoreFile(): Observable<void> { return of(void 0).pipe(delay(60)); }
  purgeFile(): Observable<void> { return of(void 0).pipe(delay(60)); }
  emptyTrash(): Observable<void> { return of(void 0).pipe(delay(60)); }
  versions(): Observable<GedVersion[]> { return of([]).pipe(delay(60)); }
  addVersion(): Observable<void> { return of(void 0).pipe(delay(60)); }
  restoreVersion(): Observable<void> { return of(void 0).pipe(delay(60)); }
  grantsOf(): Observable<GedGrant[]> { return of([]).pipe(delay(60)); }
  saveAccess(): Observable<void> { return of(void 0).pipe(delay(60)); }
}

@Injectable()
export class GedHttpService extends BaseHttpService implements GedService {
  private readonly members = inject(MembersService);
  private readonly files = inject(FilesHttpService);
  private readonly session = inject(SessionService);
  private readonly projects = inject(ProjectsService);

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
          // À la racine (pas de dossier), on scope par projet (null = espace Organisation).
          projectId: folderId ? null : (projectId ?? null),
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

  /** Tous les fichiers d'un espace, à plat (racine + sous-dossiers, récursion complète). */
  allFiles(projectId: string | null): Observable<GedItem[]> {
    return forkJoin({
      files: this.get$<FileResponse[]>('ged', '/ged/files/all', projectId ? { projectId } : undefined),
      dir: this.members.directory(),
    }).pipe(map(({ files, dir }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      return files.map(f => toFileItem(f, byId));
    }));
  }

  // ── Bibliothèque ────────────────────────────────────────────────────────────
  myDocuments(): Observable<GedItem[]> { return this.library('/ged/my-documents'); }
  sharedWithMe(): Observable<GedItem[]> { return this.library('/ged/shared-with-me'); }

  /** Corbeille : fichiers ET dossiers supprimés par l'appelant (R11). */
  trash(): Observable<GedItem[]> {
    return forkJoin({
      files: this.get$<FileResponse[]>('ged', '/ged/trash'),
      folders: this.get$<FolderResponse[]>('ged', '/ged/folders/trash'),
      dir: this.members.directory(),
    }).pipe(map(({ files, folders, dir }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      return [
        ...folders.map(f => toFolderItem(f, byId)),
        ...files.map(f => toFileItem(f, byId)),
      ];
    }));
  }

  private library(path: string): Observable<GedItem[]> {
    return forkJoin({
      files: this.get$<FileResponse[]>('ged', path),
      dir: this.members.directory(),
    }).pipe(map(({ files, dir }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      return files.map(f => toFileItem(f, byId));
    }));
  }

  /** Restaure un élément de la corbeille (fichier ou dossier). */
  restoreFile(fileId: string, isFolder = false): Observable<void> {
    const path = isFolder ? `/ged/folders/${fileId}/restore` : `/ged/files/${fileId}/restore`;
    return this.post$<unknown>('ged', path, {}).pipe(map(() => void 0));
  }
  /** Supprime définitivement un élément de la corbeille (fichier ou dossier). */
  purgeFile(fileId: string, isFolder = false): Observable<void> {
    const path = isFolder ? `/ged/folders/trash/${fileId}` : `/ged/trash/${fileId}`;
    return this.delete$<void>('ged', path);
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

  // ── Accès / grants ──────────────────────────────────────────────────────────
  grantsOf(item: GedItem): Observable<GedGrant[]> {
    if (!item.id) return of([]);
    const targetType = item.type === 'folder' ? 'FOLDER' : 'FILE';
    return forkJoin({
      grants: this.get$<GrantResponse[]>('ged', '/ged/grants', { targetType, targetId: item.id }),
      dir: this.members.directory(),
      // Les équipes sont une notion de projet : résolues seulement pour un document projet.
      teams: item.projectId ? this.projects.teams(item.projectId) : of([] as ProjectTeam[]),
    }).pipe(map(({ grants, dir, teams }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      const teamById = new Map<string, ProjectTeam>(teams.map(t => [t.id, t]));
      return grants.map(g => {
        const isTeam = g.granteeType === 'TEAM';
        const team = isTeam ? teamById.get(g.granteeId) : undefined;
        const member = isTeam ? undefined : byId.get(g.granteeId);
        return {
          id: g.id,
          granteeId: g.granteeId,
          type: isTeam ? 'team' as const : 'user' as const,
          name: team?.name ?? member?.name ?? (isTeam ? 'Équipe' : 'Membre'),
          color: team?.color ?? member?.color ?? avatarColorFor(g.granteeId),
          level: g.accessLevel,
          owner: g.owner,
        };
      });
    }));
  }

  /**
   * Enregistre les accès : bascule le mode (OPEN/PRIVATE/SHARED) puis réconcilie
   * la liste des bénéficiaires (ajoute les nouveaux, retire les absents). Le
   * propriétaire n'est jamais retiré (R13, garanti côté serveur).
   */
  saveAccess(item: GedItem, mode: AccessMode, grants: GedGrantInput[]): Observable<void> {
    if (!item.id) return of(void 0);
    const isFolder = item.type === 'folder';
    const targetType = isFolder ? 'FOLDER' : 'FILE';
    const base = isFolder ? `/ged/folders/${item.id}/access` : `/ged/files/${item.id}/access`;

    return this.patch$<void>('ged', base, { accessMode: mode }).pipe(
      switchMap(() => this.grantsOf(item)),
      switchMap(existing => {
        const keep = new Set(grants.map(g => g.granteeId));
        const had = new Map(existing.filter(g => !g.owner).map(g => [g.granteeId, g]));

        const toRemove = existing.filter(g => !g.owner && !keep.has(g.granteeId));
        const toAdd = mode === 'SHARED'
          ? grants.filter(g => !had.has(g.granteeId) || had.get(g.granteeId)!.level !== g.level)
          : [];
        // Un niveau modifié = retrait puis ré-ajout (pas d'endpoint PATCH grant).
        const changed = mode === 'SHARED'
          ? grants.filter(g => had.has(g.granteeId) && had.get(g.granteeId)!.level !== g.level)
          : [];
        const removals = [
          ...toRemove,
          ...changed.map(g => had.get(g.granteeId)!),
          // Mode non partagé : on retire tous les bénéficiaires.
          ...(mode !== 'SHARED' ? existing.filter(g => !g.owner) : []),
        ];

        const calls: Observable<unknown>[] = [
          ...dedupe(removals).map(g => this.delete$<void>('ged', `/ged/grants/${g.id}`)),
          ...toAdd.map(g => this.post$<GrantResponse>('ged', '/ged/grants', {
            targetType, targetId: item.id,
            granteeType: g.type === 'team' ? 'TEAM' : 'USER',
            granteeId: g.granteeId,
            accessLevel: g.level,
          })),
        ];
        return calls.length ? forkJoin(calls).pipe(map(() => void 0)) : of(void 0);
      }),
    );
  }

  folderContent(path: string[], projectId: string | null): Observable<GedItem[]> {
    return forkJoin({
      roots: this.roots(projectId),
      dir: this.members.directory(),
    }).pipe(switchMap(({ roots, dir }) => {
      const byId = new Map<string, Member>(dir.map(m => [m.userId ?? '', m]));
      if (path.length === 0) {
        // Racine : dossiers racine + fichiers déposés à la racine (sans dossier, V2).
        return this.rootFiles(projectId).pipe(map(files => [
          ...roots.map(f => toFolderItem(f, byId)),
          ...files.map(f => toFileItem(f, byId)),
        ]));
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

  /** Fichiers à la racine de l'espace (sans dossier, V2). */
  private rootFiles(projectId: string | null): Observable<FileResponse[]> {
    return this.get$<FileResponse[]>('ged', '/ged/files/root', projectId ? { projectId } : undefined);
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

/** Dédoublonne des grants par id (un niveau modifié peut apparaître deux fois). */
function dedupe(grants: GedGrant[]): GedGrant[] {
  return [...new Map(grants.map(g => [g.id, g])).values()];
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
    projectId: f.projectId,
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
