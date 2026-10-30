import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth-service';

export function isHeadAssistant(role: string | null | undefined): boolean {
  return (role ?? '').trim().toLowerCase().replace(/[_-]/g, ' ') === 'head assistant';
}

export const headAssistantGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return isHeadAssistant(auth.getCurrentUser()?.role)
    ? true
    : router.createUrlTree(['/assistant/view-user']);
};
