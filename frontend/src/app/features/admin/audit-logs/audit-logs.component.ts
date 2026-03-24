import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService }      from '../../../core/services/api.service';

interface AuditLog {
  id:         string;
  action:     string;
  entity:     string;
  entityId:   string;
  meta:       any;
  createdAt:  string;
  reportId?:  string;
  admin?:     { displayName: string; role: string } | null;
}

const ACTION_ICONS: Record<string, string> = {
  CASE_VIEWED:          'visibility',
  STATUS_CHANGED:       'edit',
  CASE_ASSIGNED:        'person_add',
  ATTACHMENT_DOWNLOADED:'download',
  REPORTS_LISTED:       'list',
  ADMIN_CREATED:        'person_add_alt',
  ADMIN_DEACTIVATED:    'person_off',
};

@Component({
  selector:   'snt-audit-logs',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
<div class="audit-page">

  <div class="page-header">
    <div>
      <h1 class="page-title">Audit Logs</h1>
      <p class="page-sub">Complete immutable record of all admin actions</p>
    </div>
    <div class="header-right">
      <div class="secure-badge">
        <mat-icon>lock</mat-icon> IPs hashed · Tamper-evident
      </div>
    </div>
  </div>

  @if (loading()) {
    <div class="loading-center"><mat-spinner diameter="32"></mat-spinner></div>
  } @else {
    <div class="logs-list">
      @for (log of logs(); track log.id) {
        <div class="log-row">
          <div class="log-icon-wrap" [attr.data-action]="log.action">
            <mat-icon>{{ actionIcon(log.action) }}</mat-icon>
          </div>
          <div class="log-body">
            <div class="log-top">
              <span class="log-action mono">{{ formatAction(log.action) }}</span>
              @if (log.admin) {
                <span class="log-by">by <strong>{{ log.admin.displayName }}</strong></span>
                <span class="log-role mono">{{ log.admin.role | lowercase }}</span>
              } @else {
                <span class="log-by">System</span>
              }
            </div>
            <div class="log-detail">
              <span class="log-entity mono">{{ log.entity }}:</span>
              <span class="log-entity-id mono">{{ log.entityId | slice:0:12 }}…</span>
              @if (log.meta && objectKeys(log.meta).length) {
                @for (key of objectKeys(log.meta); track key) {
                  <span class="log-meta-kv">
                    <span class="mk">{{ key }}</span>=<span class="mv">{{ log.meta[key] }}</span>
                  </span>
                }
              }
            </div>
          </div>
          <div class="log-time mono">{{ log.createdAt | date:'MMM d, HH:mm:ss' }}</div>
        </div>
      }

      @if (logs().length === 0) {
        <div class="empty-state">
          <mat-icon>manage_search</mat-icon>
          <p>No audit events recorded yet</p>
        </div>
      }
    </div>

    @if (pages() > 1) {
      <div class="pagination">
        <button class="page-btn" [disabled]="page() <= 1" (click)="goPage(page() - 1)">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="page-info mono">Page {{ page() }} of {{ pages() }}</span>
        <button class="page-btn" [disabled]="page() >= pages()" (click)="goPage(page() + 1)">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    }
  }
</div>
  `,
  styles: [`
    .audit-page { height: 100%; overflow-y: auto; padding: 24px; }
    @media (max-width: 768px) { .audit-page { padding: 16px; } }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
    }
    .page-title  { font-size: 20px; font-weight: 500; margin: 0 0 4px; }
    .page-sub    { font-size: 13px; color: var(--navy-400); margin: 0; }
    .secure-badge {
      display: flex; align-items: center; gap: 5px;
      background: rgba(30,184,160,.07); border: 1px solid rgba(30,184,160,.18);
      border-radius: 20px; padding: 4px 12px;
      font-size: 11px; color: var(--teal); font-family: var(--font-mono);
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }

    .loading-center { display: flex; justify-content: center; padding: 60px; }

    .logs-list { display: flex; flex-direction: column; gap: 4px; }
    .log-row {
      display: flex; align-items: center; gap: 12px;
      background: var(--navy-800); border: 1px solid var(--navy-600);
      border-radius: 8px; padding: 10px 14px;
      transition: border-color .12s;
      &:hover { border-color: var(--navy-500); }
    }
    .log-icon-wrap {
      width: 34px; height: 34px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      background: rgba(59,125,232,.1); color: var(--accent);
      mat-icon { font-size: 16px; }
      &[data-action*='CRITICAL'],
      &[data-action='ADMIN_DEACTIVATED'] { background: rgba(232,93,59,.1); color: #f08060; }
      &[data-action*='ASSIGN']  { background: rgba(30,184,160,.1); color: var(--teal); }
      &[data-action*='STATUS']  { background: rgba(232,169,59,.1); color: var(--gold); }
    }
    .log-body   { flex: 1; min-width: 0; }
    .log-top    { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }
    .log-action { font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--navy-100); }
    .log-by     { font-size: 12px; color: var(--navy-400); strong { color: var(--navy-200); } }
    .log-role   { font-size: 10px; color: var(--navy-600); }
    .log-detail { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .log-entity    { font-family: var(--font-mono); font-size: 11px; color: var(--navy-500); }
    .log-entity-id { font-family: var(--font-mono); font-size: 11px; color: var(--navy-600); }
    .log-meta-kv {
      font-family: var(--font-mono); font-size: 11px;
      background: var(--navy-700); border-radius: 4px; padding: 1px 6px;
      .mk { color: var(--navy-500); }
      .mv { color: var(--teal); }
    }
    .log-time {
      font-family: var(--font-mono); font-size: 11px; color: var(--navy-600);
      flex-shrink: 0; white-space: nowrap;
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 60px; color: var(--navy-600);
      mat-icon { font-size: 40px; } p { font-size: 13px; }
    }

    .pagination {
      display: flex; justify-content: center; align-items: center;
      gap: 16px; margin-top: 20px;
    }
    .page-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--navy-800); border: 1px solid var(--navy-600);
      color: var(--navy-300); cursor: pointer; display: flex; align-items: center; justify-content: center;
      &:hover:not([disabled]) { border-color: var(--accent); color: var(--accent); }
      &:disabled { opacity: .4; cursor: default; }
    }
    .page-info { font-family: var(--font-mono); font-size: 13px; color: var(--navy-400); }
    .mono { font-family: var(--font-mono); }
  `],
})
export class AuditLogsComponent implements OnInit {
  logs    = signal<AuditLog[]>([]);
  loading = signal(true);
  page    = signal(1);
  pages   = signal(1);
  total   = signal(0);

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getAuditLogs({ page: this.page() }).subscribe({
      next: ({ logs, total, pages }) => {
        this.logs.set(logs);
        this.total.set(total);
        this.pages.set(pages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goPage(p: number) { this.page.set(p); this.load(); }

  actionIcon(action: string): string { return ACTION_ICONS[action] ?? 'info_outline'; }
  formatAction(action: string): string { return action.replace(/_/g, ' '); }
  objectKeys(obj: any): string[] { return obj ? Object.keys(obj) : []; }
}
