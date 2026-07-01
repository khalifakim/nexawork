export interface Project {
  id: string;        // slug used in URLs
  name: string;
  color: string;
  progress: number;
  docs?: number;
  folders?: number;
}
