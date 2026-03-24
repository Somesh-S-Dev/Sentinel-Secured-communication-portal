import { Routes } from '@angular/router';
import { authGuard }        from './core/guards/auth.guard';
import { adminGuard }       from './core/guards/admin.guard';
import { guestGuard }       from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  // ─── Auth (guest only) ───────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // ─── Reporter shell ──────────────────────────────────────────────────────
  {
    path: 'reporter',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/reporter/reporter.routes').then(m => m.REPORTER_ROUTES),
  },

  // ─── Admin shell ─────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  { path: '**', redirectTo: 'auth/login' },
];
