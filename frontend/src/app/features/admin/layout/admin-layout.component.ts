import { Component, signal, computed, HostListener } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule }from '@angular/material/tooltip';
import { AuthService, AdminProfile } from '../../../core/services/auth.service';
import { NotificationBellComponent } from '../../shared/notification-bell/notification-bell.component';

interface NavItem { label: string; icon: string; path: string; roles?: string[]; }

const NAV: NavItem[] = [
  { label: 'Dashboard',   icon: 'dashboard',         path: '/admin/dashboard' },
  { label: 'Cases',       icon: 'folder_open',       path: '/admin/cases'     },
  { label: 'Audit Logs',  icon: 'manage_search',     path: '/admin/audit-logs', roles: ['SUPER_ADMIN','LEGAL_ADMIN'] },
  { label: 'Team',        icon: 'group',             path: '/admin/team',       roles: ['SUPER_ADMIN'] },
];

@Component({
  selector:   'snt-admin-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatIconModule, MatButtonModule, MatTooltipModule,
    NotificationBellComponent,
  ],
  template: `
<div class="shell" [class.drawer-open]="drawerOpen()">
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
      <span>SENTINEL</span>
    </div>

    <!-- Admin identity -->
    <div class="admin-pill">
      <div class="admin-avatar">{{ adminInitials() }}</div>
      <div class="admin-info">
        <div class="admin-name">{{ displayName() }}</div>
        <div class="admin-role">{{ roleLabel() }}</div>
      </div>
    </div>

    <nav class="sidebar-nav">
      @for (item of visibleNav(); track item.path) {
        <a class="nav-item" [routerLink]="item.path" routerLinkActive="active"
           (click)="drawerOpen.set(false)">
          <mat-icon>{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>

    <div class="sidebar-footer">
      <button class="logout-btn" (click)="logout()">
        <mat-icon>logout</mat-icon>
        <span>Sign out</span>
      </button>
    </div>
  </aside>

  <!-- Main -->
  <div class="main-area">
    <header class="topbar">
      <button mat-icon-button class="menu-btn" (click)="drawerOpen.set(!drawerOpen())">
        <mat-icon>{{ drawerOpen() ? 'close' : 'menu' }}</mat-icon>
      </button>
      <div class="topbar-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V6l-8-4z"
                fill="rgba(59,125,232,.2)" stroke="#3b7de8" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
        <span>SENTINEL ADMIN</span>
      </div>
      <div class="topbar-right">
        <snt-notification-bell />
        <div class="admin-chip">
          <mat-icon>admin_panel_settings</mat-icon>
          {{ roleLabel() }}
        </div>
      </div>
    </header>

    <div class="page-content"><router-outlet /></div>
  </div>
</div>
  `,
  styles: [`
    .shell { display: flex; height: 100vh; overflow: hidden; background: var(--navy-900); }

    .sidebar {
      width: var(--sidebar-w); background: var(--navy-800);
      border-right: 1px solid var(--navy-600);
      display: flex; flex-direction: column; flex-shrink: 0;
      transition: transform .25s ease; z-index: 200;
    }
    .sidebar-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 16px 14px;
      border-bottom: 1px solid var(--navy-600);
      font-family: var(--font-mono); font-size: 13px; font-weight: 500;
      letter-spacing: .08em; color: var(--navy-50);
    }
    .admin-pill {
      margin: 12px 10px;
      background: rgba(59,125,232,.06);
      border: 1px solid rgba(59,125,232,.15);
      border-radius: 10px; padding: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .admin-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: rgba(59,125,232,.2); color: var(--accent);
      font-family: var(--font-mono); font-size: 12px; font-weight: 500;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .admin-name { font-size: 13px; font-weight: 500; color: var(--navy-100); }
    .admin-role { font-size: 10px; color: var(--navy-500); font-family: var(--font-mono); margin-top: 1px; }

    .sidebar-nav { flex: 1; padding: 10px 8px; overflow-y: auto; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 8px;
      color: var(--navy-300); text-decoration: none;
      font-size: 13px; font-weight: 500; transition: all .15s; margin-bottom: 2px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
      &:hover  { background: var(--navy-700); color: var(--navy-100); }
      &.active { background: rgba(59,125,232,.12); color: var(--accent); }
    }
    .sidebar-footer { padding: 12px 8px; border-top: 1px solid var(--navy-600); }
    .logout-btn {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 8px;
      background: transparent; border: none; cursor: pointer;
      color: var(--navy-400); font-family: var(--font-sans); font-size: 13px;
      transition: all .15s;
      mat-icon { font-size: 18px; }
      &:hover { background: rgba(232,93,59,.08); color: #f08060; }
    }

    .main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .topbar {
      height: var(--header-h);
      background: var(--navy-800); border-bottom: 1px solid var(--navy-600);
      display: flex; align-items: center; padding: 0 16px; gap: 12px; flex-shrink: 0;
    }
    .menu-btn { display: none; }
    .topbar-brand {
      display: none; align-items: center; gap: 8px;
      font-family: var(--font-mono); font-size: 13px; font-weight: 500;
      letter-spacing: .06em; flex: 1;
    }
    .topbar-right { display: flex; align-items: center; gap: 10px; margin-left: auto; }
    .admin-chip {
      display: flex; align-items: center; gap: 5px;
      background: rgba(59,125,232,.08); border: 1px solid rgba(59,125,232,.2);
      border-radius: 20px; padding: 3px 10px;
      font-family: var(--font-mono); font-size: 11px; color: var(--accent);
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .page-content { flex: 1; overflow: hidden; }
    .drawer-overlay { display: none; }

    @media (max-width: 768px) {
      .sidebar { position: fixed; top: 0; left: 0; bottom: 0; transform: translateX(-100%); }
      .shell.drawer-open .sidebar { transform: translateX(0); }
      .drawer-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 199; }
      .shell.drawer-open .drawer-overlay { display: block; }
      .menu-btn { display: flex !important; }
      .topbar-brand { display: flex !important; }
      .admin-chip { display: none; }
    }
  `],
})
export class AdminLayoutComponent {
  drawerOpen = signal(false);

  displayName = computed(() => (this.auth.profile() as AdminProfile | null)?.displayName ?? 'Admin');
  adminInitials = computed(() =>
    this.displayName().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  );
  roleLabel = computed(() => {
    const r = (this.auth.profile() as AdminProfile | null)?.role ?? '';
    return r.replace(/_/g, ' ');
  });
  userRole = computed(() => (this.auth.profile() as AdminProfile | null)?.role ?? '');

  visibleNav = computed(() =>
    NAV.filter(n => !n.roles || n.roles.includes(this.userRole()))
  );

  constructor(private auth: AuthService) {}

  @HostListener('window:resize')
  onResize() { if (window.innerWidth > 768) this.drawerOpen.set(false); }

  logout() { this.auth.logout(); }
}
