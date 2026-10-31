import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Estrategia de precarga que respeta el control de acceso.
 *
 * `PreloadAllModules` descarga en segundo plano TODAS las pantallas diferidas,
 * también las de administración. Esta estrategia precarga solo las rutas sin
 * `canMatch`: las pantallas de Administrador se descargan únicamente cuando
 * `canMatch` las deja pasar, así un usuario estándar nunca recibe su código.
 */
@Injectable({ providedIn: 'root' })
export class PrecargaSegura implements PreloadingStrategy {
  preload(ruta: Route, cargar: () => Observable<unknown>): Observable<unknown> {
    return ruta.canMatch?.length ? of(null) : cargar();
  }
}
