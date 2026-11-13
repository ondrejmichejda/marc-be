import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const roleGuard: (allowedRoles: string[]) => CanActivateFn = (allowedRoles: string[]) => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoading()) {
      const role = authService.userRole();
      if (role && allowedRoles.includes(role)) {
        return true;
      }
      return router.createUrlTree(['/']);
    }

    return authService.checkAuth().pipe(
      map((res) => {
        const role = res.role || res.user?.role;
        if (role && allowedRoles.includes(role)) {
          return true;
        }
        return router.createUrlTree(['/']);
      })
    );
  };
};
