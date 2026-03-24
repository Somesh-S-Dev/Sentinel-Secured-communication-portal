import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule }       from '@angular/material/icon';
import { MatButtonModule }     from '@angular/material/button';
import { MatBadgeModule }      from '@angular/material/badge';
import { MatTooltipModule }    from '@angular/material/tooltip';
import { MatMenuModule }       from '@angular/material/menu';
import { AuthService }         from '../../../core/services/auth.service';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';
import { ReporterProfile }     from '../../../core/services/auth.service';

@Component({
  selector:   'snt-reporter-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule, MatButtonModule, MatBadgeModule,
    MatTooltipModule, MatMenuModule,
    NotificationBellComponent,
  ],
  template: `
<div class="shell" [class.drawer-open]="drawerOpen()">

  <!-- Mobile overlay -->
  <div class="drawer-overlay" (click)="drawerOpen.set(false)"></div>

  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V6l-8-4z"
              fill="rgba(59,125,232,.2)" stroke="#3b7de8" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M9 12l2 2 4-4" stroke="#3b7de8" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="brand-text">SENTINEL</span>
    </div>

    <!-- Anon identity pill -->
    <div class="anon-pill">
      <div class="anon-avatar">{{ anonInitial() }}</div>
      <div class="anon-info">
        <div class="anon-id">{{ anonId() }}</div>
        <div class="anon-label">Your anonymous ID</div>
      </div>
      <mat-icon class="lock-icon">lock</mat-icon>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Channels</div>
      <a class="nav-item" routerLink="/reporter/channels" routerLinkActive="active"
         [routerLinkActiveOptions]="{ exact: true }" (click)="drawerOpen.set(false)">
        <mat-icon>forum</mat-icon>
        <span>All Channels</span>
      </a>

      <div class="nav-section-label" style="margin-top:16px">My Activity</div>
      <a class="nav-item" routerLink="/reporter/my-reports" routerLinkActive="active"
         (click)="drawerOpen.set(false)">
        <mat-icon>assignment</mat-icon>
        <span>My Reports</span>
      </a>
    </nav>

    <div class="sidebar-footer">
      <button class="logout-btn" (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span>Sign out</span>
      </button>
    </div>
  </aside>

  <!-- Main area -->
  <div class="main-area">
    <!-- Top bar -->
    <header class="topbar">
      <button class="menu-btn" (click)="drawerOpen.set(!drawerOpen())" mat-icon-button>
        <mat-icon>{{ drawerOpen() ? 'close' : 'menu' }}</mat-icon>
      </button>

      <div class="topbar-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V6l-8-4z"
                fill="rgba(59,125,232,.2)" stroke="#3b7de8" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="#3b7de8" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>SENTINEL</span>
      </div>

      <div class="topbar-actions">
        <snt-notification-bell />
        <div class="anon-chip">
          <mat-icon>lock</mat-icon>
          {{ anonId() }}
        </div>
      </div>
    </header>

    <!-- Page content -->
    <div class="page-content">
      <router-outlet />
    </div>
  </div>
</div>
  `,
  styles: [`
    .shell {
      display: flex; height: 100vh; overflow: hidden;
      background: var(--navy-900);
    }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-w);
      background: var(--navy-800);
      border-right: 1px solid var(--navy-600);
      display: flex; flex-direction: column;
      flex-shrink: 0;
      transition: transform .25s ease;
      z-index: 200;
    }
    .sidebar-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 16px 14px;
      border-bottom: 1px solid var(--navy-600);
      font-family: var(--font-mono);
      font-size: 13px; font-weight: 500; letter-spacing: .08em;
      color: var(--navy-50);
    }
    .anon-pill {
      margin: 12px 10px;
      background: rgba(59,125,232,.07);
      border: 1px solid rgba(59,125,232,.18);
      border-radius: 10px;
      padding: 10px 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .anon-avatar {
      width: 30px; height: 30px; border-radius: 8px;
      background: rgba(59,125,232,.2);
      color: var(--accent); font-family: var(--font-mono);
      font-size: 13px; font-weight: 500;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .anon-info { flex: 1; min-width: 0; }
    .anon-id   { font-family: var(--font-mono); font-size: 12px; color: var(--accent); font-weight: 500; }
    .anon-label{ font-size: 10px; color: var(--navy-400); }
    .lock-icon { font-size: 14px; color: var(--teal); flex-shrink: 0; }

    .sidebar-nav { flex: 1; padding: 8px 8px; overflow-y: auto; }
    .nav-section-label {
      font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
      color: var(--navy-500); padding: 6px 8px 4px; font-weight: 500;
    }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 8px;
      color: var(--navy-300); text-decoration: none;
      font-size: 13px; font-weight: 500;
      transition: all .15s;
      margin-bottom: 2px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
      &:hover  { background: var(--navy-700); color: var(--navy-100); }
      &.active { background: rgba(59,125,232,.12); color: var(--accent); }
    }

    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid var(--navy-600);
    }
    .logout-btn {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 8px;
      background: transparent; border: none; cursor: pointer;
      color: var(--navy-400); font-family: var(--font-sans);
      font-size: 13px; transition: all .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: rgba(232,93,59,.08); color: #f08060; }
    }

    /* Main area */
    .main-area {
      flex: 1; display: flex; flex-direction: column; min-width: 0;
    }
    .topbar {
      height: var(--header-h);
      background: var(--navy-800);
      border-bottom: 1px solid var(--navy-600);
      display: flex; align-items: center;
      padding: 0 16px; gap: 12px;
      flex-shrink: 0;
    }
    .menu-btn  { display: none; color: var(--navy-300); }
    .topbar-brand {
      display: none; align-items: center; gap: 8px;
      font-family: var(--font-mono); font-size: 13px; font-weight: 500; letter-spacing: .06em;
      flex: 1;
    }
    .topbar-actions {
      display: flex; align-items: center; gap: 10px; margin-left: auto;
    }
    .anon-chip {
      display: flex; align-items: center; gap: 5px;
      background: rgba(59,125,232,.08);
      border: 1px solid rgba(59,125,232,.2);
      border-radius: 20px; padding: 3px 10px;
      font-family: var(--font-mono); font-size: 11px; color: var(--accent);
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .page-content { flex: 1; overflow: hidden; }

    /* Mobile */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed; top: 0; left: 0; bottom: 0;
        transform: translateX(-100%);
      }
      .shell.drawer-open .sidebar { transform: translateX(0); }
      .drawer-overlay {
        display: none; position: fixed; inset: 0;
        background: rgba(0,0,0,.6); z-index: 199;
      }
      .shell.drawer-open .drawer-overlay { display: block; }
      .menu-btn      { display: flex !important; }
      .topbar-brand  { display: flex !important; }
      .anon-chip     { display: none; }
    }
  `],
})
export class ReporterLayoutComponent {
  drawerOpen = signal(false);

  anonId = computed(() => {
    const p = this.auth.profile() as ReporterProfile | null;
    return p?.anonId ?? 'Anon-????';
  });
  anonInitial = computed(() => this.anonId().replace('Anon-', 'A'));

  constructor(private auth: AuthService) {}

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.drawerOpen.set(false);
  }

  logout() { this.auth.logout(); }
}
