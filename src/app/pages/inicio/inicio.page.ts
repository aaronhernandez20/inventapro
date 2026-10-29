import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSpinner, IonButton, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline, layersOutline, walletOutline, warningOutline, arrowForwardOutline,
  addCircleOutline, pieChartOutline, helpCircleOutline, checkmarkDoneOutline, swapHorizontalOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { ProductosService } from '../../services/productos.service';
import { Producto } from '../../models/models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ActivityFeedComponent } from '../../shared/components/activity-feed/activity-feed.component';
import { ActividadService } from '../../services/actividad.service';

/** Página de inicio: saludo, indicadores del inventario y productos que necesitan reposición. */
@Component({
  selector: 'app-inicio',
  templateUrl: 'inicio.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, StatCardComponent, ActivityFeedComponent,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSpinner, IonButton, IonIcon
  ],
})
export class InicioPage {
  protected auth = inject(AuthService);
  private productosService = inject(ProductosService);
  private router = inject(Router);
  protected actividad = inject(ActividadService);

  /** Últimos eventos en tiempo real (Firestore). */
  readonly eventos = toSignal(this.actividad.escuchar(6).pipe(catchError(() => of([]))), { initialValue: null });

  readonly cargando = signal(true);
  readonly productos = signal<Producto[]>([]);

  private readonly euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  private readonly num = new Intl.NumberFormat('es-ES');

  /** Indicadores calculados a partir de los productos (signals computadas). */
  readonly totalProductos = computed(() => this.productos().length);
  readonly unidades = computed(() => this.num.format(this.productos().reduce((t, p) => t + p.stock, 0)));
  readonly valorInventario = computed(() =>
    this.euros.format(this.productos().reduce((total, p) => total + p.precio * p.stock, 0))
  );
  readonly bajoMinimo = computed(() =>
    this.productos()
      .filter((p) => p.stock <= p.stock_minimo)
      .sort((a, b) => a.stock / Math.max(1, a.stock_minimo) - b.stock / Math.max(1, b.stock_minimo))
  );

  /** Saludo según la hora del día. */
  readonly saludo = (() => {
    const h = new Date().getHours();
    return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  })();
  readonly hoy = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  constructor() {
    addIcons({
      cubeOutline, layersOutline, walletOutline, warningOutline, arrowForwardOutline,
      addCircleOutline, pieChartOutline, helpCircleOutline, checkmarkDoneOutline, swapHorizontalOutline,
    });
    this.cargar();
  }

  /** Carga los productos de Supabase (asíncrono, con spinner). */
  private async cargar(): Promise<void> {
    try {
      this.productos.set(await this.productosService.getProductos());
    } finally {
      this.cargando.set(false);
    }
  }

  /** Porcentaje de stock respecto al mínimo (para la barra de progreso). */
  porcentaje(p: Producto): number {
    return Math.min(100, Math.round((p.stock / Math.max(1, p.stock_minimo)) * 100));
  }

  irA(url: string): void {
    this.router.navigateByUrl(url);
  }
}
