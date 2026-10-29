import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSelect, IonSelectOption,
  IonSegment, IonSegmentButton, IonLabel, IonInput, IonButton, IonIcon, IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowDownCircleOutline, arrowUpCircleOutline, checkmarkOutline } from 'ionicons/icons';
import { MovimientosService } from '../../services/movimientos.service';
import { ProductosService } from '../../services/productos.service';
import { StorageService } from '../../services/storage.service';
import { ActividadService } from '../../services/actividad.service';
import { NotifyService } from '../../services/notify.service';
import { Movimiento, Producto } from '../../models/models';
import { Columna, DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { ActivityFeedComponent } from '../../shared/components/activity-feed/activity-feed.component';

/** Movimiento con los datos de producto y usuario en texto plano (para la tabla). */
export type FilaMovimiento = Movimiento & { producto: string; sku: string; imagen_url: string | null; usuario: string };

/**
 * Movimientos de stock: registrar entradas/salidas (cualquier usuario) y consultar el historial.
 * A la derecha se ve la actividad en TIEMPO REAL que llega de Firestore.
 */
@Component({
  selector: 'app-movimientos',
  templateUrl: 'movimientos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, DataTableComponent, ActivityFeedComponent,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSelect, IonSelectOption,
    IonSegment, IonSegmentButton, IonLabel, IonInput, IonButton, IonIcon, IonSpinner
  ],
})
export class MovimientosPage {
  private movimientosService = inject(MovimientosService);
  private productosService = inject(ProductosService);
  private storage = inject(StorageService);
  private notify = inject(NotifyService);
  private fb = inject(FormBuilder);
  protected actividad = inject(ActividadService);

  readonly movimientos = signal<FilaMovimiento[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);

  /** Actividad en tiempo real (Firestore). toSignal se desuscribe solo al salir de la página. */
  readonly eventos = toSignal(this.actividad.escuchar(8).pipe(catchError(() => of([]))), { initialValue: null });

  readonly form = this.fb.group(
    {
      producto_id: this.fb.control<number | null>(null, Validators.required),
      tipo: this.fb.nonNullable.control<'entrada' | 'salida'>('entrada'),
      cantidad: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(10000)]),
    },
    { validators: (g) => this.stockSuficiente(g) }
  );

  private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Producto elegido en el formulario. */
  readonly seleccionado = computed(() => this.productos().find((p) => p.id === this.valores().producto_id) ?? null);

  readonly columnas: Columna<FilaMovimiento>[] = [
    { key: 'imagen_url', label: 'Imagen', tipo: 'imagen', alt: (m) => m.producto },
    { key: 'producto', label: 'Producto', secundario: (m) => m.sku },
    {
      key: 'tipo',
      label: 'Tipo',
      tipo: 'estado',
      estado: (m) => (m.tipo === 'entrada' ? { texto: `Entrada +${m.cantidad}`, tono: 'success' } : { texto: `Salida −${m.cantidad}`, tono: 'info' }),
    },
    { key: 'created_at', label: 'Fecha', tipo: 'fecha' },
    { key: 'usuario', label: 'Usuario' },
  ];

  constructor() {
    addIcons({ arrowDownCircleOutline, arrowUpCircleOutline, checkmarkOutline });
    this.cargar();
  }

  /** Validador de grupo: una salida no puede superar el stock disponible. */
  private stockSuficiente(g: AbstractControl): ValidationErrors | null {
    const { producto_id, tipo, cantidad } = g.value as { producto_id: number | null; tipo: string; cantidad: number | null };
    const p = this.productos?.().find((x) => x.id === producto_id);
    return p && tipo === 'salida' && cantidad && cantidad > p.stock ? { sinStock: true } : null;
  }

  /** Carga productos e historial en paralelo. */
  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const [movs, productos] = await Promise.all([
        this.movimientosService.getMovimientos(),
        this.productosService.getProductos(),
      ]);
      this.productos.set(productos);
      this.movimientos.set(
        movs.map((m) => ({
          ...m,
          producto: m.productos?.nombre ?? 'Producto eliminado',
          sku: m.productos?.sku ?? '',
          imagen_url: this.storage.urlPublica(m.productos?.imagen_path),
          usuario: m.perfiles?.nombre ?? m.perfiles?.email ?? (m.usuario_id ? 'Otro usuario' : 'Sistema'),
        }))
      );
    } catch {
      await this.notify.error('No se pudieron cargar los movimientos');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Registra el movimiento. */
  async registrar(): Promise<void> {
    const producto = this.seleccionado();
    if (this.form.invalid || !producto) {
      this.form.markAllAsTouched();
      return;
    }
    const { tipo, cantidad } = this.form.getRawValue();
    this.guardando.set(true);
    try {
      await this.movimientosService.registrar(producto, tipo, Number(cantidad));
      await this.notify.ok(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada: ${cantidad} uds de ${producto.nombre}`);
      this.form.reset({ producto_id: null, tipo, cantidad: null });
      await this.cargar();
    } catch (e: unknown) {
      await this.notify.error(e instanceof Error ? e.message : 'No se pudo registrar el movimiento');
    } finally {
      this.guardando.set(false);
    }
  }
}
