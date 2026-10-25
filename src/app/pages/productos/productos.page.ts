import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonBadge, IonNote, IonSpinner, IonText
} from '@ionic/angular';
import { ProductosService } from '../../services/productos.service';
import { Producto } from '../../models/models';

/** Listado de productos del inventario (más adelante usará el componente tabla con buscador). */
@Component({
  selector: 'app-productos',
  templateUrl: 'productos.page.html',
  styleUrls: ['productos.page.scss'],
  imports: [
    CurrencyPipe, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList,
    IonItem, IonLabel, IonBadge, IonNote, IonSpinner, IonText
  ],
})
export class ProductosPage {
  private productosService = inject(ProductosService);

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  /** Carga los productos de forma asíncrona gestionando carga y errores. */
  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.productos.set(await this.productosService.getProductos());
    } catch {
      this.error.set('No se pudieron cargar los productos.');
    } finally {
      this.cargando.set(false);
    }
  }
}
