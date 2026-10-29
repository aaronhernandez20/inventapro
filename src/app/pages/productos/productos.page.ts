import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
  IonButton, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption,
  IonRefresher, IonRefresherContent
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, alertCircleOutline, refreshOutline, downloadOutline, documentTextOutline } from 'ionicons/icons';
import { ProductosService } from '../../services/productos.service';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';
import { ExportService, Informe } from '../../services/export.service';
import { Categoria, Producto } from '../../models/models';
import { Columna, DataTableComponent } from '../../shared/components/data-table/data-table.component';

/** Producto con los nombres de sus relaciones en texto plano. */
export type FilaProducto = Producto & { categoria: string; proveedor: string };

/** Inventario: listado de productos con buscador, filtros y (para admin) alta, edición y borrado. */
@Component({
  selector: 'app-productos',
  templateUrl: 'productos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DataTableComponent,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon,
    IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption, IonRefresher, IonRefresherContent
  ],
})
export class ProductosPage {
  private productosService = inject(ProductosService);
  private notify = inject(NotifyService);
  private alert = inject(AlertController);
  private router = inject(Router);
  protected auth = inject(AuthService);
  private exportar = inject(ExportService);

  readonly productos = signal<FilaProducto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  /** Filtros de la vista. */
  readonly vista = signal<'todos' | 'bajo'>('todos');
  readonly categoria = signal<number | null>(null);

  /** Productos tras aplicar los filtros (el buscador lo gestiona la tabla). */
  readonly filtrados = computed(() =>
    this.productos().filter(
      (p) =>
        (this.vista() === 'todos' || p.stock <= p.stock_minimo) &&
        (this.categoria() === null || p.categoria_id === this.categoria())
    )
  );

  readonly numBajo = computed(() => this.productos().filter((p) => p.stock <= p.stock_minimo).length);

  /** Columnas de la tabla reutilizable. */
  readonly columnas: Columna<FilaProducto>[] = [
    { key: 'imagen_url', label: 'Imagen', tipo: 'imagen', alt: (p) => p.nombre },
    { key: 'nombre', label: 'Producto', secundario: (p) => p.sku },
    { key: 'categoria', label: 'Categoría', secundario: (p) => p.proveedor },
    { key: 'precio', label: 'Precio', tipo: 'moneda' },
    {
      key: 'stock',
      label: 'Stock',
      tipo: 'estado',
      estado: (p) =>
        p.stock === 0
          ? { texto: 'Agotado', tono: 'danger' }
          : p.stock <= p.stock_minimo
            ? { texto: `${p.stock} · bajo mínimo`, tono: 'warning' }
            : { texto: `${p.stock} uds`, tono: 'success' },
    },
  ];

  constructor() {
    addIcons({ addOutline, alertCircleOutline, refreshOutline, downloadOutline, documentTextOutline });
    this.cargar();
  }

  /** Añade los nombres de categoría y proveedor como texto plano (para mostrar, buscar y ordenar). */
  private aFila(p: Producto): FilaProducto {
    return { ...p, categoria: p.categorias?.nombre ?? 'Sin categoría', proveedor: p.proveedores?.nombre ?? '' };
  }

  /** Carga productos y categorías a la vez (Promise.all) gestionando carga y errores. */
  async cargar(evento?: CustomEvent): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [productos, categorias] = await Promise.all([
        this.productosService.getProductos(),
        this.productosService.getCategorias(),
      ]);
      this.productos.set(productos.map((p) => this.aFila(p)));
      this.categorias.set(categorias);
    } catch {
      this.error.set('No se pudieron cargar los productos. Comprueba tu conexión.');
    } finally {
      this.cargando.set(false);
      (evento?.target as HTMLIonRefresherElement | undefined)?.complete();
    }
  }

  editar(p: Producto): void {
    this.router.navigate(['/productos', p.id, 'editar']);
  }

  /** Pide confirmación y elimina el producto. */
  async eliminar(p: Producto): Promise<void> {
    const alerta = await this.alert.create({
      header: 'Eliminar producto',
      message: `¿Seguro que quieres eliminar "${p.nombre}"? También se borrarán sus movimientos.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role !== 'destructive') return;
    try {
      await this.productosService.eliminar(p);
      this.productos.update((lista) => lista.filter((x) => x.id !== p.id));
      await this.notify.ok('Producto eliminado');
    } catch {
      await this.notify.error('No se ha podido eliminar el producto');
    }
  }

  /** Informe con los productos que se ven ahora (respeta los filtros). */
  private informe(): Informe<FilaProducto> {
    const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    const filas = this.filtrados();
    return {
      archivo: `inventapro-productos-${new Date().toISOString().slice(0, 10)}`,
      titulo: 'Listado de productos',
      subtitulo: `${filas.length} productos · ${this.vista() === 'bajo' ? 'solo stock bajo' : 'todos'}`,
      indicadores: [
        { etiqueta: 'Productos', valor: String(filas.length) },
        { etiqueta: 'Unidades', valor: String(filas.reduce((t, p) => t + p.stock, 0)) },
        { etiqueta: 'Valor', valor: euros.format(filas.reduce((t, p) => t + p.precio * p.stock, 0)) },
      ],
      columnas: [
        { titulo: 'SKU', valor: (p) => p.sku },
        { titulo: 'Producto', valor: (p) => p.nombre },
        { titulo: 'Categoría', valor: (p) => p.categoria },
        { titulo: 'Proveedor', valor: (p) => p.proveedor },
        { titulo: 'Precio', valor: (p) => euros.format(p.precio), alinear: 'right' },
        { titulo: 'Stock', valor: (p) => p.stock, alinear: 'right' },
        { titulo: 'Mínimo', valor: (p) => p.stock_minimo, alinear: 'right' },
      ],
      filas,
    };
  }

  exportarCsv(): void {
    this.exportar.csv(this.informe());
  }

  async exportarPdf(): Promise<void> {
    await this.exportar.pdf(this.informe());
  }
}
