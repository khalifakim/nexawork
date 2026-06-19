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
  selector: 'app-conversations',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="d-flex h-100 gap-0" style="height:calc(100vh - 80px)">
      <!-- Conversation list -->
      <div class="border-end" style="width:240px;overflow-y:auto">
        <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 class="mb-0">Conversations directes</h6>
          <button class="btn btn-sm btn-outline-primary" (click)="showNew = !showNew"
            title="Nouvelle conversation">+</button>
        </div>
        @if (showNew) {
          <div class="p-2">
            <input [(ngModel)]="newConvName" class="form-control form-control-sm mb-1"
              placeholder="Nom (ex: alice)" />
            <button class="btn btn-sm btn-success w-100" (click)="createConversation()">Démarrer</button>
          </div>
        }
        @for (ch of conversations(); track ch.id) {
          <div class="p-2 px-3 border-bottom"
            [class.bg-primary]="selectedConv()?.id === ch.id"
            [class.text-white]="selectedConv()?.id === ch.id"
            (click)="selectConversation(ch)" style="cursor:pointer">
            <span class="me-1">👤</span>{{ ch.name }}
          </div>
        } @empty {
          <div class="p-3 text-muted small">Aucune conversation directe</div>
        }
      </div>
      <!-- Messages -->
      <div class="flex-grow-1 d-flex flex-column">
        @if (selectedConv()) {
          <div class="p-3 border-bottom">
            <h6 class="mb-0">👤 {{ selectedConv()!.name }}</h6>
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
              <div class="text-center text-muted py-4">Commencez la conversation !</div>
            }
          </div>
          <div class="p-3 border-top d-flex gap-2">
            <input [(ngModel)]="newMessage" class="form-control"
              placeholder="Message à {{ selectedConv()!.name }}…"
              (keyup.enter)="sendMessage()" />
            <button class="btn btn-primary" (click)="sendMessage()">Envoyer</button>
          </div>
        } @else {
          <div class="d-flex align-items-center justify-content-center h-100 text-muted">
            Sélectionnez une conversation ou démarrez-en une nouvelle
          </div>
        }
      </div>
    </div>
  `,
})
export class ConversationsComponent implements OnInit, OnDestroy {
  private readonly messagingService = inject(MessagingService);
  private readonly wsService = inject(WebSocketService);
  private readonly store = inject(Store);
  private subscription?: Subscription;

  conversations = signal<Channel[]>([]);
  selectedConv = signal<Channel | null>(null);
  messages = signal<Message[]>([]);
  showNew = false;
  newConvName = '';
  newMessage = '';

  ngOnInit(): void {
    this.loadConversations();

    this.store.select(selectToken).subscribe(token => {
      if (token) this.wsService.connectMessaging(environment.wsMessagingUrl, token);
    });

    this.subscription = this.wsService.messages$.subscribe(msg => {
      this.messages.update(msgs => [...msgs, msg]);
    });
  }

  loadConversations(): void {
    this.messagingService.getChannels().subscribe(res => {
      this.conversations.set(res.data.filter(c => c.channelType === 'DIRECT'));
    });
  }

  selectConversation(channel: Channel): void {
    this.selectedConv.set(channel);
    this.messagingService.getMessages(channel.id).subscribe(res =>
      this.messages.set([...res.data].reverse())
    );
    this.wsService.subscribeToChannel(channel.id);
  }

  createConversation(): void {
    if (!this.newConvName.trim()) return;
    this.messagingService.createChannel(this.newConvName, undefined, 'DIRECT').subscribe(() => {
      this.newConvName = '';
      this.showNew = false;
      this.loadConversations();
    });
  }

  sendMessage(): void {
    const ch = this.selectedConv();
    if (!ch || !this.newMessage.trim()) return;
    this.wsService.sendMessage(ch.id, this.newMessage);
    this.newMessage = '';
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
