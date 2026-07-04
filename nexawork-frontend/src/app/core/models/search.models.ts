/** A single result row in the global search overlay. */
export interface SearchResult {
  type: 'taches' | 'documents' | 'projets' | 'canaux' | 'messages' | 'personnes';
  name: string;
  ctx: string;
  date: string;
  mono?: string;    // task id shown mono
  avatar?: string;  // initials for a person
  color?: string;
  icon?: string;
  hash?: boolean;   // channel marker
  radio?: string;   // status dot color for a task
}
