export type GedType = 'folder' | 'pdf' | 'doc' | 'img' | 'sheet' | 'fig';

export interface GedItem {
  type: GedType;
  name: string;
  owner: string;
  size: string;
  mod?: string;
  by?: string;
  system?: boolean;
  added?: string;
  /** Date brute ISO (pour le filtre « Date » de la vue GED — l'affichage, lui, est exact). */
  rawDate?: string;
  task?: { id: string; key?: string; title: string };
  /** UUID backend (dossier ou fichier GED) — absent des fixtures mock. */
  id?: string;
  /** Chemin de téléchargement File Service — permet l'aperçu et le téléchargement réels. */
  url?: string;
  /** Restriction d'accès portée par le backend (open/private/shared). */
  restricted?: boolean;
  /** Projet d'appartenance (vide = GED d'organisation). */
  projectId?: string;
  /** Vrai si l'auteur est un déposant EXTERNE (lien de partage), pas un membre. */
  external?: boolean;
}

// ── Payloads backend (GED service) ──────────────────────────────────────────

export type AccessMode = 'OPEN' | 'PRIVATE' | 'SHARED';
export type FolderType = 'USER' | 'TASK_ATTACHMENTS';

export interface FolderResponse {
  id: string;
  name: string;
  parentId?: string;
  organisationId: string;
  projectId?: string;
  folderType: FolderType;
  accessMode: AccessMode;
  restricted: boolean;
  createdByUserId: string;
  createdAt: string;
}

export interface FileResponse {
  id: string;
  folderId: string;
  name: string;
  fileUrl: string;
  fileSize?: number;
  contentType?: string;
  sourceFileId?: string;
  projectId?: string;
  accessMode: AccessMode;
  restricted: boolean;
  addedByUserId: string;
  addedAt: string;
  deletedAt?: string;
  /** Déposant externe (lien de partage) : nom saisi ou « Anonyme » ; nul si import interne. */
  externalUploaderName?: string;
  /** E-mail éventuel du déposant externe. */
  externalUploaderEmail?: string;
}

export interface TaskAttachmentLineResponse {
  attachmentId: string;
  taskId: string;
  /** Identifiant lisible de la tâche (PREFIX-NNN). */
  taskKey?: string;
  taskTitle: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  contentType?: string;
  uploadedByUserId: string;
  uploadedAt: string;
  readOnly: boolean;
  contextType: string;
}

export interface FolderContentResponse {
  folder: FolderResponse;
  subFolders: FolderResponse[];
  files: FileResponse[];
  taskAttachments: TaskAttachmentLineResponse[];
}

export interface VersionResponse {
  id: string;
  gedFileId: string;
  versionNumber: number;
  sourceFileId?: string;
  fileUrl: string;
  fileSize?: number;
  note?: string;
  uploadedBy: string;
  createdAt: string;
  current: boolean;
}

export type TargetType = 'FOLDER' | 'FILE';
export type GranteeType = 'USER' | 'TEAM';
export type AccessLevel = 'READER' | 'EDITOR';

// ── Liens de partage externes (Brique 4) ─────────────────────────────────────

export type ShareMode = 'READ' | 'DROP';

/** Création d'un lien de partage externe (endpoint authentifié). */
export interface CreateShareLinkRequest {
  targetType: TargetType;
  targetId: string;
  mode: ShareMode;
  /** Mot de passe en clair (optionnel) — haché côté serveur. */
  password?: string;
  /** Date d'expiration ISO (optionnelle). */
  expiresAt?: string;
  /** Expiration par nombre d'accès (optionnelle ; 1 = usage unique). */
  maxAccess?: number;
  /** Garde-fous de dépôt (mode DROP). */
  maxUploadBytes?: number;
  allowedExtensions?: string;
}

/** Vue authentifiée d'un lien (créateur / gestion). */
export interface ShareLinkResponse {
  id: string;
  token: string;
  path: string;
  targetType: TargetType;
  targetId: string;
  targetName: string;
  mode: ShareMode;
  hasPassword: boolean;
  expiresAt?: string;
  maxAccess?: number;
  accessCount: number;
  maxUploadBytes?: number;
  allowedExtensions?: string;
  revoked: boolean;
  active: boolean;
  createdAt: string;
}

/** Une ligne de fichier exposée par un lien READ sur un dossier. */
export interface PublicShareFileLine {
  id: string;
  name: string;
  contentType?: string;
  fileSize?: number;
}

/** Vue publique d'un lien (page /s/:token, sans compte). */
export interface PublicShareInfo {
  mode: ShareMode;
  targetType: TargetType;
  active: boolean;
  reason: string;
  passwordRequired: boolean;
  unlocked: boolean;
  targetName?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  files?: PublicShareFileLine[];
  remainingAccess?: number;
  maxUploadBytes?: number;
  allowedExtensions?: string;
}

export interface GrantResponse {
  id: string;
  targetType: TargetType;
  targetId: string;
  granteeType: GranteeType;
  granteeId: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  createdAt: string;
  owner: boolean;
}
