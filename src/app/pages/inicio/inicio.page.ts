import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonGrid, IonRow, IonCol,
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonSpinner, IonButton, IonBadge
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { ProductosService } from '../../services/productos.service';
import { Producto } from '../../models/models';

/** Página de bienvenida con un resumen rápido del inventario. */
@Component({
  selector: 'app-inicio',
  templateUrl: 'inicio.page.html',
  styleUrls: ['inicio.page.scss'],
  imports: [
    CurrencyPipe, RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
    IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle,
    IonSpinner, IonButton, IonBadge
  ],
})
export class InicioPage {
  protected auth = inject(AuthService);
  private productosService = inject(ProductosService);

  readonly cargando = signal(true);
  readonly productos = signal<Producto[]>([]);

  /** Datos resumidos calculados a partir de los productos. */
  readonly totalProductos = computed(() => this.productos().length);
  readonly stockBajo = computed(() => this.productos().filter((p) => p.stock <= p.stock_minimo).length);
  readonly valorInventario = computed(() =>
    this.productos().reduce((total, p) => total + p.precio * p.stock, 0)
  );

  constructor() {
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
}
