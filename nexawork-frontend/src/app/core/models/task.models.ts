export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  cat: 'notstarted' | 'active' | 'done' | 'closed';
}

export interface TaskCard {
  id: string;
  title: string;
  desc: string;
  prio: [string, string, string];   // [label, color, tintBg]
  tag: [string, string];            // [label, color]
  prog: [number, string];           // [percent, color]
  team: string[];                   // avatar colors
  links: number;
  comments: number;
}
