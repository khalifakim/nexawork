import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { MessagingService } from '@core/services/messaging.service';
import { WebSocketService } from '@core/services/websocket.service';
import { Store } from '@ngrx/store';
import { selectToken } from '@store/auth/auth.selectors';
import { environment } from '@environment/environment';
import { Channel, Message } from '@core/models/messaging.models';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="d-flex h-100 gap-0" style="height:calc(100vh - 80px)">
      <!-- Channel list -->
      <div class="border-end" style="width:240px;overflow-y:auto">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="mb-0">Canaux</h6>
          <button class="btn btn-sm btn-outline-primary" (click)="showCreate = !showCreate">+</button>
        </div>
        @if (showCreate) {
          <div class="p-2">
            <input [(ngModel)]="newChannelName" class="form-control form-control-sm mb-1"
              placeholder="Nom du canal" />
            <button class="btn btn-sm btn-success w-100" (click)="createChannel()">Créer</button>
          </div>
        }
        @for (ch of channels(); track ch.id) {
          <div class="p-2 px-3 border-bottom"
            [class.bg-primary]="selectedChannel()?.id === ch.id"
            [class.text-white]="selectedChannel()?.id === ch.id"
            (click)="selectChannel(ch)" style="cursor:pointer">
            <span class="me-1 text-muted small">{{ ch.channelType === 'PUBLIC' ? '#' : '🔒' }}</span>
            {{ ch.name }}
          </div>
        } @empty {
          <div class="p-3 text-muted small">Aucun canal</div>
        }
      </div>
      <!-- Messages -->
      <div class="flex-grow-1 d-flex flex-column">
        @if (selectedChannel()) {
          <div class="p-3 border-bottom">
            <h6 class="mb-0"># {{ selectedChannel()!.name }}
              <span class="badge bg-secondary ms-2 fw-normal small">{{ selectedChannel()!.channelType }}</span>
            </h6>
          </div>
          <div class="flex-grow-1 overflow-auto p-3">
            @for (msg of messages(); track msg.id) {
              <div class="mb-3">
                <div class="d-flex align-items-center gap-2 mb-1">
                  <span class="fw-semibold">Utilisateur #{{ msg.senderUserId }}</span>
                  <small class="text-muted">{{ msg.sentAt | date:'HH:mm' }}</small>
                </div>
                <p class="mb-0 ps-1">{{ msg.content }}</p>
              </div>
            } @empty {
              <div class="text-center text-muted py-4">Aucun message dans ce canal.</div>
            }
          </div>
          <div class="p-3 border-top d-flex gap-2">
            <input [(ngModel)]="newMessage" class="form-control"
              placeholder="Message dans #{{ selectedChannel()!.name }}…"
              (keyup.enter)="sendMessage()" />
            <button class="btn btn-primary" (click)="sendMessage()">Envoyer</button>
          </div>
        } @else {
          <div class="d-flex align-items-center justify-content-center h-100 text-muted">
            Sélectionnez un canal pour afficher la conversation
          </div>
        }
      </div>
    </div>
  `,
})
export class ChannelsComponent implements OnInit, OnDestroy {
  private readonly messagingService = inject(MessagingService);
  private readonly wsService = inject(WebSocketService);
  private readonly store = inject(Store);
  private subscription?: Subscription;

  channels = signal<Channel[]>([]);
  selectedChannel = signal<Channel | null>(null);
  messages = signal<Message[]>([]);
  showCreate = false;
  newChannelName = '';
  newMessage = '';

  ngOnInit(): void {
    this.loadChannels();

    this.store.select(selectToken).subscribe(token => {
      if (token) this.wsService.connectMessaging(environment.wsMessagingUrl, token);
    });

    this.subscription = this.wsService.messages$.subscribe(msg => {
      this.messages.update(msgs => [...msgs, msg]);
    });
  }

  loadChannels(): void {
    this.messagingService.getChannels().subscribe(res => {
      this.channels.set(res.data.filter(c => c.channelType !== 'DIRECT'));
    });
  }

  selectChannel(channel: Channel): void {
    this.selectedChannel.set(channel);
    this.messagingService.getMessages(channel.id).subscribe(res =>
      this.messages.set([...res.data].reverse())
    );
    this.wsService.subscribeToChannel(channel.id);
  }

  createChannel(): void {
    if (!this.newChannelName.trim()) return;
    this.messagingService.createChannel(this.newChannelName).subscribe(() => {
      this.newChannelName = '';
      this.showCreate = false;
      this.loadChannels();
    });
  }

  sendMessage(): void {
    const channel = this.selectedChannel();
    if (!channel || !this.newMessage.trim()) return;
    this.wsService.sendMessage(channel.id, this.newMessage);
    this.newMessage = '';
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
