import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { GedItem } from '@core/models/ged.models';
import { TASK_FOLDER } from '@core/util/ui.util';
import { FOLDER_DATA, projectRoot, SYSTEM_FOLDER_CONTENT } from '@core/mock/ged';

export abstract class GedService {
  /** Items in the folder reached by `path` (empty = root) for the given scope. */
  abstract folderContent(path: string[], project: string | null): Observable<GedItem[]>;
}

@Injectable()
export class GedMockService extends GedService {
  folderContent(path: string[], _project: string | null): Observable<GedItem[]> {
    let items: GedItem[];
    if (path.length === 0) {
      items = projectRoot();
    } else {
      const last = path[path.length - 1];
      items = last === TASK_FOLDER ? SYSTEM_FOLDER_CONTENT : (FOLDER_DATA[last] ?? []);
    }
    return of(items).pipe(delay(80));
  }
}
