import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import { BaseHttpService } from '@core/http/base-http.service';
import { SearchHitResponse, SearchResult } from '@core/models/search.models';
import { SEARCH_BY_WORKSPACE } from '@core/mock/search';
import { initials } from '@core/util/ui.util';
import { SessionService } from './session.service';

/**
 * Global search (workspace-scoped). Swap `SearchMockService` for
 * `SearchHttpService` via `environment.mock.search`.
 */
export abstract class SearchService {
  /** All searchable entries of the active workspace (mock : filtrage côté client). */
  abstract all(): Observable<SearchResult[]>;
  /**
   * Recherche fédérée sur un terme. Le backend interroge chaque domaine en
   * respectant les droits (REF F canaux privés, REF G documents restreints).
   */
  abstract query(q: string): Observable<SearchResult[]>;
}

@Injectable()
export class SearchMockService extends SearchService {
  private readonly session = inject(SessionService);
  all(): Observable<SearchResult[]> {
    return of(SEARCH_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
  /** Mock : filtre localement le jeu de données figé. */
  query(q: string): Observable<SearchResult[]> {
    const term = q.trim().toLowerCase();
    return this.all().pipe(map(list => !term ? list : list.filter(r =>
      r.name.toLowerCase().includes(term)
      || (r.mono ?? '').toLowerCase().includes(term)
      || r.ctx.toLowerCase().includes(term),
    )));
  }
}

@Injectable()
export class SearchHttpService extends BaseHttpService implements SearchService {
  /** L'API de recherche est indexée par terme : sans terme, aucun résultat. */
  all(): Observable<SearchResult[]> { return of([]); }

  /**
   * Interroge en parallèle les quatre domaines exposant `/search?q=` (projets +
   * tâches, documents, canaux + messages, personnes) et fusionne les résultats.
   * Un domaine en échec ne fait pas échouer la recherche entière.
   */
  query(q: string): Observable<SearchResult[]> {
    // Terme vide autorisé : le back renvoie le « top N » de chaque domaine, ce qui
    // peuple l'overlay dès l'ouverture (avant toute frappe). `q=` reste envoyé
    // (paramètre présent mais vide) — les endpoints l'exigent.
    const term = q.trim();
    const params = { q: term };

    // Un domaine en échec ne fait pas échouer la recherche entière, mais l'erreur
    // est désormais VISIBLE en console (elle était totalement avalée) : c'est ce
    // qui manquait pour diagnostiquer une recherche « qui ne renvoie rien ».
    const domain = (svc: 'project' | 'ged' | 'messaging' | 'auth') =>
      this.get$<SearchHitResponse[]>(svc, '/search', params).pipe(
        catchError(err => { console.error(`[recherche] échec ${svc}/search :`, err); return of<SearchHitResponse[]>([]); }));

    return forkJoin([domain('project'), domain('ged'), domain('messaging'), domain('auth')])
      .pipe(map(groups => groups.flat().map(toResult)));
  }
}

/** `SearchHitResponse` (backend) → `SearchResult` (ligne de l'overlay). */
function toResult(h: SearchHitResponse): SearchResult {
  return {
    id: h.id,
    type: h.type,
    name: h.name,
    ctx: h.ctx ?? '',
    date: '',
    mono: h.mono,
    color: h.color,
    // Marqueurs visuels de l'overlay, dérivés du type.
    hash: h.type === 'canaux' || undefined,
    radio: h.type === 'taches' ? (h.color ?? '#8E8AA0') : undefined,
    avatar: h.type === 'personnes' ? initials(h.name) : undefined,
    icon: h.type === 'documents' ? 'file' : undefined,
  };
}
