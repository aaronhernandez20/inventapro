import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';

/**
 * Interceptor HTTP funcional.
 * A todas las peticiones dirigidas a la API REST de Supabase les añade:
 *  - `apikey`: la clave pública del proyecto,
 *  - `Authorization: Bearer <JWT>`: el token de la sesión actual (así la RLS
 *    de PostgreSQL sabe qué usuario y qué rol hace la consulta).
 * Si la API responde 401 (sesión caducada), cierra la sesión y vuelve al login.
 */
export const supabaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.supabaseUrl)) {
    return next(req);
  }
  const supabase = inject(SupabaseService).client;
  const auth = inject(AuthService);
  const router = inject(Router);

  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data }) => {
      const token = data.session?.access_token ?? environment.supabaseKey;
      const autorizada = req.clone({
        setHeaders: {
          apikey: environment.supabaseKey,
          Authorization: `Bearer ${token}`,
        },
      });
      return next(autorizada);
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        void auth.logout().then(() => router.navigateByUrl('/login'));
      }
      return throwError(() => error);
    })
  );
};
