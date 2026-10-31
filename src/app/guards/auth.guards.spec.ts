import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { adminGuard, authGuard } from './auth.guards';
import { AuthService } from '../services/auth.service';

/** AuthService falso para probar los guards sin Supabase. */
function authFalso(logueado: boolean, admin: boolean) {
  const rol = logueado ? (admin ? 'admin' : 'user') : null;
  return {
    ready: Promise.resolve(),
    isLoggedIn: signal(logueado),
    isAdmin: signal(admin),
    tieneRol: (...roles: string[]) => rol !== null && roles.includes(rol),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ejecutar(guard: (...a: any[]) => unknown, auth: ReturnType<typeof authFalso>, arg2: unknown = { url: '/' }) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  return TestBed.runInInjectionContext(() => guard({} as never, arg2 as never)) as Promise<boolean | UrlTree>;
}

describe('Guards de rutas', () => {
  it('authGuard manda a /login si no hay sesión', async () => {
    const r = await ejecutar(authGuard, authFalso(false, false));
    expect(TestBed.inject(Router).serializeUrl(r as UrlTree)).toBe('/login');
  });

  it('authGuard guarda la URL pedida en returnUrl', async () => {
    const r = await ejecutar(authGuard, authFalso(false, false), { url: '/movimientos' });
    expect(TestBed.inject(Router).serializeUrl(r as UrlTree)).toBe('/login?returnUrl=%2Fmovimientos');
  });

  it('adminGuard (canMatch) deja pasar al administrador', async () => {
    expect(await ejecutar(adminGuard, authFalso(true, true), [])).toBe(true);
  });

  it('adminGuard devuelve a /inicio a un usuario estándar', async () => {
    const r = await ejecutar(adminGuard, authFalso(true, false), []);
    expect(TestBed.inject(Router).serializeUrl(r as UrlTree)).toBe('/inicio');
  });
});
