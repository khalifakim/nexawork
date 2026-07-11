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
  task?: { id: string; title: string };
  /** UUID backend (dossier ou fichier GED) — absent des fixtures mock. */
  id?: string;
  /** Restriction d'accès portée par le backend (open/private/shared). */
  restricted?: boolean;
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
}

export interface TaskAttachmentLineResponse {
  attachmentId: string;
  taskId: string;
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
