import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterLink }      from '@angular/router';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService }      from '../../../core/services/api.service';
import { Report }          from '../../../core/models/report.model';

interface Stats {
  open: number;
  critical: number;
  resolvedMonth: number;
  avgResolveHours: number;
  bySeverity: { severity: string; _count: { id: number } }[];
}

@Component({
  selector:   'snt-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
<div class="dashboard-page">

  <!-- Page header -->
  <div class="page-header">
    <div>
      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">Real-time overview of all active reports and cases</p>
    </div>
    <div class="header-badges">
      <div class="secure-badge"><mat-icon>lock</mat-icon>No external data</div>
      <div class="secure-badge teal"><mat-icon>enhanced_encryption</mat-icon>Encrypted</div>
    </div>
  </div>

  @if (loading()) {
    <div class="loading-center"><mat-spinner diameter="36"></mat-spinner></div>
  } @else {

    <!-- Stat cards -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon warn"><mat-icon>folder_open</mat-icon></div>
        <div class="stat-body">
          <div class="stat-value warn">{{ stats()?.open ?? 0 }}</div>
          <div class="stat-label">Active cases</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon critical"><mat-icon>warning</mat-icon></div>
        <div class="stat-body">
          <div class="stat-value critical">{{ stats()?.critical ?? 0 }}</div>
          <div class="stat-label">Critical unresolved</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon success"><mat-icon>check_circle</mat-icon></div>
        <div class="stat-body">
          <div class="stat-value success">{{ stats()?.resolvedMonth ?? 0 }}</div>
          <div class="stat-label">Resolved this month</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon accent"><mat-icon>schedule</mat-icon></div>
        <div class="stat-body">
          <div class="stat-value accent">{{ stats()?.avgResolveHours ?? 0 }}h</div>
          <div class="stat-label">Avg. resolution time</div>
        </div>
      </div>
    </div>

    <!-- Severity breakdown + recent cases -->
    <div class="content-grid">

      <!-- Severity breakdown -->
      <div class="snt-card sev-breakdown">
        <div class="card-title">
          <mat-icon>bar_chart</mat-icon> Severity breakdown
        </div>
        <div class="sev-bars">
          @for (s of severityData(); track s.label) {
            <div class="sev-bar-row">
              <span class="sev-badge" [class]="'sev-badge sev-' + s.label">{{ s.label }}</span>
              <div class="bar-track">
                <div class="bar-fill" [style.width]="s.pct + '%'"
                     [attr.data-sev]="s.label"></div>
              </div>
              <span class="bar-count mono">{{ s.count }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Quick actions -->
      <div class="snt-card quick-actions">
        <div class="card-title"><mat-icon>bolt</mat-icon> Quick actions</div>
        <div class="action-list">
          <a class="action-item" routerLink="/admin/cases" [queryParams]="{status:'OPEN'}">
            <div class="action-icon warn"><mat-icon>folder_open</mat-icon></div>
            <div class="action-body">
              <div class="action-name">View open cases</div>
              <div class="action-sub">All reports pending review</div>
            </div>
            <mat-icon class="action-arrow">chevron_right</mat-icon>
          </a>
          <a class="action-item" routerLink="/admin/cases" [queryParams]="{severity:'CRITICAL'}">
            <div class="action-icon critical"><mat-icon>warning</mat-icon></div>
            <div class="action-body">
              <div class="action-name">Critical reports</div>
              <div class="action-sub">Requires immediate attention</div>
            </div>
            <mat-icon class="action-arrow">chevron_right</mat-icon>
          </a>
          <a class="action-item" routerLink="/admin/audit-logs">
            <div class="action-icon accent"><mat-icon>manage_search</mat-icon></div>
            <div class="action-body">
              <div class="action-name">Audit logs</div>
              <div class="action-sub">Full activity trail</div>
            </div>
            <mat-icon class="action-arrow">chevron_right</mat-icon>
          </a>
          <a class="action-item" routerLink="/admin/team">
            <div class="action-icon teal"><mat-icon>group</mat-icon></div>
            <div class="action-body">
              <div class="action-name">Manage team</div>
              <div class="action-sub">Add or deactivate admins</div>
            </div>
            <mat-icon class="action-arrow">chevron_right</mat-icon>
          </a>
        </div>
      </div>
    </div>

    <!-- Recent cases -->
    <div class="snt-card recent-cases">
      <div class="card-header">
        <div class="card-title"><mat-icon>history</mat-icon> Recent cases</div>
        <a routerLink="/admin/cases" class="view-all">View all</a>
      </div>

      @if (recentCases().length === 0) {
        <div class="empty-cases">
          <mat-icon>inbox</mat-icon>
          <span>No cases yet</span>
        </div>
      } @else {
        <div class="cases-table">
          <div class="table-head">
            <span>Case #</span><span>Channel</span><span>Severity</span>
            <span>Status</span><span>Submitted</span><span></span>
          </div>
          @for (c of recentCases(); track c.id) {
            <div class="table-row">
              <span class="case-num mono">{{ c.caseNumber }}</span>
              <span class="case-channel">{{ c.channel.displayName }}</span>
              <span><span class="sev-badge" [class]="'sev-badge sev-' + c.severity">{{ c.severity }}</span></span>
              <span><span class="status-badge" [class]="'status-badge status-' + c.status">{{ c.status | titlecase }}</span></span>
              <span class="case-date mono">{{ c.createdAt | date:'MMM d, HH:mm' }}</span>
              <span>
                <a [routerLink]="['/admin/cases', c.id]" class="view-btn">
                  <mat-icon>open_in_new</mat-icon>
                </a>
              </span>
            </div>
          }
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`
    .dashboard-page { height: 100%; overflow-y: auto; padding: 24px; }
    @media (max-width: 768px) { .dashboard-page { padding: 16px; } }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; gap: 12px; flex-wrap: wrap;
    }
    .page-title { font-size: 20px; font-weight: 500; margin: 0 0 4px; }
    .page-sub   { font-size: 13px; color: var(--navy-400); margin: 0; }
    .header-badges { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .secure-badge {
      display: flex; align-items: center; gap: 5px;
      background: rgba(59,125,232,.08); border: 1px solid rgba(59,125,232,.2);
      border-radius: 20px; padding: 4px 10px;
      font-size: 11px; color: var(--accent); font-family: var(--font-mono);
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
      &.teal { background: rgba(30,184,160,.07); border-color: rgba(30,184,160,.18); color: var(--teal); }
    }

    .loading-center { display: flex; justify-content: center; padding: 60px; }

    /* Stat grid */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px; margin-bottom: 20px;
      @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }
    .stat-card {
      background: var(--navy-800); border: 1px solid var(--navy-600);
      border-radius: 12px; padding: 16px;
      display: flex; align-items: center; gap: 14px;
    }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 20px; }
      &.warn     { background: rgba(232,169,59,.12); color: var(--gold); }
      &.critical { background: rgba(232,93,59,.12);  color: #f08060; }
      &.success  { background: rgba(46,204,113,.10); color: var(--success); }
      &.accent   { background: rgba(59,125,232,.12); color: var(--accent); }
    }
    .stat-value {
      font-size: 28px; font-weight: 500; font-family: var(--font-mono);
      line-height: 1;
      &.warn     { color: var(--gold); }
      &.critical { color: #f08060; }
      &.success  { color: var(--success); }
      &.accent   { color: var(--accent); }
    }
    .stat-label { font-size: 12px; color: var(--navy-400); margin-top: 4px; }

    /* Content grid */
    .content-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 16px; margin-bottom: 20px;
      @media (max-width: 768px) { grid-template-columns: 1fr; }
    }
    .card-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 500; color: var(--navy-200);
      margin-bottom: 16px;
      mat-icon { font-size: 16px; color: var(--navy-400); }
    }

    /* Severity bars */
    .sev-bars { display: flex; flex-direction: column; gap: 12px; }
    .sev-bar-row { display: flex; align-items: center; gap: 10px; }
    .bar-track {
      flex: 1; height: 6px; background: var(--navy-700); border-radius: 3px; overflow: hidden;
    }
    .bar-fill {
      height: 100%; border-radius: 3px; transition: width .5s ease;
      &[data-sev='CRITICAL'] { background: #f08060; }
      &[data-sev='HIGH']     { background: var(--gold); }
      &[data-sev='MEDIUM']   { background: var(--accent); }
      &[data-sev='INFO']     { background: var(--navy-500); }
    }
    .bar-count { font-family: var(--font-mono); font-size: 12px; color: var(--navy-400); min-width: 24px; text-align: right; }

    /* Quick actions */
    .action-list  { display: flex; flex-direction: column; gap: 4px; }
    .action-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 8px; border-radius: 8px;
      text-decoration: none; transition: background .12s; cursor: pointer;
      &:hover { background: var(--navy-700); }
    }
    .action-icon {
      width: 34px; height: 34px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 17px; }
      &.warn     { background: rgba(232,169,59,.12); color: var(--gold); }
      &.critical { background: rgba(232,93,59,.12);  color: #f08060; }
      &.accent   { background: rgba(59,125,232,.12); color: var(--accent); }
      &.teal     { background: rgba(30,184,160,.10); color: var(--teal); }
    }
    .action-body { flex: 1; }
    .action-name { font-size: 13px; font-weight: 500; color: var(--navy-100); }
    .action-sub  { font-size: 11px; color: var(--navy-500); margin-top: 1px; }
    .action-arrow{ color: var(--navy-600); font-size: 18px; }

    /* Recent cases table */
    .recent-cases { padding: 16px; }
    .card-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .view-all {
      font-size: 12px; color: var(--accent); text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    .empty-cases {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 24px; color: var(--navy-600);
      mat-icon { font-size: 32px; }
      span { font-size: 13px; }
    }
    .cases-table { overflow-x: auto; }
    .table-head {
      display: grid;
      grid-template-columns: 140px 1fr 100px 120px 130px 40px;
      padding: 6px 8px;
      font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
      color: var(--navy-500); font-weight: 500;
      border-bottom: 1px solid var(--navy-700);
      @media (max-width: 600px) { display: none; }
    }
    .table-row {
      display: grid;
      grid-template-columns: 140px 1fr 100px 120px 130px 40px;
      padding: 10px 8px; align-items: center;
      border-bottom: 1px solid var(--navy-700);
      transition: background .1s; font-size: 13px;
      &:hover { background: var(--navy-700); }
      &:last-child { border-bottom: none; }
      @media (max-width: 600px) {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto;
        gap: 4px;
      }
    }
    .case-num  { font-family: var(--font-mono); font-size: 12px; color: var(--navy-300); }
    .case-channel { color: var(--navy-200); }
    .case-date { font-family: var(--font-mono); font-size: 11px; color: var(--navy-500); }
    .view-btn  {
      color: var(--navy-500); cursor: pointer; text-decoration: none;
      display: flex; align-items: center;
      mat-icon { font-size: 16px; }
      &:hover { color: var(--accent); }
    }
    .mono { font-family: var(--font-mono); }
  `],
})
export class DashboardComponent implements OnInit {
  loading     = signal(true);
  stats       = signal<Stats | null>(null);
  recentCases = signal<Report[]>([]);

  severityData = computed(() => {
    const s = this.stats();
    if (!s) return [];
    const total = s.bySeverity.reduce((a, b) => a + b._count.id, 0) || 1;
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'];
    return order.map(sev => {
      const found = s.bySeverity.find(b => b.severity === sev);
      const count = found?._count?.id ?? 0;
      return { label: sev, count, pct: Math.round((count / total) * 100) };
    });
  });

  constructor(private api: ApiService) {}

  ngOnInit() {
    Promise.all([
      this.api.getDashboardStats().toPromise(),
      this.api.getReports({ page: 1 }).toPromise(),
    ]).then(([statsRes, casesRes]) => {
      this.stats.set(statsRes);
      this.recentCases.set(casesRes?.reports?.slice(0, 8) ?? []);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }
}
