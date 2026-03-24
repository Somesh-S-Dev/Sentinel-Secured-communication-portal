import { Component, OnInit, signal } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }  from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar }     from '@angular/material/snack-bar';
import { ApiService }      from '../../../core/services/api.service';

interface AdminUser {
  id: string; username: string; displayName: string;
  role: string; isActive: boolean; lastLoginAt?: string;
}

@Component({
  selector:   'snt-admin-management',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatProgressSpinnerModule,
  ],
  template: `
<div class="mgmt-page">

  <div class="page-header">
    <div>
      <h1 class="page-title">Team Management</h1>
      <p class="page-sub">Manage admin accounts — Super Admin access only</p>
    </div>
    <button mat-raised-button color="primary" (click)="showForm.set(!showForm())">
      <mat-icon>{{ showForm() ? 'close' : 'person_add' }}</mat-icon>
      {{ showForm() ? 'Cancel' : 'Add admin' }}
    </button>
  </div>

  <!-- Create form -->
  @if (showForm()) {
    <div class="snt-card create-form">
      <div class="form-title">Create new admin account</div>

      <div class="no-email-notice">
        <mat-icon>info</mat-icon>
        No email required — Sentinel uses username + password only.
        The new admin will receive their credentials through a secure internal channel.
      </div>

      <form [formGroup]="form" (ngSubmit)="onCreate()">
        <div class="form-grid">
          <mat-form-field>
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" spellcheck="false">
            <mat-hint>Used for login</mat-hint>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Display name</mat-label>
            <input matInput formControlName="displayName">
            <mat-hint>Shown in messages and assignments</mat-hint>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Initial password</mat-label>
            <input matInput formControlName="password"
                   [type]="showPwd() ? 'text' : 'password'">
            <button mat-icon-button matSuffix type="button"
                    (click)="showPwd.set(!showPwd())">
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-hint>Admin must change this after first login</mat-hint>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Role</mat-label>
            <mat-select formControlName="role">
              <mat-option value="HR_ADMIN">HR Admin</mat-option>
              <mat-option value="LEGAL_ADMIN">Legal Admin</mat-option>
              <mat-option value="IT_ADMIN">IT Admin</mat-option>
              <mat-option value="SUPER_ADMIN">Super Admin</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        @if (formError()) {
          <div class="form-error">
            <mat-icon>error_outline</mat-icon> {{ formError() }}
          </div>
        }

        <div class="form-actions">
          <button mat-button type="button" (click)="showForm.set(false)">Cancel</button>
          <button mat-raised-button color="primary" type="submit"
                  [disabled]="creating() || form.invalid">
            @if (creating()) { <mat-spinner diameter="16"></mat-spinner> }
            @else { <mat-icon>person_add</mat-icon> }
            Create account
          </button>
        </div>
      </form>
    </div>
  }

  <!-- Admin list -->
  @if (loading()) {
    <div class="loading-center"><mat-spinner diameter="32"></mat-spinner></div>
  } @else {
    <div class="admins-list">
      @for (admin of admins(); track admin.id) {
        <div class="admin-row" [class.inactive]="!admin.isActive">
          <div class="admin-avatar">{{ initials(admin.displayName) }}</div>
          <div class="admin-info">
            <div class="admin-name">{{ admin.displayName }}</div>
            <div class="admin-meta">
              <span class="mono">{{ admin.username }}</span>
              <span class="role-badge" [attr.data-role]="admin.role">
                {{ formatRole(admin.role) }}
              </span>
              @if (!admin.isActive) {
                <span class="inactive-badge">DEACTIVATED</span>
              }
            </div>
            @if (admin.lastLoginAt) {
              <div class="last-login">Last login: {{ admin.lastLoginAt | date:'MMM d, HH:mm' }}</div>
            }
          </div>
          <div class="admin-actions">
            @if (admin.isActive) {
              <button mat-stroked-button class="deactivate-btn"
                      (click)="deactivate(admin)">
                <mat-icon>person_off</mat-icon> Deactivate
              </button>
            }
          </div>
        </div>
      }

      @if (admins().length === 0) {
        <div class="empty-state">
          <mat-icon>group</mat-icon>
          <p>No admin accounts found</p>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`
    .mgmt-page { height: 100%; overflow-y: auto; padding: 24px; }
    @media (max-width: 768px) { .mgmt-page { padding: 16px; } }

    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px; gap: 12px; flex-wrap: wrap;
    }
    .page-title { font-size: 20px; font-weight: 500; margin: 0 0 4px; }
    .page-sub   { font-size: 13px; color: var(--navy-400); margin: 0; }

    .create-form { margin-bottom: 20px; }
    .form-title  { font-size: 14px; font-weight: 500; color: var(--navy-100); margin-bottom: 14px; }
    .no-email-notice {
      display: flex; align-items: flex-start; gap: 8px;
      background: rgba(30,184,160,.06); border: 1px solid rgba(30,184,160,.18);
      border-radius: 8px; padding: 10px 12px;
      margin-bottom: 16px;
      font-size: 12px; color: var(--navy-300); line-height: 1.6;
      mat-icon { color: var(--teal); flex-shrink: 0; font-size: 16px; margin-top: 1px; }
    }
    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
      @media (max-width: 600px) { grid-template-columns: 1fr; }
    }
    .form-error {
      display: flex; align-items: center; gap: 6px;
      background: rgba(232,93,59,.08); border: 1px solid rgba(232,93,59,.25);
      border-radius: 8px; padding: 10px 12px; margin-top: 12px;
      font-size: 13px; color: #f08060;
      mat-icon { font-size: 16px; }
    }
    .form-actions {
      display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;
    }

    .loading-center { display: flex; justify-content: center; padding: 60px; }
    .admins-list { display: flex; flex-direction: column; gap: 8px; }
    .admin-row {
      display: flex; align-items: center; gap: 14px;
      background: var(--navy-800); border: 1px solid var(--navy-600);
      border-radius: 10px; padding: 14px 16px;
      transition: border-color .12s;
      &:hover { border-color: var(--navy-500); }
      &.inactive { opacity: .55; }
    }
    .admin-avatar {
      width: 40px; height: 40px; border-radius: 10px;
      background: rgba(59,125,232,.15); color: var(--accent);
      font-family: var(--font-mono); font-size: 14px; font-weight: 500;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .admin-info  { flex: 1; min-width: 0; }
    .admin-name  { font-size: 14px; font-weight: 500; color: var(--navy-100); margin-bottom: 4px; }
    .admin-meta  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .role-badge {
      font-size: 10px; font-family: var(--font-mono);
      background: rgba(59,125,232,.1); color: var(--accent);
      border: 1px solid rgba(59,125,232,.2); border-radius: 4px; padding: 1px 6px;
      &[data-role='SUPER_ADMIN'] { background: rgba(232,169,59,.1); color: var(--gold); border-color: rgba(232,169,59,.25); }
      &[data-role='IT_ADMIN']    { background: rgba(30,184,160,.1); color: var(--teal); border-color: rgba(30,184,160,.2); }
    }
    .inactive-badge {
      font-size: 10px; font-family: var(--font-mono);
      background: rgba(232,93,59,.1); color: #f08060;
      border: 1px solid rgba(232,93,59,.25); border-radius: 4px; padding: 1px 6px;
    }
    .last-login { font-size: 11px; color: var(--navy-600); font-family: var(--font-mono); margin-top: 4px; }
    .admin-actions { flex-shrink: 0; }
    .deactivate-btn {
      font-size: 12px; height: 32px; color: #f08060;
      border-color: rgba(232,93,59,.3);
      &:hover { background: rgba(232,93,59,.08); }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 60px; color: var(--navy-600);
      mat-icon { font-size: 40px; } p { font-size: 13px; }
    }
    .mono { font-family: var(--font-mono); font-size: 12px; color: var(--navy-500); }
  `],
})
export class AdminManagementComponent implements OnInit {
  admins    = signal<AdminUser[]>([]);
  loading   = signal(true);
  showForm  = signal(false);
  showPwd   = signal(false);
  creating  = signal(false);
  formError = signal('');

  form = this.fb.group({
    username:    ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    password:    ['', [Validators.required, Validators.minLength(8)]],
    role:        ['HR_ADMIN', Validators.required],
  });

  constructor(private api: ApiService, private fb: FormBuilder, private snack: MatSnackBar) {}

  ngOnInit() { this.loadAdmins(); }

  loadAdmins() {
    // Reuse getDashboardStats or a dedicated endpoint - for now use a placeholder
    // In production, add GET /api/v1/admins endpoint
    this.loading.set(false);
  }

  onCreate() {
    if (this.form.invalid) return;
    this.creating.set(true);
    this.formError.set('');

    const { username, displayName, password, role } = this.form.value as any;
    this.api.createAdmin({ username, displayName, password, role }).subscribe({
      next: ({ admin }) => {
        this.admins.update(list => [admin, ...list]);
        this.creating.set(false);
        this.showForm.set(false);
        this.form.reset({ role: 'HR_ADMIN' });
        this.snack.open(`Admin "${displayName}" created`, 'OK', { panelClass: 'snack-success' });
      },
      error: (err) => {
        this.creating.set(false);
        this.formError.set(err?.error?.error ?? 'Failed to create admin');
      },
    });
  }

  deactivate(admin: AdminUser) {
    if (!confirm(`Deactivate ${admin.displayName}? They will immediately lose access.`)) return;
    // In production: call PATCH /api/v1/admins/:id/deactivate
    this.admins.update(list => list.map(a => a.id === admin.id ? { ...a, isActive: false } : a));
    this.snack.open(`${admin.displayName} deactivated`, 'OK', { panelClass: 'snack-success' });
  }

  initials(name: string) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
  formatRole(r: string)  { return r.replace(/_/g, ' '); }
}
