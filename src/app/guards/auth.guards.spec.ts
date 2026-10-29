import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { adminGuard, authGuard } from './auth.guards';
import { AuthService } from '../services/auth.service';

/** AuthService falso para probar los guards sin Supabase. */
function authFalso(logueado: boolean, admin: boolean) {
  return { ready: Promise.resolve(), isLoggedIn: signal(logueado), isAdmin: signal(admin) };
}

async function ejecutar(guard: typeof authGuard, auth: ReturnType<typeof authFalso>) {
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  return TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as Promise<boolean | UrlTree>;
}

describe('Guards de rutas', () => {
  it('authGuard manda a /login si no hay sesión', async () => {
    const r = await ejecutar(authGuard, authFalso(false, false));
    expect(TestBed.inject(Router).serializeUrl(r as UrlTree)).toBe('/login');
  });

  it('adminGuard deja pasar al administrador', async () => {
    expect(await ejecutar(adminGuard, authFalso(true, true))).toBe(true);
  });

  it('adminGuard devuelve a /inicio a un usuario estándar', async () => {
    const r = await ejecutar(adminGuard, authFalso(true, false));
    expect(TestBed.inject(Router).serializeUrl(r as UrlTree)).toBe('/inicio');
  });
});
