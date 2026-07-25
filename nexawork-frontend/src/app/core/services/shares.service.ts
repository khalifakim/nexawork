import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseHttpService } from '@core/http/base-http.service';
import { CreateShareLinkRequest, ShareLinkResponse } from '@core/models/ged.models';

/**
 * Liens de partage externes GED — surface AUTHENTIFIÉE (Brique 4). Création,
 * liste et révocation de mes liens. La surface publique (consultation par token)
 * est dans {@link PublicShareService}.
 */
@Injectable({ providedIn: 'root' })
export class SharesService extends BaseHttpService {

  create(request: CreateShareLinkRequest): Observable<ShareLinkResponse> {
    return this.post$<ShareLinkResponse>('ged', '/ged/shares', request);
  }

  myLinks(): Observable<ShareLinkResponse[]> {
    return this.get$<ShareLinkResponse[]>('ged', '/ged/shares');
  }

  revoke(id: string): Observable<void> {
    return this.delete$<void>('ged', `/ged/shares/${id}`);
  }
}
