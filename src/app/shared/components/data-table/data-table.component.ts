import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { IonSearchbar, IonIcon, IonButton, IonSkeletonText } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  createOutline, trashOutline, swapVerticalOutline, arrowUpOutline, arrowDownOutline,
  chevronBackOutline, chevronForwardOutline, searchOutline, imageOutline
} from 'ionicons/icons';

/** Tonos disponibles para las etiquetas de estado. */
export type Tono = 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral';

/** Definición de una columna de la tabla. */
export interface Columna<T> {
  /** Propiedad del objeto que se muestra (y por la que se ordena). */
  key: keyof T & string;
  /** Texto de la cabecera. */
  label: string;
  /** Cómo se pinta el valor. Por defecto 'texto'. */
  tipo?: 'texto' | 'moneda' | 'numero' | 'fecha' | 'imagen' | 'estado';
  /** Segunda línea en gris debajo del valor (ej. el SKU bajo el nombre). */
  secundario?: (fila: T) => string;
  /** Para tipo 'estado': texto y color de la etiqueta. */
  estado?: (fila: T) => { texto: string; tono: Tono };
  /** Texto alternativo para tipo 'imagen'. */
  alt?: (fila: T) => string;
  /** `false` para desactivar la ordenación de esta columna. */
  ordenable?: boolean;
}

/**
 * Tabla de datos avanzada y REUTILIZABLE con buscador, ordenación y paginación.
 *
 * Es AGNÓSTICA de la vista que la contiene:
 *  - recibe los datos y la configuración por `input()` (filas, columnas, acciones...),
 *  - avisa al padre de lo que ocurre con `output()` (editar, eliminar, búsqueda).
 *
 * En pantallas pequeñas cada fila se muestra como una tarjeta (diseño responsive).
 */
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSearchbar, IonIcon, IonButton, IonSkeletonText],
})
export class DataTableComponent<T extends object> {
  // ---------- Entradas (Inputs) ----------
  /** Filas a mostrar. */
  readonly filas = input.required<T[]>();
  /** Configuración de las columnas. */
  readonly columnas = input.required<Columna<T>[]>();
  /** Título accesible de la tabla (lo leen los lectores de pantalla). */
  readonly titulo = input<string>('Tabla de datos');
  /** Texto del buscador. */
  readonly placeholder = input<string>('Buscar…');
  /** Muestra los botones Editar / Eliminar en cada fila. */
  readonly acciones = input<boolean>(false);
  /** Muestra filas "esqueleto" mientras se cargan los datos. */
  readonly cargando = input<boolean>(false);
  /** Filas por página. */
  readonly porPagina = input<number>(8);
  /** Propiedad que identifica cada fila de forma única. */
  readonly clave = input<keyof T & string>('id' as keyof T & string);
  /** Mensaje cuando no hay resultados. */
  readonly textoVacio = input<string>('No hay datos que mostrar.');

  // ---------- Salidas (Outputs) ----------
  /** Se pulsa "Editar" en una fila. */
  readonly editar = output<T>();
  /** Se pulsa "Eliminar" en una fila. */
  readonly eliminar = output<T>();
  /** Cambia el texto del buscador. */
  readonly busqueda = output<string>();

  // ---------- Estado interno ----------
  readonly termino = signal('');
  readonly orden = signal<{ key: keyof T & string; dir: 'asc' | 'desc' } | null>(null);
  readonly pagina = signal(1);

  private readonly moneda = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  private readonly numero = new Intl.NumberFormat('es-ES');
  private readonly fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

  /** Filas que coinciden con la búsqueda (en cualquier columna de texto). */
  readonly filtradas = computed(() => {
    const t = this.normalizar(this.termino());
    const filas = this.filas();
    if (!t) return filas;
    return filas.filter((f) =>
      this.columnas().some((c) => {
        const texto = `${String(f[c.key] ?? '')} ${c.secundario?.(f) ?? ''} ${c.estado?.(f).texto ?? ''}`;
        return this.normalizar(texto).includes(t);
      })
    );
  });

  /** Filas filtradas y ordenadas. */
  readonly ordenadas = computed(() => {
    const o = this.orden();
    const filas = [...this.filtradas()];
    if (!o) return filas;
    const signo = o.dir === 'asc' ? 1 : -1;
    return filas.sort((a, b) => {
      const va = a[o.key] as unknown;
      const vb = b[o.key] as unknown;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * signo;
      return String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true }) * signo;
    });
  });

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.ordenadas().length / this.porPagina())));

  /** Filas de la página actual. */
  readonly visibles = computed(() => {
    const inicio = (this.pagina() - 1) * this.porPagina();
    return this.ordenadas().slice(inicio, inicio + this.porPagina());
  });

  /** Array para pintar las filas esqueleto mientras carga. */
  readonly esqueletos = Array.from({ length: 5 }, (_, i) => i);

  constructor() {
    addIcons({
      createOutline, trashOutline, swapVerticalOutline, arrowUpOutline, arrowDownOutline,
      chevronBackOutline, chevronForwardOutline, searchOutline, imageOutline,
    });
    // Si cambian los datos o la búsqueda y la página actual ya no existe, vuelve a la última válida
    effect(() => {
      if (this.pagina() > this.totalPaginas()) this.pagina.set(this.totalPaginas());
    });
  }

  /** El usuario escribe en el buscador. */
  buscar(valor: string | null | undefined): void {
    this.termino.set(valor ?? '');
    this.pagina.set(1);
    this.busqueda.emit(this.termino());
  }

  /** Cambia el orden al pulsar una cabecera: ascendente → descendente → sin orden. */
  ordenar(c: Columna<T>): void {
    const o = this.orden();
    if (!o || o.key !== c.key) this.orden.set({ key: c.key, dir: 'asc' });
    else if (o.dir === 'asc') this.orden.set({ key: c.key, dir: 'desc' });
    else this.orden.set(null);
  }

  /** Valor de `aria-sort` de una cabecera (accesibilidad). */
  ariaSort(c: Columna<T>): 'ascending' | 'descending' | 'none' {
    const o = this.orden();
    return o?.key === c.key ? (o.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  }

  iconoOrden(c: Columna<T>): string {
    const o = this.orden();
    if (o?.key !== c.key) return 'swap-vertical-outline';
    return o.dir === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  ordenable(c: Columna<T>): boolean {
    return c.ordenable !== false && c.tipo !== 'imagen';
  }

  /** Texto formateado de una celda según el tipo de columna. */
  texto(fila: T, c: Columna<T>): string {
    const v = fila[c.key] as unknown;
    if (v === null || v === undefined || v === '') return '—';
    switch (c.tipo) {
      case 'moneda': return this.moneda.format(Number(v));
      case 'numero': return this.numero.format(Number(v));
      case 'fecha':  return this.fecha.format(new Date(String(v)));
      default:       return String(v);
    }
  }

  /** URL de una celda de tipo imagen. */
  imagen(fila: T, c: Columna<T>): string | null {
    const v = fila[c.key] as unknown;
    return typeof v === 'string' && v ? v : null;
  }

  idFila(fila: T): unknown {
    return fila[this.clave()];
  }

  irA(p: number): void {
    this.pagina.set(Math.min(Math.max(1, p), this.totalPaginas()));
  }

  private normalizar(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
}
