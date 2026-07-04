export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  cat: 'notstarted' | 'active' | 'done' | 'closed';
}

/** Échéance bucket used by the Kanban "Échéance" filter. */
export type DueBucket = 'retard' | 'semaine' | 'mois';

export interface TaskCard {
  id: string;
  title: string;
  desc: string;
  prio: [string, string, string];   // [label, color, tintBg]
  tag: [string, string];            // [label, color]
  prog: [number, string];           // [percent, color]
  team: string[];                   // avatar colors (assignees)
  links: number;
  comments: number;
  due?: DueBucket;                  // échéance bucket for filtering
}
