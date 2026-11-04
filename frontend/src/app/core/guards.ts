import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Must be logged in. Optional roles can be set in route data: { roles: ['owner'] } */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const roles = route.data?.['roles'] as Role[] | undefined;
  if (roles && !roles.includes(auth.role()!)) {
    return router.createUrlTree([auth.homeFor(auth.role())]);
  }
  return true;
};

/** Login/register pages: send logged-in users to their home */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).createUrlTree([auth.homeFor(auth.role())]) : true;
};
