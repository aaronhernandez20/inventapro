import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonIcon, IonSkeletonText } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline, swapHorizontalOutline, warningOutline, personAddOutline, pulseOutline, cloudOfflineOutline
} from 'ionicons/icons';
import { Actividad } from '../../../models/models';

/**
 * Lista de actividad reciente (componente REUTILIZABLE, solo presentación).
 * Recibe los eventos por `input()`; quien lo usa decide de dónde vienen
 * (aquí, de Firestore en tiempo real).
 */
@Component({
  selector: 'app-activity-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, IonSkeletonText],
  template: `
    @if (!disponible()) {
      <div class="empty-state">
        <ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon>
        <h3>Tiempo real no configurado</h3>
        <p>Añade la configuración de Firebase en <code>environment.ts</code>.</p>
      </div>
    } @else if (cargando()) {
      @for (i of [1, 2, 3]; track i) {
        <ion-skeleton-text [animated]="true" style="height: 44px; margin-bottom: 10px; border-radius: 10px"></ion-skeleton-text>
      }
    } @else if (eventos().length === 0) {
      <div class="empty-state">
        <ion-icon name="pulse-outline" aria-hidden="true"></ion-icon>
        <h3>Sin actividad todavía</h3>
        <p>Aquí aparecerán los movimientos y alertas al instante.</p>
      </div>
    } @else {
      <ol class="feed" aria-live="polite">
        @for (e of eventos(); track e.id) {
          <li class="feed-item" [class]="'feed-item feed-item--' + e.nivel">
            <span class="feed-icon" aria-hidden="true"><ion-icon [name]="icono(e)"></ion-icon></span>
            <div class="feed-body">
              <p class="feed-msg">{{ e.mensaje }}</p>
              <p class="feed-meta">{{ e.usuario }} · <time [attr.datetime]="e.fecha?.toISOString()">{{ hace(e.fecha) }}</time></p>
            </div>
          </li>
        }
      </ol>
    }
  `,
})
export class ActivityFeedComponent {
  /** Eventos a mostrar. */
  readonly eventos = input<Actividad[]>([]);
  /** Muestra el esqueleto de carga. */
  readonly cargando = input<boolean>(false);
  /** `false` si la fuente de datos (Firestore) no está configurada. */
  readonly disponible = input<boolean>(true);

  private readonly rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

  constructor() {
    addIcons({ cubeOutline, swapHorizontalOutline, warningOutline, personAddOutline, pulseOutline, cloudOfflineOutline });
  }

  icono(e: Actividad): string {
    return { producto: 'cube-outline', movimiento: 'swap-horizontal-outline', alerta: 'warning-outline', usuario: 'person-add-outline' }[e.tipo];
  }

  /** Tiempo relativo: "hace 5 minutos", "ayer"... */
  hace(fecha: Date | null): string {
    if (!fecha) return 'ahora';
    const seg = Math.round((fecha.getTime() - Date.now()) / 1000);
    const abs = Math.abs(seg);
    if (abs < 60) return 'hace un momento';
    if (abs < 3600) return this.rtf.format(Math.round(seg / 60), 'minute');
    if (abs < 86400) return this.rtf.format(Math.round(seg / 3600), 'hour');
    return this.rtf.format(Math.round(seg / 86400), 'day');
  }
}
