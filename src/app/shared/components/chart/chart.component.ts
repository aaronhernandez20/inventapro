import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, effect, input, viewChild
} from '@angular/core';
import {
  ArcElement, CategoryScale, Chart, ChartData, ChartOptions, ChartType, DoughnutController, Filler, Legend,
  LineController, LineElement, LinearScale, PointElement, PolarAreaController, RadarController,
  RadialLinearScale, Tooltip
} from 'chart.js';

// Registramos SOLO los elementos de Chart.js que usamos (menos peso en el bundle).
// No se registran barras: el diseño usa gráficos de anillo, área y radar.
Chart.register(
  DoughnutController, ArcElement, LineController, LineElement, PointElement, Filler,
  RadarController, PolarAreaController, RadialLinearScale, CategoryScale, LinearScale, Tooltip, Legend
);
Chart.defaults.font.family = "'Inter Variable', Inter, system-ui, sans-serif";
Chart.defaults.color = '#475569';

/**
 * Envoltorio REUTILIZABLE de Chart.js para Angular.
 * - Recibe tipo, datos y opciones por `input()`.
 * - Cuando cambian los datos (por ejemplo al aplicar un filtro) actualiza el gráfico sin recrearlo.
 * - En `ngOnDestroy` destruye la instancia de Chart.js para no dejar fugas de memoria.
 */
@Component({
  selector: 'app-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-box" [style.height.px]="alto()">
      <canvas #canvas role="img" [attr.aria-label]="descripcion()"></canvas>
    </div>
  `,
})
export class ChartComponent implements OnDestroy {
  readonly tipo = input.required<ChartType>();
  readonly datos = input.required<ChartData>();
  readonly opciones = input<ChartOptions>({});
  /** Altura en píxeles. */
  readonly alto = input<number>(280);
  /** Descripción del gráfico para lectores de pantalla. */
  readonly descripcion = input<string>('Gráfico');

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  /** Copia de los datos (Chart.js modifica los objetos que recibe). */
  private copia(d: ChartData): ChartData {
    return { ...d, labels: [...(d.labels ?? [])], datasets: d.datasets.map((ds) => ({ ...ds, data: [...ds.data] })) } as ChartData;
  }

  constructor() {
    // Crear el gráfico cuando el <canvas> ya está en el DOM
    afterNextRender(() => {
      this.chart = new Chart(this.canvas().nativeElement, {
        type: this.tipo(),
        data: this.copia(this.datos()),
        options: { responsive: true, maintainAspectRatio: false, ...this.opciones() },
      });
    });

    // Reaccionar a los cambios de datos (signals): actualiza el gráfico con animación
    effect(() => {
      const datos = this.datos();
      const opciones = this.opciones();
      if (!this.chart) return;
      this.chart.data = this.copia(datos);
      this.chart.options = { responsive: true, maintainAspectRatio: false, ...opciones };
      this.chart.update();
    });
  }

  /** Ciclo de vida: liberar el gráfico al salir de la página. */
  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
