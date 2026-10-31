import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models/models';

/**
 * Guards funcionales de InventaPro (control de acceso por rol, RBAC).
 *
 * - `authGuard` (canActivate): exige sesión. Si no la hay, manda a /login y
 *   guarda la URL pedida en `?returnUrl=` para volver a ella tras el login.
 * - `rolGuard(...roles)` (canMatch): fábrica de guards por rol. Al ser canMatch,
 *   se evalúa ANTES de que la ruta coincida: si el rol no tiene permiso, la ruta
 *   "no existe" para ese usuario y su componente no llega a descargarse.
 * - `adminGuard`: atajo de `rolGuard('admin')`.
 * - `invitadoGuard` (canActivate): login y registro solo sin sesión.
 */

/** Redirección a /login conservando la URL que se quería visitar. */
function irAlLogin(router: Router, url: string): UrlTree {
  const conRetorno = url && url !== '/' && !url.startsWith('/login');
  return router.createUrlTree(['/login'], { queryParams: conRetorno ? { returnUrl: url } : {} });
}

/** Solo deja pasar a usuarios con sesión iniciada. */
export const authGuard: CanActivateFn = async (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready; // espera a recuperar la sesión guardada
  return auth.isLoggedIn() ? true : irAlLogin(router, estado?.url ?? '');
};

/**
 * Fábrica de guards por rol (canMatch).
 * Uso: `canMatch: [rolGuard('admin')]`. Admite varios roles: `rolGuard('admin', 'supervisor')`.
 */
export function rolGuard(...roles: Rol[]): CanMatchFn {
  return async (_ruta, segmentos) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.ready;
    if (!auth.isLoggedIn()) {
      return irAlLogin(router, '/' + (segmentos ?? []).map((s) => s.path).join('/'));
    }
    // Identidad verificada pero sin privilegio: a /inicio (no a /login)
    return auth.tieneRol(...roles) ? true : router.createUrlTree(['/inicio']);
  };
}

/** Solo Administradores. */
export const adminGuard: CanMatchFn = rolGuard('admin');

/** Para /login y /registro: si ya hay sesión, no tiene sentido verlos. */
export const invitadoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.isLoggedIn() ? router.createUrlTree(['/inicio']) : true;
};
