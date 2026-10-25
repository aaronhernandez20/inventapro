import { Routes } from '@angular/router';
import { authGuard, adminGuard, invitadoGuard } from './guards/auth.guards';

/**
 * Rutas de la app. Todas usan carga diferida (lazy loading con loadComponent)
 * y están protegidas por guards según el rol.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/inicio/inicio.page').then((m) => m.InicioPage),
  },
  {
    path: 'productos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/productos/productos.page').then((m) => m.ProductosPage),
  },
  {
    path: 'dashboard',
    canActivate: [adminGuard], // solo Administrador
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'ayuda',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/ayuda/ayuda.page').then((m) => m.AyudaPage),
  },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' },
];
