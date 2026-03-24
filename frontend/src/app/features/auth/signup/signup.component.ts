import { Component, signal } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { RouterLink, Router }  from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatIconModule }       from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService }         from '../../../core/services/auth.service';

function passwordMatch(ctrl: AbstractControl): ValidationErrors | null {
  const pw  = ctrl.get('password')?.value;
  const pw2 = ctrl.get('confirmPassword')?.value;
  return pw && pw2 && pw !== pw2 ? { mismatch: true } : null;
}

@Component({
  selector:   'snt-signup',
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
        <div class="brand-sub">Create anonymous account</div>
      </div>
    </div>

    <div class="privacy-notice">
      <mat-icon>shield</mat-icon>
      <div>
        <strong>Your username is not linked to your identity.</strong>
        Choose any username — no personal information is collected.
      </div>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
      <mat-form-field>
        <mat-label>Choose a username</mat-label>
        <input matInput formControlName="username"
               autocomplete="off" spellcheck="false"
               placeholder="e.g. shadow_hawk">
        <mat-icon matPrefix>person_outline</mat-icon>
        <mat-hint>3–30 chars · letters, numbers, _ and - only</mat-hint>
        @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
          <mat-error>Username is required</mat-error>
        }
        @if (form.get('username')?.hasError('pattern') && form.get('username')?.touched) {
          <mat-error>Only letters, numbers, _ and - allowed</mat-error>
        }
        @if (form.get('username')?.hasError('minlength') && form.get('username')?.touched) {
          <mat-error>Minimum 3 characters</mat-error>
        }
      </mat-form-field>

      <mat-form-field>
        <mat-label>Password</mat-label>
        <input matInput formControlName="password"
               [type]="showPwd() ? 'text' : 'password'"
               autocomplete="new-password">
        <mat-icon matPrefix>lock_outline</mat-icon>
        <button mat-icon-button matSuffix type="button"
                (click)="showPwd.set(!showPwd())">
          <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
        <mat-hint>Minimum 8 characters</mat-hint>
        @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
          <mat-error>Minimum 8 characters</mat-error>
        }
      </mat-form-field>

      <mat-form-field>
        <mat-label>Confirm password</mat-label>
        <input matInput formControlName="confirmPassword"
               [type]="showPwd() ? 'text' : 'password'"
               autocomplete="new-password">
        <mat-icon matPrefix>lock_outline</mat-icon>
        @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
          <mat-error>Passwords do not match</mat-error>
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
          <mat-icon>how_to_reg</mat-icon>
        }
        {{ loading() ? 'Creating account…' : 'Create account' }}
      </button>
    </form>

    <div class="auth-footer">
      Already have an account?
      <a routerLink="/auth/login" class="auth-link">Sign in</a>
    </div>
  </div>
</div>
  `,
  styles: [`
    .auth-shell {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      background: var(--navy-900);
      position: relative; overflow: hidden;
    }
    .auth-bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 60% 40% at 20% 30%, rgba(59,125,232,.08) 0%, transparent 70%),
        radial-gradient(ellipse 40% 30% at 80% 70%, rgba(30,184,160,.06) 0%, transparent 60%);
      pointer-events: none;
    }
    .auth-card {
      position: relative;
      width: 100%; max-width: 440px;
      background: var(--navy-800);
      border: 1px solid var(--navy-600);
      border-radius: 16px; padding: 32px;
      @media (max-width: 480px) { padding: 24px 20px; border-radius: 12px; }
    }
    .auth-brand {
      display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
    }
    .shield-wrap {
      width: 48px; height: 48px;
      background: rgba(59,125,232,.08);
      border: 1px solid rgba(59,125,232,.2);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .brand-name { font-family: var(--font-mono); font-size: 16px; font-weight: 500; letter-spacing: .08em; }
    .brand-sub  { font-size: 11px; color: var(--navy-400); margin-top: 2px; }
    .privacy-notice {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(30,184,160,.06);
      border: 1px solid rgba(30,184,160,.18);
      border-radius: 8px; padding: 12px;
      margin-bottom: 20px;
      font-size: 12px; color: var(--navy-200); line-height: 1.6;
      mat-icon { color: var(--teal); flex-shrink: 0; margin-top: 1px; font-size: 18px; }
      strong { color: var(--teal); font-weight: 500; display: block; margin-bottom: 2px; }
    }
    .auth-form { display: flex; flex-direction: column; gap: 16px; }
    .form-error {
      display: flex; align-items: center; gap: 6px;
      background: rgba(232,93,59,.08); border: 1px solid rgba(232,93,59,.25);
      border-radius: 8px; padding: 10px 12px; font-size: 13px; color: #f08060;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .submit-btn {
      height: 44px; font-size: 14px; font-weight: 500;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .auth-footer { margin-top: 20px; text-align: center; font-size: 13px; color: var(--navy-400); }
    .auth-link { color: var(--accent); text-decoration: none; font-weight: 500; &:hover { text-decoration: underline; } }
  `],
})
export class SignupComponent {
  loading = signal(false);
  showPwd = signal(false);
  errorMsg= signal('');

  form = this.fb.group({
    username:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30),
                          Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatch });

  constructor(
    private fb:     FormBuilder,
    private auth:   AuthService,
    private router: Router,
  ) {}

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');

    const { username, password } = this.form.value as { username: string; password: string };

    this.auth.reporterSignup(username, password).subscribe({
      next: () => this.router.navigate(['/reporter/channels']),
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.error ?? 'Signup failed. Please try again.');
      },
    });
  }
}
