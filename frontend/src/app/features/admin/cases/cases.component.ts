import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule }  from '@angular/material/chips';
import { ApiService }      from '../../../core/services/api.service';
import { Report, Severity, CaseStatus } from '../../../core/models/report.model';

@Component({
  selector:   'snt-cases',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatSelectModule,
    MatFormFieldModule, MatProgressSpinnerModule, MatChipsModule,
  ],
  template: `
<div class="cases-page">

  <div class="page-header">
    <div>
      <h1 class="page-title">Cases</h1>
      <p class="page-sub">{{ total() }} total reports · {{ activeCases() }} active</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters-bar">
    <div class="filter-chips">
      <button class="filter-chip" [class.active]="activeFilter() === 'ALL'"
              (click)="setFilter('ALL')">All</button>
      <button class="filter-chip warn" [class.active]="activeFilter() === 'OPEN'"
              (click)="setFilter('OPEN')">Open</button>
      <button class="filter-chip gold" [class.active]="activeFilter() === 'UNDER_REVIEW'"
              (click)="setFilter('UNDER_REVIEW')">Under review</button>
      <button class="filter-chip orange" [class.active]="activeFilter() === 'ESCALATED'"
              (click)="setFilter('ESCALATED')">Escalated</button>
      <button class="filter-chip success" [class.active]="activeFilter() === 'RESOLVED'"
              (click)="setFilter('RESOLVED')">Resolved</button>
    </div>

    <div class="filter-selects">
      <select class="snt-select" (change)="onSevChange($event)">
        <option value="">All severities</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="INFO">Info</option>
      </select>
    </div>
  </div>

  @if (loading()) {
    <div class="loading-center"><mat-spinner diameter="32"></mat-spinner></div>
  } @else if (cases().length === 0) {
    <div class="empty-state">
      <mat-icon>folder_open</mat-icon>
      <p>No cases match the current filters</p>
    </div>
  } @else {
    <div class="cases-list">
      @for (c of cases(); track c.id) {
        <a class="case-row" [routerLink]="['/admin/cases', c.id]">

          <!-- Severity indicator -->
          <div class="sev-indicator" [attr.data-sev]="c.severity"></div>

          <div class="case-main">
            <div class="case-top">
              <span class="case-num mono">{{ c.caseNumber }}</span>
              <span class="sev-badge" [class]="'sev-badge sev-' + c.severity">{{ c.severity }}</span>
              <span class="status-badge" [class]="'status-badge status-' + c.status">
                {{ formatStatus(c.status) }}
              </span>
            </div>
            <div class="case-channel">
              <mat-icon>folder</mat-icon>
              {{ c.channel.displayName }}
            </div>
            @if (c.assignments && c.assignments.length > 0) {
              <div class="case-assignee">
                <mat-icon>person</mat-icon>
                {{ c.assignments[0]!.admin.displayName }}
              </div>
            }
          </div>

          <div class="case-meta">
            <div class="case-msgs">
              <mat-icon>chat_bubble_outline</mat-icon>
              {{ c._count.messages }}
            </div>
            <div class="case-date mono">{{ c.createdAt | date:'MMM d, HH:mm' }}</div>
            <mat-icon class="case-arrow">chevron_right</mat-icon>
          </div>
        </a>
      }
    </div>

    <!-- Pagination -->
    @if (pages() > 1) {
      <div class="pagination">
        <button class="page-btn" [disabled]="page() <= 1"
                (click)="goPage(page() - 1)">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span class="page-info mono">{{ page() }} / {{ pages() }}</span>
        <button class="page-btn" [disabled]="page() >= pages()"
                (click)="goPage(page() + 1)">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    }
  }
</div>
  `,
  styles: [`
    .cases-page { height: 100%; overflow-y: auto; padding: 24px; }
    @media (max-width: 768px) { .cases-page { padding: 16px; } }

    .page-header { margin-bottom: 20px; }
    .page-title  { font-size: 20px; font-weight: 500; margin: 0 0 4px; }
    .page-sub    { font-size: 13px; color: var(--navy-400); margin: 0; }

    .filters-bar {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .filter-chip {
      padding: 5px 14px; border-radius: 20px;
      background: transparent; border: 1px solid var(--navy-600);
      color: var(--navy-400); font-size: 12px; font-family: var(--font-sans);
      cursor: pointer; transition: all .15s;
      &:hover { border-color: var(--navy-500); color: var(--navy-200); }
      &.active     { background: var(--navy-700); color: var(--navy-100); border-color: var(--navy-500); }
      &.warn.active { background: rgba(232,169,59,.12); color: var(--gold); border-color: rgba(232,169,59,.3); }
      &.gold.active { background: rgba(59,125,232,.10); color: var(--accent); border-color: rgba(59,125,232,.25); }
      &.orange.active { background: rgba(232,93,59,.10); color: #f08060; border-color: rgba(232,93,59,.25); }
      &.success.active { background: rgba(46,204,113,.08); color: var(--success); border-color: rgba(46,204,113,.2); }
    }
    .snt-select {
      height: 32px; padding: 0 10px;
      background: var(--navy-800); border: 1px solid var(--navy-600);
      border-radius: 8px; color: var(--navy-200);
      font-size: 12px; font-family: var(--font-sans); cursor: pointer;
      &:focus { outline: none; border-color: var(--navy-500); }
    }

    .loading-center { display: flex; justify-content: center; padding: 60px; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 60px; color: var(--navy-600);
      mat-icon { font-size: 40px; } p { font-size: 13px; }
    }

    .cases-list { display: flex; flex-direction: column; gap: 6px; }
    .case-row {
      display: flex; align-items: center; gap: 0;
      background: var(--navy-800); border: 1px solid var(--navy-600);
      border-radius: 10px; overflow: hidden;
      text-decoration: none; transition: all .15s; cursor: pointer;
      &:hover { border-color: var(--navy-500); background: var(--navy-700); }
    }
    .sev-indicator {
      width: 3px; height: 100%; min-height: 64px; flex-shrink: 0;
      &[data-sev='CRITICAL'] { background: #f08060; }
      &[data-sev='HIGH']     { background: var(--gold); }
      &[data-sev='MEDIUM']   { background: var(--accent); }
      &[data-sev='INFO']     { background: var(--navy-600); }
    }
    .case-main {
      flex: 1; padding: 12px 14px; min-width: 0;
    }
    .case-top {
      display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;
    }
    .case-num   { font-family: var(--font-mono); font-size: 13px; color: var(--navy-200); }
    .case-channel, .case-assignee {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; color: var(--navy-500);
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .case-assignee { color: var(--teal); margin-top: 3px; }

    .case-meta {
      display: flex; flex-direction: column; align-items: flex-end;
      gap: 6px; padding: 12px 14px; flex-shrink: 0;
    }
    .case-msgs {
      display: flex; align-items: center; gap: 3px;
      font-size: 11px; color: var(--navy-500); font-family: var(--font-mono);
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .case-date  { font-family: var(--font-mono); font-size: 11px; color: var(--navy-600); }
    .case-arrow { color: var(--navy-600); font-size: 18px; }

    .pagination {
      display: flex; justify-content: center; align-items: center;
      gap: 16px; margin-top: 20px; padding: 8px;
    }
    .page-btn {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--navy-800); border: 1px solid var(--navy-600);
      color: var(--navy-300); cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all .15s;
      &:hover:not([disabled]) { border-color: var(--accent); color: var(--accent); }
      &:disabled { opacity: .4; cursor: default; }
    }
    .page-info { font-family: var(--font-mono); font-size: 13px; color: var(--navy-400); }
    .mono { font-family: var(--font-mono); }
  `],
})
export class CasesComponent implements OnInit {
  cases        = signal<Report[]>([]);
  loading      = signal(true);
  total        = signal(0);
  page         = signal(1);
  pages        = signal(1);
  activeFilter = signal<string>('ALL');
  activeSev    = signal<string>('');
  activeCases  = signal(0);

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['status'])   this.activeFilter.set(params['status']);
      if (params['severity']) this.activeSev.set(params['severity']);
      this.load();
    });
  }

  setFilter(status: string) {
    this.activeFilter.set(status);
    this.page.set(1);
    this.load();
  }

  onSevChange(e: Event) {
    this.activeSev.set((e.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  load() {
    this.loading.set(true);
    const status   = this.activeFilter() !== 'ALL' ? this.activeFilter() as CaseStatus : undefined;
    const severity = this.activeSev() ? this.activeSev() as Severity : undefined;

    this.api.getReports({ status, severity, page: this.page() }).subscribe({
      next: ({ reports, total, pages }) => {
        this.cases.set(reports);
        this.total.set(total);
        this.pages.set(pages);
        this.activeCases.set(reports.filter((r: Report) =>
          ['OPEN', 'UNDER_REVIEW', 'ESCALATED'].includes(r.status)).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goPage(p: number) { this.page.set(p); this.load(); }

  formatStatus(s: string) {
    return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
}