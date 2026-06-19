import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { Channel, Message } from '@core/models/messaging.models';

@Injectable({ providedIn: 'root' })
export class MessagingService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/nexawork-messaging-api-v1/api/v1/messaging`;

  getChannels(): Observable<{ data: Channel[] }> {
    return this.http.get<{ data: Channel[] }>(`${this.base}/channels`);
  }

  createChannel(name: string, projectId?: number, channelType?: string): Observable<{ data: Channel }> {
    return this.http.post<{ data: Channel }>(`${this.base}/channels`, { name, projectId, channelType });
  }

  getMessages(channelId: number, page = 0, size = 50): Observable<{ data: Message[] }> {
    return this.http.get<{ data: Message[] }>(
      `${this.base}/channels/${channelId}/messages?page=${page}&size=${size}`);
  }

  sendMessage(channelId: number, content: string): Observable<{ data: Message }> {
    return this.http.post<{ data: Message }>(
      `${this.base}/channels/${channelId}/messages`, { content });
  }
}
