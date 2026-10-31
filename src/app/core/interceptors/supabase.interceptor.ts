import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';

/**
 * Interceptor HTTP funcional (`HttpInterceptorFn`).
 *
 * A todas las peticiones dirigidas a la API REST de Supabase les añade:
 *  - `apikey`: la clave pública del proyecto,
 *  - `Authorization: Bearer <JWT>`: el token de la sesión actual (así la RLS
 *    de PostgreSQL sabe qué usuario y qué rol hace la consulta).
 *
 * Gestión centralizada de errores de sesión:
 *  - 401 Unauthorized (token caducado): intenta renovar la sesión UNA vez con el
 *    refresh token y repite la petición. Si no se puede, cierra la sesión y manda
 *    a /login guardando la URL actual en `returnUrl`.
 *  - 403 Forbidden (sin permiso según la RLS): avisa al usuario y no cierra la sesión.
 */
export const supabaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.supabaseUrl)) {
    return next(req);
  }
  const supabase = inject(SupabaseService).client;
  const auth = inject(AuthService);
  const router = inject(Router);
  const notify = inject(NotifyService);

  /** Copia la petición con las cabeceras de autorización. */
  const conToken = (peticion: HttpRequest<unknown>, token: string) =>
    peticion.clone({ setHeaders: { apikey: environment.supabaseKey, Authorization: `Bearer ${token}` } });

  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data }) => next(conToken(req, data.session?.access_token ?? environment.supabaseKey))),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Flujo de refresh token: se renueva la sesión y se reintenta una sola vez
        return from(supabase.auth.refreshSession()).pipe(
          switchMap(({ data }) => {
            if (!data.session) throw error;
            return next(conToken(req, data.session.access_token));
          }),
          catchError((e: unknown) => {
            const volverA = router.url;
            void auth.logout().then(() =>
              router.navigate(['/login'], { queryParams: { returnUrl: volverA } })
            );
            void notify.error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
            return throwError(() => e);
          })
        );
      }
      if (error.status === 403) {
        void notify.error('No tienes permisos para realizar esta acción.');
      }
      return throwError(() => error);
    })
  );
};
