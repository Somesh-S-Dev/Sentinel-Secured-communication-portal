import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject }       from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar }  from '@angular/material/snack-bar';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) {
        snackBar.open('Network error — check your connection', 'Dismiss', { panelClass: 'snack-error' });
      } else if (err.status >= 500) {
        snackBar.open('Server error — please try again', 'Dismiss', { panelClass: 'snack-error' });
      }
      return throwError(() => err);
    })
  );
};
