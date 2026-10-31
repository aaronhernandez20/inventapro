import { Routes } from '@angular/router';
import { authGuard, adminGuard, invitadoGuard } from './guards/auth.guards';

/**
 * Rutas de la app. Todas usan carga diferida (lazy loading con loadComponent)
 * y están protegidas por guards según el rol:
 *  - canActivate + authGuard: pantallas de cualquier usuario con sesión.
 *  - canMatch + adminGuard: pantallas solo de Administrador.
 *  - canActivate + invitadoGuard: login y registro (solo sin sesión).
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
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
    path: 'productos/nuevo',
    canMatch: [adminGuard], // solo Administrador (canMatch: ni siquiera se descarga)
    loadComponent: () => import('./pages/producto-form/producto-form.page').then((m) => m.ProductoFormPage),
  },
  {
    path: 'productos/:id/editar',
    canMatch: [adminGuard], // solo Administrador (canMatch: ni siquiera se descarga)
    loadComponent: () => import('./pages/producto-form/producto-form.page').then((m) => m.ProductoFormPage),
  },
  {
    path: 'movimientos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/movimientos/movimientos.page').then((m) => m.MovimientosPage),
  },
  {
    path: 'usuarios',
    canMatch: [adminGuard], // solo Administrador (canMatch: ni siquiera se descarga)
    loadComponent: () => import('./pages/usuarios/usuarios.page').then((m) => m.UsuariosPage),
  },
  {
    path: 'dashboard',
    canMatch: [adminGuard], // solo Administrador (canMatch: ni siquiera se descarga)
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
