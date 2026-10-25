import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Producto } from '../models/models';

/**
 * Acceso a los productos del inventario (fuente SQL: Supabase / PostgreSQL vía API REST).
 */
@Injectable({ providedIn: 'root' })
export class ProductosService {
  private sb = inject(SupabaseService).client;

  /** Devuelve todos los productos con el nombre de su categoría y proveedor. */
  async getProductos(): Promise<Producto[]> {
    const { data, error } = await this.sb
      .from('productos')
      .select('*, categorias(nombre), proveedores(nombre)')
      .order('nombre');
    if (error) throw error;
    return (data ?? []) as Producto[];
  }

  /**
   * Comprueba si ya existe un producto con ese SKU.
   * Se usará en la validación asíncrona del formulario de alta.
   */
  async skuExiste(sku: string): Promise<boolean> {
    const { count, error } = await this.sb
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('sku', sku.trim().toUpperCase());
    if (error) throw error;
    return (count ?? 0) > 0;
  }
}
