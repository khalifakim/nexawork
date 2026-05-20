import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NotificationService } from '@core/services/notification.service';
import { Notification } from '@core/models/notification.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">Notifications</h4>
      <button class="btn btn-sm btn-outline-secondary" (click)="markAllRead()">
        Tout marquer comme lu
      </button>
    </div>
    <div class="list-group">
      @for (notif of notifications(); track notif.id) {
        <div class="list-group-item" [class.list-group-item-light]="notif.read">
          <div class="d-flex justify-content-between">
            <strong>{{ notif.title }}</strong>
            <small class="text-muted">{{ notif.createdAt | date:'dd/MM HH:mm' }}</small>
          </div>
          @if (notif.body) {
            <p class="mb-0 text-muted small">{{ notif.body }}</p>
          }
          @if (!notif.read) {
            <span class="badge bg-primary ms-2">Nouveau</span>
          }
        </div>
      } @empty {
        <p class="text-muted text-center py-4">Aucune notification</p>
      }
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  notifications = signal<Notification[]>([]);

  ngOnInit(): void {
    this.notificationService.getAll().subscribe(res => this.notifications.set(res.data));
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe(() =>
      this.notifications.update(ns => ns.map(n => ({ ...n, read: true })))
    );
  }
}
