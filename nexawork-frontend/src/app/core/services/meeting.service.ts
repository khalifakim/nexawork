import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { Call, CreateCallRequest } from '@core/models/meeting.models';

@Injectable({ providedIn: 'root' })
export class MeetingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/nexawork-meeting-api-v1/api/v1/meetings`;

  getCalls(): Observable<{ data: Call[] }> {
    return this.http.get<{ data: Call[] }>(this.base);
  }

  createCall(request: CreateCallRequest): Observable<{ data: Call }> {
    return this.http.post<{ data: Call }>(this.base, request);
  }

  joinCall(callId: number): Observable<{ data: Call }> {
    return this.http.post<{ data: Call }>(`${this.base}/${callId}/join`, {});
  }

  endCall(callId: number): Observable<any> {
    return this.http.post(`${this.base}/${callId}/end`, {});
  }
}
