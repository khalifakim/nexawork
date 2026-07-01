import { GedType } from '@core/models/ged.models';

/**
 * Pure presentation helpers & constants (backend-agnostic). Components import
 * these directly — they never change when the data source moves to the API.
 */

/** Current demo user display name (used to exclude self from member lists). */
export const ME = 'Akim Koné';

/** Two-letter initials for an avatar. */
export function initials(name: string): string {
  return name.split(/\s+/).map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
}

/** URL slug from any label, e.g. "Refonte App Mobile" -> "refonte-app-mobile". */
export function slugify(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Alias kept for readability when slugging a member name. */
export const slugName = slugify;

/** Document type → icon name / accent color (GED). */
export const GED_ICON: Record<GedType, string> = {
  folder: 'folder', pdf: 'file', doc: 'file', img: 'image', sheet: 'sheet', fig: 'fig',
};
export const GED_COLOR: Record<GedType, string> = {
  folder: '#E89A2C', pdf: '#F5564E', doc: '#3AA9E0', img: '#2BB673', sheet: '#1F8A5B', fig: '#A259FF',
};

/** Name of the system "task attachments" folder. */
export const TASK_FOLDER = 'Pièces jointes aux tâches';

/** Kanban tag color → tint background. */
export const TAG_TINT: Record<string, string> = {
  '#6C70F0': '#EEEDFB', '#3AA9E0': '#E7F4FB', '#2BB673': '#E6F6EE', '#E0497B': '#FCEAF1', '#F2693C': '#FCEDE6',
};
