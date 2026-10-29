import { Injectable, inject } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore, Timestamp, addDoc, collection, getFirestore, limit, onSnapshot, orderBy, query, serverTimestamp
} from 'firebase/firestore';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Actividad } from '../models/models';
import { AuthService } from './auth.service';

/** Nombre de la colección de Firestore. */
const COLECCION = 'actividad';

/**
 * Registro de actividad y alertas en TIEMPO REAL con Firebase Firestore (NoSQL, documentos).
 *
 * - `registrar()` añade un documento a la colección `actividad`.
 * - `escuchar()` devuelve un Observable que emite cada vez que cambia la colección
 *   (onSnapshot): cualquier pantalla abierta se actualiza sola, sin recargar.
 *
 * Si Firebase no está configurado en `environment`, el servicio queda desactivado sin romper la app.
 */
@Injectable({ providedIn: 'root' })
export class ActividadService {
  private auth = inject(AuthService);
  private db: Firestore | null = null;

  /** `true` si Firestore está configurado y disponible. */
  readonly disponible: boolean;

  constructor() {
    const cfg = environment.firebase;
    if (cfg?.apiKey && cfg.projectId) {
      const app: FirebaseApp = initializeApp(cfg);
      this.db = getFirestore(app);
    }
    this.disponible = this.db !== null;
  }

  /** Añade un evento al registro (si falla, no interrumpe la acción del usuario). */
  async registrar(evento: Pick<Actividad, 'tipo' | 'mensaje' | 'nivel'>): Promise<void> {
    if (!this.db) return;
    try {
      await addDoc(collection(this.db, COLECCION), {
        ...evento,
        usuario: this.auth.nombreVisible() || 'Sistema',
        fecha: serverTimestamp(),
      });
    } catch (e) {
      console.warn('No se pudo registrar la actividad en Firestore', e);
    }
  }

  /**
   * Escucha en tiempo real los últimos eventos (más recientes primero).
   * Al cancelar la suscripción se deja de escuchar (sin fugas de memoria).
   */
  escuchar(maximo = 12): Observable<Actividad[]> {
    const db = this.db;
    if (!db) return of([]);
    return new Observable<Actividad[]>((suscriptor) => {
      const q = query(collection(db, COLECCION), orderBy('fecha', 'desc'), limit(maximo));
      const cancelar = onSnapshot(
        q,
        (snap) =>
          suscriptor.next(
            snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                tipo: data['tipo'],
                mensaje: data['mensaje'],
                usuario: data['usuario'],
                nivel: data['nivel'],
                fecha: data['fecha'] instanceof Timestamp ? data['fecha'].toDate() : null,
              } as Actividad;
            })
          ),
        (error) => suscriptor.error(error)
      );
      return () => cancelar();
    });
  }
}
