import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, timer, EMPTY } from 'rxjs';
import { retryWhen, delayWhen, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService }  from './auth.service';

export interface WsMessage {
  type: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private readonly messages$ = new Subject<WsMessage>();
  private reconnectAttempts  = 0;
  private readonly maxReconnects = 5;
  private pingInterval: any;

  constructor(private auth: AuthService) {}

  connect(): Observable<WsMessage> {
    this.createConnection();
    return this.messages$.asObservable();
  }

  private createConnection() {
    const token = this.auth.getToken();
    if (!token) return;

    const url = `${environment.wsUrl}?token=${encodeURIComponent(token)}`;
    this.ws   = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        this.messages$.next(msg);
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.stopPing();
      if (this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts++;
        setTimeout(() => this.createConnection(), 2000 * this.reconnectAttempts);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  subscribe(channelId: string) {
    this.send({ type: 'SUBSCRIBE', channelId });
  }

  unsubscribe(channelId: string) {
    this.send({ type: 'UNSUBSCRIBE', channelId });
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private startPing() {
    this.pingInterval = setInterval(() => this.send({ type: 'PING' }), 25_000);
  }

  private stopPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  disconnect() {
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  ngOnDestroy() { this.disconnect(); }
}