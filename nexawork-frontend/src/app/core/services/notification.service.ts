import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { Notification } from '@core/models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/nexawork-notification-api-v1/api/v1/notifications`;

  getAll(): Observable<{ data: Notification[] }> {
    return this.http.get<{ data: Notification[] }>(this.base);
  }

  getUnreadCount(): Observable<{ data: { count: number } }> {
    return this.http.get<{ data: { count: number } }>(`${this.base}/unread-count`);
  }

  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.base}/mark-all-read`, {});
  }
}
