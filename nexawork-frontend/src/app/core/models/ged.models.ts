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
}
