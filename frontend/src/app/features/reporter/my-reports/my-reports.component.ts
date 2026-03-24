import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink }     from '@angular/router';
import { MatIconModule }  from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService }     from '../../../core/services/api.service';
import { Report }         from '../../../core/models/report.model';

@Component({
  selector:   'snt-my-reports',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="my-reports-page">

  <div class="page-header">
    <h1 class="page-title">My Reports</h1>
    <p class="page-sub">All reports submitted under your anonymous identity</p>
  </div>

  <div class="anon-notice">
    <mat-icon>verified_user</mat-icon>
    <span>
      These reports are linked to your anonymous ID — not your real identity.
      Admins see only your Anon-ID and cannot determine who you are.
    </span>
  </div>

  @if (loading()) {
    <div class="loading-center"><mat-spinner diameter="32"></mat-spinner></div>
  } @else if (reports().length === 0) {
    <div class="empty-state">
      <mat-icon>assignment</mat-icon>
      <h2>No reports yet</h2>
      <p>Reports you submit in channels will appear here. You can track their status and communicate with admins.</p>
      <a class="start-btn" routerLink="/reporter/channels">
        <mat-icon>forum</mat-icon> Go to channels
      </a>
    </div>
  } @else {
    <div class="reports-list">
      @for (r of reports(); track r.id) {
        <a class="report-card" [routerLink]="['/reporter/channels', r.channel.slug]">
          <div class="sev-bar" [attr.data-sev]="r.severity"></div>

          <div class="card-body">
            <div class="card-top">
              <span class="case-num mono">{{ r.caseNumber }}</span>
              <span class="sev-badge" [class]="'sev-badge sev-' + r.severity">{{ r.severity }}</span>
              <span class="status-badge" [class]="'status-badge status-' + r.status">
                {{ formatStatus(r.status) }}
              </span>
            </div>

            <div class="card-meta-row">
              <div class="meta-item">
                <mat-icon>folder</mat-icon>
                {{ r.channel.displayName }}
              </div>
              <div class="meta-item">
                <mat-icon>chat_bubble_outline</mat-icon>
                {{ r._count.messages }} message{{ r._count.messages !== 1 ? 's' : '' }}
              </div>
              @if (r.assignments && r.assignments.length > 0) {
                <div class="meta-item assigned">
                  <mat-icon>person</mat-icon>
                  Under review by {{ r.assignments[0]!.admin.displayName }}
                </div>
              }
            </div>
          </div>

          <div class="card-right">
            <div class="card-date mono">{{ r.createdAt | date:'MMM d' }}</div>
            @if (r.status === 'RESOLVED') {
              <div class="resolved-icon"><mat-icon>check_circle</mat-icon></div>
            }
            <mat-icon class="card-arrow">chevron_right</mat-icon>
          </div>
        </a>
      }
    </div>
  }
</div>
  `,
  styles: [`
    .my-reports-page { height: 100%; overflow-y: auto; padding: 24px; }
    @media (max-width: 768px) { .my-reports-page { padding: 16px; } }

    .page-header { margin-bottom: 16px; }
    .page-title  { font-size: 20px; font-weight: 500; margin: 0 0 4px; }
    .page-sub    { font-size: 13px; color: var(--navy-400); margin: 0; }

    .anon-notice {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(30,184,160,.05); border: 1px solid rgba(30,184,160,.15);
      border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;
      font-size: 12px; color: var(--navy-300); line-height: 1.7;
      mat-icon { color: var(--teal); flex-shrink: 0; margin-top: 1px; }
    }

    .loading-center { display: flex; justify-content: center; padding: 60px; }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 60px 20px; text-align: center;
      color: var(--navy-400);
      mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--navy-600); }
      h2 { font-size: 16px; font-weight: 500; color: var(--navy-300); margin: 0; }
      p  { font-size: 13px; max-width: 340px; line-height: 1.7; margin: 0; }
    }
    .start-btn {
      display: flex; align-items: center; gap: 8px;
      background: rgba(59,125,232,.1); border: 1px solid rgba(59,125,232,.25);
      border-radius: 8px; padding: 9px 18px; text-decoration: none;
      color: var(--accent); font-size: 13px; font-weight: 500; margin-top: 4px;
      &:hover { background: rgba(59,125,232,.15); }
    }

    .reports-list { display: flex; flex-direction: column; gap: 8px; }
    .report-card {
      display: flex; align-items: stretch;
      background: var(--navy-800); border: 1px solid var(--navy-600);
      border-radius: 10px; overflow: hidden;
      text-decoration: none; transition: all .15s; cursor: pointer;
      &:hover { border-color: var(--navy-500); background: var(--navy-700); }
    }
    .sev-bar {
      width: 4px; flex-shrink: 0;
      &[data-sev='CRITICAL'] { background: #f08060; }
      &[data-sev='HIGH']     { background: var(--gold); }
      &[data-sev='MEDIUM']   { background: var(--accent); }
      &[data-sev='INFO']     { background: var(--navy-600); }
    }
    .card-body  { flex: 1; padding: 12px 14px; min-width: 0; }
    .card-top   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .case-num   { font-family: var(--font-mono); font-size: 13px; color: var(--navy-200); }
    .card-meta-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .meta-item {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: var(--navy-500);
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
      &.assigned { color: var(--teal); }
    }
    .card-right {
      display: flex; flex-direction: column; align-items: flex-end;
      justify-content: center; gap: 6px; padding: 12px 12px;
      flex-shrink: 0;
    }
    .card-date  { font-family: var(--font-mono); font-size: 11px; color: var(--navy-600); }
    .resolved-icon { color: var(--success); mat-icon { font-size: 18px; } }
    .card-arrow { color: var(--navy-600); font-size: 18px; }
    .mono { font-family: var(--font-mono); }
  `],
})
export class MyReportsComponent implements OnInit {
  reports = signal<Report[]>([]);
  loading = signal(true);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getMyReports().subscribe({
      next: ({ reports }) => { this.reports.set(reports); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatStatus(s: string) {
    return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
}