import { Injectable, inject, signal } from '@angular/core';
import { SessionService } from './session.service';
import { ME } from '@core/util/ui.util';

export type GedAccessMode = 'open' | 'private' | 'shared';
export interface GedGrant { type: 'user' | 'team'; name: string; level: 'READER' | 'EDITOR'; }
export interface GedRestriction { mode: GedAccessMode; grants: GedGrant[]; owner?: string; }

/**
 * Shared bus for the GED « Gérer les accès » / « Historique des versions » modals
 * (rendered once at the app-shell level) AND the source of truth for per-document
 * access restrictions — so any documents view can show the lock indicator next to
 * a restricted item's name, exactly like the prototype's `gedRestrict` state.
 *
 * Each restriction now optionally carries `owner` (the creator's display name).
 * This drives REF G (private/shared visibility), R12 (only creator or ADMIN
 * can delete) and R13 (owner cannot be removed from grants).
 */
@Injectable({ providedIn: 'root' })
export class GedOverlayBus {
  private session = inject(SessionService);

  readonly accessName = signal<string | null>(null);
  readonly versionsName = signal<string | null>(null);

  /** Restrictions keyed by document/folder name. Seeded like the prototype. */
  readonly restrictions = signal<Record<string, GedRestriction>>({
    // Private document created by another user — invisible to the demo user.
    'Budget prévisionnel.xlsx': { mode: 'private', grants: [], owner: 'Sarah Diallo' },
    // Shared with Sarah (editor) + the "Design produit" team (reader).
    'Specs & cahier des charges': { mode: 'shared', grants: [
      { type: 'user', name: 'Sarah Diallo', level: 'EDITOR' },
      { type: 'team', name: 'Design produit', level: 'READER' },
    ], owner: 'Moussa Bâ' },
  });

  openAccess(name: string): void { this.accessName.set(name); }
  openVersions(name: string): void { this.versionsName.set(name); }

  restrictionOf(name: string): GedRestriction {
    return this.restrictions()[name] ?? { mode: 'open', grants: [] };
  }

  /** A name is "restricted" when it's private, or shared with at least one grant. */
  hasRestriction(name: string): boolean {
    const r = this.restrictionOf(name);
    return r.mode === 'private' || (r.mode === 'shared' && r.grants.length > 0);
  }

  /** Persist the access choice; `open` clears the restriction (keeps owner if any). */
  setRestriction(name: string, r: GedRestriction): void {
    this.restrictions.update(map => {
      const next = { ...map };
      const prev = map[name];
      const owner = r.owner ?? prev?.owner;
      if (r.mode === 'open') {
        // Clear restriction entirely; owner metadata is no longer needed.
        delete next[name];
      } else {
        next[name] = { mode: r.mode, grants: r.mode === 'shared' ? r.grants : [], owner };
      }
      return next;
    });
  }

  /**
   * REF G — resolve access for the current user. Returns true if the user can
   * see the document. ADMIN + OWNER of the workspace see everything (admin
   * override); the creator always sees their own items; grantees see what
   * they've been granted.
   */
  hasAccess(name: string, itemOwner?: string): boolean {
    const r = this.restrictionOf(name);
    if (r.mode === 'open' && !r.owner && !itemOwner) return true;
    const owner = r.owner ?? itemOwner;
    // Admin override.
    if (this.session.isAdmin()) return true;
    // Owner sees their own items regardless of restriction.
    if (owner === ME) return true;
    if (r.mode === 'open') return true;
    if (r.mode === 'private') return false;
    // shared
    return r.grants.some(g => g.type === 'user' && g.name === ME);
  }

  /** R12 — only the creator or an ADMIN/OWNER can delete an item. */
  canDelete(name: string, itemOwner?: string): boolean {
    if (this.session.isAdmin()) return true;
    const owner = this.restrictionOf(name).owner ?? itemOwner;
    return owner === ME;
  }

  /** R13 — the owner of a document is the person that must never be removed
   *  from its grants. Used by the ged-access-modal to lock that row. */
  ownerOf(name: string, fallback?: string): string | null {
    return this.restrictionOf(name).owner ?? fallback ?? null;
  }
}
