import { Component, signal } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterLink }          from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatIconModule }       from '@angular/material/icon';
import { MatSnackBar }         from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router }              from '@angular/router';
import { AuthService }         from '../../../core/services/auth.service';

@Component({
  selector:   'snt-login',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
<div class="auth-shell">
  <div class="auth-bg"></div>

  <div class="auth-card">

    <!-- Brand -->
    <div class="auth-brand">
      <div class="shield-wrap">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.35C16.6 22.15 20 17.25 20 12V6l-8-4z"
                fill="rgba(59,125,232,.2)" stroke="#3b7de8" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="#3b7de8" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">SENTINEL</div>
        <div class="brand-sub">Secure · Anonymous · Confidential</div>
      </div>
    </div>

    <!-- Tab selector -->
    <div class="mode-tabs">
      <button class="mode-tab" [class.active]="mode() === 'reporter'"
              (click)="mode.set('reporter')">
        <mat-icon>person</mat-icon> Reporter
      </button>
      <button class="mode-tab" [class.active]="mode() === 'admin'"
              (click)="mode.set('admin')">
        <mat-icon>admin_panel_settings</mat-icon> Admin
      </button>
    </div>

    <!-- Info banner (reporter) -->
    @if (mode() === 'reporter') {
      <div class="info-banner">
        <mat-icon>lock</mat-icon>
        <span>Your identity is never stored or linked to your reports.</span>
      </div>
    }

    <!-- Form -->
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
      <mat-form-field>
        <mat-label>Username</mat-label>
        <input matInput formControlName="username"
               autocomplete="username" spellcheck="false"
               placeholder="Enter your username">
        <mat-icon matPrefix>person_outline</mat-icon>
        @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
          <mat-error>Username is required</mat-error>
        }
      </mat-form-field>

      <mat-form-field>
        <mat-label>Password</mat-label>
        <input matInput formControlName="password"
               [type]="showPwd() ? 'text' : 'password'"
               autocomplete="current-password">
        <mat-icon matPrefix>lock_outline</mat-icon>
        <button mat-icon-button matSuffix type="button"
                (click)="showPwd.set(!showPwd())">
          <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
          <mat-error>Password is required</mat-error>
        }
      </mat-form-field>

      @if (errorMsg()) {
        <div class="form-error">
          <mat-icon>error_outline</mat-icon> {{ errorMsg() }}
        </div>
      }

      <button mat-raised-button color="primary" type="submit"
              class="submit-btn" [disabled]="loading() || form.invalid">
        @if (loading()) {
          <mat-spinner diameter="18"></mat-spinner>
        } @else {
          <mat-icon>login</mat-icon>
        }
        {{ loading() ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    @if (mode() === 'reporter') {
      <div class="auth-footer">
        No account?
        <a routerLink="/auth/signup" class="auth-link">Create anonymous account</a>
      </div>
    }
  </div>
</div>
  `,
  styles: [`
    .auth-shell {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: var(--navy-900);
      position: relative;
      overflow: hidden;
    }
    .auth-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 40% at 20% 30%, rgba(59,125,232,.08) 0%, transparent 70%),
        radial-gradient(ellipse 40% 30% at 80% 70%, rgba(30,184,160,.06) 0%, transparent 60%);
      pointer-events: none;
    }
    .auth-card {
      position: relative;
      width: 100%;
      max-width: 420px;
      background: var(--navy-800);
      border: 1px solid var(--navy-600);
      border-radius: 16px;
      padding: 32px;
      @media (max-width: 480px) { padding: 24px 20px; border-radius: 12px; }
    }
    .auth-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }
    .shield-wrap {
      width: 48px; height: 48px;
      background: rgba(59,125,232,.08);
      border: 1px solid rgba(59,125,232,.2);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .brand-name {
      font-family: var(--font-mono);
      font-size: 16px;
      font-weight: 500;
      letter-spacing: .08em;
      color: var(--navy-50);
    }
    .brand-sub {
      font-size: 11px;
      color: var(--navy-400);
      letter-spacing: .04em;
      margin-top: 2px;
    }
    .mode-tabs {
      display: flex;
      gap: 6px;
      background: var(--navy-900);
      border: 1px solid var(--navy-600);
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 20px;
    }
    .mode-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--navy-400);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all .15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &.active {
        background: var(--navy-700);
        color: var(--navy-50);
        box-shadow: 0 1px 3px rgba(0,0,0,.3);
      }
      &:hover:not(.active) { color: var(--navy-200); }
    }
    .info-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(30,184,160,.07);
      border: 1px solid rgba(30,184,160,.2);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 20px;
      font-size: 12px;
      color: var(--teal);
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-error {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(232,93,59,.08);
      border: 1px solid rgba(232,93,59,.25);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      color: #f08060;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .submit-btn {
      height: 44px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      mat-spinner { --mdc-circular-progress-active-indicator-color: #fff; }
    }
    .auth-footer {
      margin-top: 20px;
      text-align: center;
      font-size: 13px;
      color: var(--navy-400);
    }
    .auth-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
      &:hover { text-decoration: underline; }
    }
  `],
})
export class LoginComponent {
  mode    = signal<'reporter' | 'admin'>('reporter');
  loading = signal(false);
  showPwd = signal(false);
  errorMsg= signal('');

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private router: Router,
    private snack:  MatSnackBar,
  ) {}

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');

    const { username, password } = this.form.value as { username: string; password: string };
    const call = this.mode() === 'reporter'
      ? this.auth.reporterLogin(username, password)
      : this.auth.adminLogin(username, password);

    call.subscribe({
      next: () => {
        const dest = this.mode() === 'admin' ? '/admin/dashboard' : '/reporter/channels';
        this.router.navigate([dest]);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.error ?? 'Login failed. Please try again.';
        this.errorMsg.set(msg);
      },
    });
  }
}
