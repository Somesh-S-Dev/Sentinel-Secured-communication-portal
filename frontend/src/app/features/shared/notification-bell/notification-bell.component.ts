import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink }     from '@angular/router';
import { MatIconModule }  from '@angular/material/icon';
import { MatButtonModule }from '@angular/material/button';
import { MatMenuModule }  from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { ApiService }     from '../../../core/services/api.service';
import { Notification }   from '../../../core/models/report.model';

@Component({
  selector:   'snt-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule],
  template: `
<button mat-icon-button [matMenuTriggerFor]="menu" class="bell-btn"
        [matBadge]="unread() > 0 ? unread() : null"
        matBadgeColor="warn" matBadgeSize="small">
  <mat-icon>notifications</mat-icon>
</button>

<mat-menu #menu="matMenu" class="notif-menu">
  <div class="notif-header" (click)="$event.stopPropagation()">
    <span>Notifications</span>
    @if (unread() > 0) {
      <button class="mark-all" (click)="markAll()">Mark all read</button>
    }
  </div>

  @if (notifications().length === 0) {
    <div class="notif-empty" (click)="$event.stopPropagation()">
      <mat-icon>notifications_none</mat-icon>
      <span>No notifications</span>
    </div>
  }

  @for (n of notifications(); track n.id) {
    <div class="notif-item" [class.unread]="!n.isRead"
         (click)="markRead(n)">
      <div class="notif-dot" [class.visible]="!n.isRead"></div>
      <div class="notif-body">
        <div class="notif-title">{{ n.title }}</div>
        <div class="notif-text">{{ n.body }}</div>
        <div class="notif-time">{{ n.createdAt | date:'MMM d, HH:mm' }}</div>
      </div>
    </div>
  }
</mat-menu>
  `,
  styles: [`
    .bell-btn ::ng-deep .mat-badge-content {
      font-size: 9px; min-width: 16px; height: 16px; line-height: 16px;
    }
    .notif-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 16px 8px;
      font-size: 12px; font-weight: 500; color: var(--navy-300);
      border-bottom: 1px solid var(--navy-600);
    }
    .mark-all {
      background: none; border: none; cursor: pointer;
      font-size: 11px; color: var(--accent); font-family: var(--font-sans);
      &:hover { text-decoration: underline; }
    }
    .notif-empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 6px; padding: 20px 16px; color: var(--navy-500);
      font-size: 12px;
      mat-icon { font-size: 24px; }
    }
    .notif-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 16px; cursor: pointer;
      transition: background .1s;
      &:hover { background: var(--navy-700); }
      &.unread { background: rgba(59,125,232,.04); }
    }
    .notif-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: transparent; margin-top: 4px; flex-shrink: 0;
      &.visible { background: var(--accent); }
    }
    .notif-body { flex: 1; min-width: 0; }
    .notif-title { font-size: 12px; font-weight: 500; color: var(--navy-100); margin-bottom: 2px; }
    .notif-text  { font-size: 11px; color: var(--navy-400); line-height: 1.5; }
    .notif-time  { font-size: 10px; color: var(--navy-600); font-family: var(--font-mono); margin-top: 3px; }

    ::ng-deep .notif-menu {
      max-width: 320px !important; width: 320px;
      max-height: 400px; overflow-y: auto;
    }
  `],
})
export class NotificationBellComponent implements OnInit {
  notifications = signal<Notification[]>([]);
  unread        = signal(0);

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getNotifications().subscribe(({ notifications, unreadCount }) => {
      this.notifications.set(notifications);
      this.unread.set(unreadCount);
    });
  }

  markRead(n: Notification) {
    if (n.isRead) return;
    this.api.markNotificationsRead([n.id]).subscribe(() => {
      this.notifications.update(ns => ns.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      this.unread.update(v => Math.max(0, v - 1));
    });
  }

  markAll() {
    this.api.markAllNotificationsRead().subscribe(() => {
      this.notifications.update(ns => ns.map(n => ({ ...n, isRead: true })));
      this.unread.set(0);
    });
  }
}
