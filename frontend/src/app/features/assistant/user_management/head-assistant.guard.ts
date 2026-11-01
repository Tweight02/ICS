import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth-service';

export function canManageAssistantActions(role: string | null | undefined): boolean {
  const normalizedRole = (role ?? '').trim().toLowerCase().replace(/[_-]/g, ' ');

  return ['assistant', 'administrative assistant', 'head assistant'].includes(normalizedRole);
}

export const assistantActionsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return canManageAssistantActions(auth.getCurrentUser()?.role)
    ? true
    : router.createUrlTree(['/assistant/view-user']);
};
