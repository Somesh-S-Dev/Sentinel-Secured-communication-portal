import { inject }  from '@angular/core';
import { Router }  from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const adminGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  return router.createUrlTree(['/reporter/channels']);
};

export const guestGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  return auth.isAdmin()
    ? router.createUrlTree(['/admin/dashboard'])
    : router.createUrlTree(['/reporter/channels']);
};
