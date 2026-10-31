import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/** Colores disponibles para la tarjeta. */
export type TonoStat = 'indigo' | 'teal' | 'amber' | 'rose' | 'violet';

/**
 * Widget estadístico REUTILIZABLE: icono + dato principal + detalle.
 *
 * - Recibe los datos por `input()` (etiqueta, valor, icono, tono, detalle).
 * - Si es `interactiva`, se pinta como botón y emite `seleccionar` al pulsarla
 *   (el padre decide qué hacer: navegar, filtrar, etc.).
 */
@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
  template: `
    @if (interactiva()) {
      <button type="button" class="stat" [class]="'stat stat--' + tono()" (click)="seleccionar.emit()">
        <span class="stat-icon" aria-hidden="true"><ion-icon [name]="icono()"></ion-icon></span>
        <span class="stat-body">
          <span class="stat-label">{{ etiqueta() }}</span>
          <span class="stat-value">{{ valor() }}</span>
          @if (detalle()) { <span class="stat-detail">{{ detalle() }}</span> }
        </span>
      </button>
    } @else {
      <div class="stat" [class]="'stat stat--' + tono()">
        <span class="stat-icon" aria-hidden="true"><ion-icon [name]="icono()"></ion-icon></span>
        <span class="stat-body">
          <span class="stat-label">{{ etiqueta() }}</span>
          <span class="stat-value">{{ valor() }}</span>
          @if (detalle()) { <span class="stat-detail">{{ detalle() }}</span> }
        </span>
      </div>
    }
  `,
})
export class StatCardComponent {
  /** Texto descriptivo (ej. "Productos"). */
  readonly etiqueta = input.required<string>();
  /** Dato principal ya formateado. */
  readonly valor = input.required<string | number>();
  /** Nombre del icono de Ionicons. */
  readonly icono = input<string>('cube-outline');
  /** Color de la tarjeta. */
  readonly tono = input<TonoStat>('indigo');
  /** Texto pequeño bajo el valor (opcional). */
  readonly detalle = input<string>('');
  /** Si es `true` la tarjeta es un botón y emite `seleccionar`. */
  readonly interactiva = input<boolean>(false);

  /** Se emite al pulsar la tarjeta (solo si es interactiva). */
  readonly seleccionar = output<void>();
}
