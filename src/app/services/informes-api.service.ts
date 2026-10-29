import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, Movimiento, Producto } from '../models/models';

/** Datos que necesita el cuadro de mando. */
export interface DatosDashboard {
  productos: Producto[];
  movimientos: Movimiento[];
  categorias: Categoria[];
}

/**
 * Consumo de la API REST (PostgREST) de Supabase con HttpClient y Observables de RxJS.
 * Es la fuente SQL "pura": peticiones HTTP GET a /rest/v1/<tabla>.
 * El interceptor `supabaseInterceptor` añade la clave y el token JWT a cada petición.
 */
@Injectable({ providedIn: 'root' })
export class InformesApiService {
  private http = inject(HttpClient);
  private readonly api = `${environment.supabaseUrl}/rest/v1`;

  productos$(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.api}/productos`, {
      params: { select: '*,categorias(nombre),proveedores(nombre)', order: 'nombre.asc' },
    });
  }

  /** Movimientos desde una fecha (para los gráficos de evolución). */
  movimientos$(desde: Date): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.api}/movimientos`, {
      params: {
        select: 'id,producto_id,tipo,cantidad,usuario_id,created_at,productos(nombre,sku,imagen_path)',
        created_at: `gte.${desde.toISOString()}`,
        order: 'created_at.asc',
      },
    });
  }

  categorias$(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.api}/categorias`, { params: { select: '*', order: 'nombre.asc' } });
  }

  /**
   * Lanza las TRES peticiones a la vez (concurrencia) con `forkJoin`
   * y emite cuando han terminado todas.
   */
  cargarDashboard(meses = 12): Observable<DatosDashboard> {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - meses + 1, 1);
    desde.setHours(0, 0, 0, 0);
    return forkJoin({
      productos: this.productos$(),
      movimientos: this.movimientos$(desde),
      categorias: this.categorias$(),
    }).pipe(map((d) => ({ ...d, productos: d.productos ?? [], movimientos: d.movimientos ?? [] })));
  }
}
