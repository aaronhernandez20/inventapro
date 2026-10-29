import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonTextarea,
  IonSelect, IonSelectOption, IonButton, IonSpinner, IonIcon, IonNote
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, syncOutline, saveOutline } from 'ionicons/icons';
import { ProductosService } from '../../services/productos.service';
import { StorageService } from '../../services/storage.service';
import { NotifyService } from '../../services/notify.service';
import { Categoria, Producto, Proveedor } from '../../models/models';
import { existeEnServidorValidator } from '../../shared/validators/validators';
import { ImagePickerComponent } from '../../shared/components/image-picker/image-picker.component';

/**
 * Alta y edición de productos (solo Administrador).
 * - Formulario reactivo con validación síncrona y ASÍNCRONA del SKU (no puede repetirse).
 * - Subida de la imagen a Supabase Storage.
 * Ruta: /productos/nuevo  y  /productos/:id/editar
 */
@Component({
  selector: 'app-producto-form',
  templateUrl: 'producto-form.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, ImagePickerComponent,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonInput, IonTextarea,
    IonSelect, IonSelectOption, IonButton, IonSpinner, IonIcon, IonNote
  ],
})
export class ProductoFormPage {
  private productosService = inject(ProductosService);
  private storage = inject(StorageService);
  private notify = inject(NotifyService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  /** Parámetro :id de la ruta (vacío al crear). Llega gracias a withComponentInputBinding(). */
  readonly id = input<string>();
  readonly esEdicion = computed(() => !!this.id());

  readonly categorias = signal<Categoria[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly original = signal<Producto | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  private nuevaImagen: File | null | undefined = undefined;

  readonly form = this.fb.group({
    sku: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.pattern(/^[A-Za-z]{3}-\d{3}$/)],
      asyncValidators: [
        existeEnServidorValidator(
          (v) => this.productosService.skuExiste(v),
          'skuEnUso',
          () => this.original()?.sku ?? null
        ),
      ],
    }),
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]),
    descripcion: this.fb.control<string | null>(null, Validators.maxLength(300)),
    categoria_id: this.fb.control<number | null>(null, Validators.required),
    proveedor_id: this.fb.control<number | null>(null, Validators.required),
    precio: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    stock: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    stock_minimo: this.fb.control<number | null>(5, [Validators.required, Validators.min(0)]),
  });

  /** Estado del formulario como señal (para refrescar la vista tras la validación asíncrona). */
  private readonly estado = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly estadoSku = computed(() => {
    this.estado();
    const c = this.form.controls.sku;
    if (c.pending) return 'comprobando';
    if (c.valid && c.dirty) return 'disponible';
    return null;
  });

  constructor() {
    addIcons({ checkmarkCircle, syncOutline, saveOutline });
    // Esperamos un tick para tener el input `id` ya asignado por el router
    queueMicrotask(() => this.cargar());
  }

  /** Carga desplegables y, si es edición, el producto (en paralelo con Promise.all). */
  private async cargar(): Promise<void> {
    try {
      const id = Number(this.id());
      const [categorias, proveedores, producto] = await Promise.all([
        this.productosService.getCategorias(),
        this.productosService.getProveedores(),
        this.id() ? this.productosService.getProducto(id) : Promise.resolve(null),
      ]);
      this.categorias.set(categorias);
      this.proveedores.set(proveedores);
      if (producto) {
        this.original.set(producto);
        this.form.patchValue(producto);
        this.form.controls.stock.disable(); // en edición el stock cambia con movimientos
      }
    } catch {
      await this.notify.error('No se pudieron cargar los datos del formulario');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Mensaje de error del SKU según el fallo. */
  errorSku(): string {
    this.estado();
    const c = this.form.controls.sku;
    if (c.hasError('required')) return 'El SKU es obligatorio';
    if (c.hasError('pattern')) return 'Formato: 3 letras, guion y 3 números (ej. INF-004)';
    if (c.hasError('skuEnUso')) return 'Ya existe un producto con este SKU';
    return '';
  }

  /** El componente de imagen avisa del archivo elegido. */
  imagenElegida(file: File | null): void {
    this.nuevaImagen = file;
  }

  /** Guarda el producto (subiendo antes la imagen nueva a Supabase Storage). */
  async guardar(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const original = this.original();
    try {
      let imagen_path = original?.imagen_path ?? null;
      if (this.nuevaImagen) {
        imagen_path = await this.storage.subirImagenProducto(this.nuevaImagen, v.sku);
      } else if (this.nuevaImagen === null) {
        imagen_path = null;
      }

      const datos = {
        sku: v.sku.trim().toUpperCase(),
        nombre: v.nombre.trim(),
        descripcion: v.descripcion?.trim() || null,
        categoria_id: v.categoria_id,
        proveedor_id: v.proveedor_id,
        precio: Number(v.precio),
        stock: Number(v.stock),
        stock_minimo: Number(v.stock_minimo),
        imagen_path,
      };

      if (original) {
        const { stock: _stock, ...cambios } = datos;
        await this.productosService.actualizar(original.id, cambios);
        if (imagen_path !== original.imagen_path) await this.storage.borrar(original.imagen_path);
        await this.notify.ok('Producto actualizado');
      } else {
        await this.productosService.crear(datos);
        await this.notify.ok('Producto creado');
      }
      await this.router.navigateByUrl('/productos', { replaceUrl: true });
    } catch (e: unknown) {
      await this.notify.error(e instanceof Error ? e.message : 'No se ha podido guardar el producto');
    } finally {
      this.guardando.set(false);
    }
  }
}
