import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { SearchResult } from '@core/models/search.models';
import { SEARCH_BY_WORKSPACE } from '@core/mock/search';
import { SessionService } from './session.service';

/**
 * Global search (workspace-scoped). Swap `SearchMockService` for an HTTP impl
 * when the backend is connected — components depend only on this abstract class.
 */
export abstract class SearchService {
  /** All searchable entries of the active workspace (filtering is done client-side today). */
  abstract all(): Observable<SearchResult[]>;
}

@Injectable()
export class SearchMockService extends SearchService {
  private readonly session = inject(SessionService);
  all(): Observable<SearchResult[]> {
    return of(SEARCH_BY_WORKSPACE[this.session.activeWorkspaceId()] ?? []).pipe(delay(80));
  }
}
