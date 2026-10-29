import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon,
  IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonSkeletonText
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  walletOutline, layersOutline, arrowDownCircleOutline, arrowUpCircleOutline, warningOutline,
  documentTextOutline, downloadOutline, alertCircleOutline, refreshOutline, trophyOutline
} from 'ionicons/icons';
import { DatosDashboard, InformesApiService } from '../../services/informes-api.service';
import { StorageService } from '../../services/storage.service';
import { ExportService, Informe } from '../../services/export.service';
import { NotifyService } from '../../services/notify.service';
import { Producto } from '../../models/models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';

/** Paleta de los gráficos (contraste suficiente sobre blanco). */
const PALETA = ['#4f46e5', '#0f766e', '#d97706', '#e11d48', '#7c3aed', '#0284c7', '#65a30d'];

/**
 * Cuadro de mando (solo Administrador).
 * - Datos consolidados de la API REST de Supabase (3 peticiones concurrentes con forkJoin).
 * - Filtros en tiempo real (periodo y categoría): todo se recalcula con signals `computed`.
 * - Gráficos de anillo, área y radar (sin gráficos de barras).
 * - Exportación del informe a PDF y CSV.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StatCardComponent, ChartComponent,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonSkeletonText
  ],
})
export class DashboardPage {
  private api = inject(InformesApiService);
  private storage = inject(StorageService);
  private exportar = inject(ExportService);
  private notify = inject(NotifyService);
  private destroyRef = inject(DestroyRef);

  readonly datos = signal<DatosDashboard | null>(null);
  readonly cargando = signal(true);
  readonly error = signal(false);

  // ---------- Filtros (en tiempo real) ----------
  readonly meses = signal<3 | 6 | 12>(6);
  readonly categoria = signal<number | null>(null);

  private readonly euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  private readonly euros2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  private readonly num = new Intl.NumberFormat('es-ES');

  readonly categorias = computed(() => this.datos()?.categorias ?? []);
  readonly nombreCategoria = computed(() => this.categorias().find((c) => c.id === this.categoria())?.nombre ?? 'Todas las categorías');

  /** Productos tras el filtro de categoría. */
  readonly productos = computed(() =>
    (this.datos()?.productos ?? []).filter((p) => this.categoria() === null || p.categoria_id === this.categoria())
  );

  /** Movimientos del periodo y de los productos filtrados. */
  readonly movimientos = computed(() => {
    const ids = new Set(this.productos().map((p) => p.id));
    const desde = this.inicioPeriodo();
    return (this.datos()?.movimientos ?? []).filter((m) => ids.has(m.producto_id) && new Date(m.created_at) >= desde);
  });

  // ---------- Indicadores ----------
  readonly valor = computed(() => this.productos().reduce((t, p) => t + p.precio * p.stock, 0));
  readonly unidades = computed(() => this.productos().reduce((t, p) => t + p.stock, 0));
  readonly entradas = computed(() => this.suma('entrada'));
  readonly salidas = computed(() => this.suma('salida'));
  readonly bajoMinimo = computed(() => this.productos().filter((p) => p.stock <= p.stock_minimo).length);
  readonly textoValor = computed(() => this.euros.format(this.valor()));
  readonly textoUnidades = computed(() => this.num.format(this.unidades()));

  // ---------- Gráfico 1: anillo (valor del inventario) ----------
  /** Sin filtro: valor por categoría. Con una categoría elegida: valor por producto de esa categoría. */
  readonly datosAnillo = computed<ChartData<'doughnut'>>(() => {
    const grupos = new Map<string, number>();
    for (const p of this.productos()) {
      const clave = this.categoria() === null ? p.categorias?.nombre ?? 'Sin categoría' : p.nombre;
      grupos.set(clave, (grupos.get(clave) ?? 0) + p.precio * p.stock);
    }
    const orden = [...grupos.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: orden.map(([k]) => k),
      datasets: [{ data: orden.map(([, v]) => Math.round(v)), backgroundColor: PALETA, borderColor: '#fff', borderWidth: 3, hoverOffset: 8 }],
    };
  });

  readonly opcionesAnillo: ChartOptions<'doughnut'> = {
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 } },
      tooltip: { callbacks: { label: (c) => ` ${c.label}: ${this.euros.format(Number(c.raw))}` } },
    },
  };

  // ---------- Gráfico 2: área (entradas vs salidas por mes) ----------
  readonly datosArea = computed<ChartData<'line'>>(() => {
    const meses = this.listaMeses();
    const entradas = meses.map(() => 0);
    const salidas = meses.map(() => 0);
    for (const m of this.movimientos()) {
      const d = new Date(m.created_at);
      const i = meses.findIndex((x) => x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth());
      if (i >= 0) (m.tipo === 'entrada' ? entradas : salidas)[i] += m.cantidad;
    }
    const fmt = new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' });
    return {
      labels: meses.map((d) => fmt.format(d)),
      datasets: [
        this.serieArea('Entradas', entradas, '#0f766e', '20, 184, 166'),
        this.serieArea('Salidas', salidas, '#4f46e5', '99, 102, 241'),
      ],
    };
  });

  readonly opcionesArea: ChartOptions<'line'> = {
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 } } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { precision: 0 } },
    },
  };

  // ---------- Gráfico 3: radar (stock actual vs mínimo) ----------
  readonly datosRadar = computed<ChartData<'radar'>>(() => {
    const grupos = new Map<string, { stock: number; minimo: number }>();
    const productos = this.categoria() === null ? this.productos() : this.productos().slice(0, 8);
    for (const p of productos) {
      const clave = this.categoria() === null ? p.categorias?.nombre ?? 'Sin categoría' : p.sku;
      const g = grupos.get(clave) ?? { stock: 0, minimo: 0 };
      g.stock += p.stock;
      g.minimo += p.stock_minimo;
      grupos.set(clave, g);
    }
    const etiquetas = [...grupos.keys()];
    return {
      labels: etiquetas,
      datasets: [
        {
          label: 'Stock actual',
          data: etiquetas.map((k) => grupos.get(k)!.stock),
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.18)',
          pointBackgroundColor: '#7c3aed',
          borderWidth: 2,
        },
        {
          label: 'Stock mínimo',
          data: etiquetas.map((k) => grupos.get(k)!.minimo),
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.12)',
          pointBackgroundColor: '#d97706',
          borderDash: [6, 4],
          borderWidth: 2,
        },
      ],
    };
  });

  readonly opcionesRadar: ChartOptions<'radar'> = {
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 } } },
    scales: { r: { beginAtZero: true, grid: { color: '#e2e8f0' }, angleLines: { color: '#e2e8f0' }, pointLabels: { font: { size: 12, weight: 600 } }, ticks: { display: false } } },
  };

  // ---------- Ranking: productos con más salidas ----------
  readonly topSalidas = computed(() => {
    const totales = new Map<number, number>();
    for (const m of this.movimientos()) {
      if (m.tipo === 'salida') totales.set(m.producto_id, (totales.get(m.producto_id) ?? 0) + m.cantidad);
    }
    const productos = new Map(this.productos().map((p) => [p.id, p]));
    const lista = [...totales.entries()]
      .map(([id, total]) => ({ producto: productos.get(id)!, total }))
      .filter((x) => x.producto)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const max = lista[0]?.total ?? 1;
    return lista.map((x) => ({ ...x, url: this.storage.urlPublica(x.producto.imagen_path), pct: Math.round((x.total / max) * 100) }));
  });

  constructor() {
    addIcons({
      walletOutline, layersOutline, arrowDownCircleOutline, arrowUpCircleOutline, warningOutline,
      documentTextOutline, downloadOutline, alertCircleOutline, refreshOutline, trophyOutline,
    });
    this.cargar();
  }

  /** Carga los datos (Observable con forkJoin). takeUntilDestroyed cancela la petición si salimos de la página. */
  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.api
      .cargarDashboard(12)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.datos.set(d);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set(true);
          this.cargando.set(false);
        },
      });
  }

  // ---------- Exportación ----------
  private informe(): Informe<Producto> {
    return {
      archivo: `inventapro-informe-${new Date().toISOString().slice(0, 10)}`,
      titulo: 'Informe de inventario',
      subtitulo: `${this.nombreCategoria()} · movimientos de los últimos ${this.meses()} meses`,
      indicadores: [
        { etiqueta: 'Valor del inventario', valor: this.euros2.format(this.valor()) },
        { etiqueta: 'Unidades', valor: this.num.format(this.unidades()) },
        { etiqueta: 'Entradas / Salidas', valor: `${this.num.format(this.entradas())} / ${this.num.format(this.salidas())}` },
        { etiqueta: 'Bajo mínimo', valor: String(this.bajoMinimo()) },
      ],
      columnas: [
        { titulo: 'SKU', valor: (p) => p.sku },
        { titulo: 'Producto', valor: (p) => p.nombre },
        { titulo: 'Categoría', valor: (p) => p.categorias?.nombre ?? '' },
        { titulo: 'Proveedor', valor: (p) => p.proveedores?.nombre ?? '' },
        { titulo: 'Precio', valor: (p) => this.euros2.format(p.precio), alinear: 'right' },
        { titulo: 'Stock', valor: (p) => p.stock, alinear: 'right' },
        { titulo: 'Mínimo', valor: (p) => p.stock_minimo, alinear: 'right' },
        { titulo: 'Valor', valor: (p) => this.euros2.format(p.precio * p.stock), alinear: 'right' },
        { titulo: 'Estado', valor: (p) => (p.stock <= p.stock_minimo ? 'Reponer' : 'OK') },
      ],
      filas: this.productos(),
    };
  }

  async exportarPdf(): Promise<void> {
    try {
      await this.exportar.pdf(this.informe());
      await this.notify.ok('Informe PDF descargado');
    } catch {
      await this.notify.error('No se pudo generar el PDF');
    }
  }

  exportarCsv(): void {
    this.exportar.csv(this.informe());
    void this.notify.ok('Informe CSV descargado');
  }

  // ---------- Utilidades ----------
  private suma(tipo: 'entrada' | 'salida'): number {
    return this.movimientos().filter((m) => m.tipo === tipo).reduce((t, m) => t + m.cantidad, 0);
  }

  private inicioPeriodo(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - this.meses() + 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private listaMeses(): Date[] {
    const inicio = this.inicioPeriodo();
    return Array.from({ length: this.meses() }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth() + i, 1));
  }

  /** Serie de un gráfico de área con relleno degradado. */
  private serieArea(label: string, data: number[], color: string, rgb: string) {
    return {
      label,
      data,
      borderColor: color,
      borderWidth: 2.5,
      pointBackgroundColor: '#fff',
      pointBorderColor: color,
      pointBorderWidth: 2,
      pointRadius: 4,
      tension: 0.4,
      fill: true,
      backgroundColor: (ctx: ScriptableContext<'line'>) => {
        const { chart } = ctx;
        const area = chart.chartArea;
        if (!area) return `rgba(${rgb}, 0.15)`;
        const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
        g.addColorStop(0, `rgba(${rgb}, 0.35)`);
        g.addColorStop(1, `rgba(${rgb}, 0.02)`);
        return g;
      },
    };
  }
}
