import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router }     from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReporterProfile { anonId: string; avatarSeed: string; }
export interface AdminProfile    { id: string; username: string; displayName: string; role: string; }
export type UserType = 'reporter' | 'admin' | null;

interface AuthResponse {
  accessToken:  string;
  refreshToken: string;
  profile:      ReporterProfile | AdminProfile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;

  // ─── Signals ──────────────────────────────────────────────────────────────
  readonly userType    = signal<UserType>(this.loadUserType());
  readonly profile     = signal<ReporterProfile | AdminProfile | null>(this.loadProfile());
  readonly isLoggedIn  = computed(() => !!this.userType());
  readonly isAdmin     = computed(() => this.userType() === 'admin');
  readonly isReporter  = computed(() => this.userType() === 'reporter');

  constructor(private http: HttpClient, private router: Router) {}

  // ─── Reporter ──────────────────────────────────────────────────────────────
  reporterSignup(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/reporter/signup`, { username, password })
      .pipe(tap(res => this.storeSession(res, 'reporter')));
  }

  reporterLogin(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/reporter/login`, { username, password })
      .pipe(tap(res => this.storeSession(res, 'reporter')));
  }

  // ─── Admin ────────────────────────────────────────────────────────────────
  adminLogin(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/admin/login`, { username, password })
      .pipe(tap(res => this.storeSession(res, 'admin')));
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────
  refreshAccessToken() {
    const refreshToken = localStorage.getItem('sentinel_refresh');
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http
      .post<{ accessToken: string; refreshToken: string }>(`${this.api}/auth/refresh`, { refreshToken })
      .pipe(
        tap(res => {
          localStorage.setItem('sentinel_token',   res.accessToken);
          localStorage.setItem('sentinel_refresh', res.refreshToken);
        }),
        catchError(err => {
          this.logout();
          return throwError(() => err);
        })
      );
  }

  // ─── Session helpers ──────────────────────────────────────────────────────
  private storeSession(res: AuthResponse, type: 'reporter' | 'admin') {
    localStorage.setItem('sentinel_token',    res.accessToken);
    localStorage.setItem('sentinel_refresh',  res.refreshToken);
    localStorage.setItem('sentinel_type',     type);
    localStorage.setItem('sentinel_profile',  JSON.stringify(res.profile));
    this.userType.set(type);
    this.profile.set(res.profile);
  }

  getToken(): string | null {
    return localStorage.getItem('sentinel_token');
  }

  logout() {
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_refresh');
    localStorage.removeItem('sentinel_type');
    localStorage.removeItem('sentinel_profile');
    this.userType.set(null);
    this.profile.set(null);
    this.router.navigate(['/auth/login']);
  }

  private loadUserType(): UserType {
    return (localStorage.getItem('sentinel_type') as UserType) ?? null;
  }

  private loadProfile(): ReporterProfile | AdminProfile | null {
    const raw = localStorage.getItem('sentinel_profile');
    return raw ? JSON.parse(raw) : null;
  }
}
