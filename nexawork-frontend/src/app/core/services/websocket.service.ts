import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private messagingClient?: Client;
  private notificationClient?: Client;
  private messageSubject = new Subject<any>();
  private notificationSubject = new Subject<any>();

  readonly messages$ = this.messageSubject.asObservable();
  readonly notifications$ = this.notificationSubject.asObservable();

  connectMessaging(url: string, token: string): void {
    this.messagingClient = new Client({
      webSocketFactory: () => new SockJS(url),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => console.log('Messaging WS connected'),
      onDisconnect: () => console.log('Messaging WS disconnected'),
    });
    this.messagingClient.activate();
  }

  connectNotifications(url: string, token: string): void {
    this.notificationClient = new Client({
      webSocketFactory: () => new SockJS(url),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        console.log('Notification WS connected');
        this.notificationClient!.subscribe('/user/notifications', (msg: IMessage) => {
          this.notificationSubject.next(JSON.parse(msg.body));
        });
      },
    });
    this.notificationClient.activate();
  }

  subscribeToChannel(channelId: number): StompSubscription | undefined {
    if (!this.messagingClient?.connected) return undefined;
    return this.messagingClient.subscribe(`/topic/channels/${channelId}`, (msg: IMessage) => {
      this.messageSubject.next(JSON.parse(msg.body));
    });
  }

  sendMessage(channelId: number, content: string): void {
    this.messagingClient?.publish({
      destination: `/app/channels/${channelId}/send`,
      body: JSON.stringify({ content }),
    });
  }

  disconnect(): void {
    this.messagingClient?.deactivate();
    this.notificationClient?.deactivate();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
