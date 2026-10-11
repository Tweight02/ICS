
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token;

  // Always request JSON from Laravel.
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  // Attach the bearer token when available.
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const authReq = req.clone({
    setHeaders: headers
  });

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Do not clear the session automatically while debugging.
      // Preserve the token so we can inspect why Laravel rejected it.
      if (err.status === 401) {
        console.error('[AUTH] API returned 401 Unauthorized:', {
          url: req.url,
          hasToken: !!token,
          message: err.error?.message
        });

        // Redirect only when an authenticated session is no longer valid.
        // Do not redirect for the login request itself.
        if (!req.url.endsWith('/login') && !token) {
          router.navigate(['/login']);
        }
      }

      return throwError(() => err);
    })
  );
};
