import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }   from '@angular/common';
import { RouterLink }     from '@angular/router';
import { MatIconModule }  from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService }     from '../../../core/services/api.service';
import { Channel }        from '../../../core/models/report.model';

const CHANNEL_ICONS: Record<string, string> = {
  GENERAL:     'forum',
  HR:          'people',
  SAFETY:      'health_and_safety',
  POLICY:      'policy',
  IT_SECURITY: 'security',
  LEGAL:       'gavel',
};

@Component({
  selector:   'snt-channels',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="channels-page">
  <div class="page-header">
    <h1 class="page-title">Report channels</h1>
    <p class="page-sub">Select a channel to submit a confidential report. All messages are encrypted end-to-end.</p>
  </div>

  @if (loading()) {
    <div class="loading-state">
      <mat-spinner diameter="36"></mat-spinner>
    </div>
  } @else {
    <div class="channels-grid">
      @for (ch of channels(); track ch.id) {
        <a class="channel-card" [routerLink]="['/reporter/channels', ch.id]">
          <div class="ch-icon-wrap" [attr.data-type]="ch.type">
            <mat-icon>{{ icon(ch.type) }}</mat-icon>
          </div>
          <div class="ch-body">
            <div class="ch-name">{{ ch.displayName }}</div>
            <div class="ch-desc">{{ ch.description }}</div>
          </div>
          <div class="ch-meta">
            <div class="ch-stat">
              <mat-icon>chat_bubble_outline</mat-icon>
              {{ ch._count.messages }}
            </div>
            <mat-icon class="ch-arrow">chevron_right</mat-icon>
          </div>
        </a>
      }
    </div>

    <div class="anon-notice">
      <mat-icon>verified_user</mat-icon>
      <span>
        Your identity is never revealed. Reports are stored encrypted.
        No external notifications are sent — all communication stays within this system.
      </span>
    </div>
  }
</div>
  `,
  styles: [`
    .channels-page {
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      @media (max-width: 768px) { padding: 16px; }
    }
    .page-header { margin-bottom: 24px; }
    .page-title  { font-size: 20px; font-weight: 500; margin: 0 0 6px; color: var(--navy-50); }
    .page-sub    { font-size: 13px; color: var(--navy-400); margin: 0; line-height: 1.6; }

    .loading-state {
      display: flex; justify-content: center; padding: 60px 0;
    }

    .channels-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
      @media (max-width: 500px) { grid-template-columns: 1fr; }
    }

    .channel-card {
      display: flex; align-items: center; gap: 14px;
      background: var(--navy-800);
      border: 1px solid var(--navy-600);
      border-radius: 12px;
      padding: 16px;
      text-decoration: none;
      transition: all .15s;
      cursor: pointer;
      &:hover {
        border-color: var(--navy-500);
        background: var(--navy-700);
        transform: translateY(-1px);
      }
    }

    .ch-icon-wrap {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 20px; }

      &[data-type='GENERAL']     { background: rgba(59,125,232,.12);  color: #7baaf0; }
      &[data-type='HR']          { background: rgba(232,169,59,.10);  color: #e8b870; }
      &[data-type='SAFETY']      { background: rgba(232,93,59,.10);   color: #f08060; }
      &[data-type='POLICY']      { background: rgba(123,164,240,.10); color: #7baaf0; }
      &[data-type='IT_SECURITY'] { background: rgba(30,184,160,.10);  color: var(--teal); }
      &[data-type='LEGAL']       { background: rgba(90,116,153,.12);  color: var(--navy-300); }
    }

    .ch-body  { flex: 1; min-width: 0; }
    .ch-name  { font-size: 14px; font-weight: 500; color: var(--navy-50); margin-bottom: 3px; }
    .ch-desc  { font-size: 12px; color: var(--navy-400); line-height: 1.5;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .ch-meta  { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .ch-stat  {
      display: flex; align-items: center; gap: 3px;
      font-size: 11px; font-family: var(--font-mono);
      color: var(--navy-500);
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .ch-arrow { color: var(--navy-600); font-size: 20px; }

    .anon-notice {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(30,184,160,.05);
      border: 1px solid rgba(30,184,160,.15);
      border-radius: 10px; padding: 14px 16px;
      font-size: 12px; color: var(--navy-300); line-height: 1.7;
      mat-icon { color: var(--teal); flex-shrink: 0; margin-top: 1px; }
    }
  `],
})
export class ChannelsComponent implements OnInit {
  channels = signal<Channel[]>([]);
  loading  = signal(true);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getChannels().subscribe({
      next: ({ channels }) => { this.channels.set(channels); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  icon(type: string) { return CHANNEL_ICONS[type] ?? 'forum'; }
}
