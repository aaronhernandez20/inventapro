import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';
import { Categoria, Producto, ProductoGuardar, Proveedor } from '../models/models';

/**
 * Acceso a los productos del inventario (fuente SQL: Supabase / PostgreSQL vía API REST).
 * Las operaciones de escritura solo funcionan para administradores (RLS en la base de datos).
 */
@Injectable({ providedIn: 'root' })
export class ProductosService {
  private sb = inject(SupabaseService).client;
  private storage = inject(StorageService);

  /** Añade la URL pública de la imagen a cada producto. */
  private conImagen = (p: Producto): Producto => ({ ...p, imagen_url: this.storage.urlPublica(p.imagen_path) });

  /** Devuelve todos los productos con el nombre de su categoría y proveedor. */
  async getProductos(): Promise<Producto[]> {
    const { data, error } = await this.sb
      .from('productos')
      .select('*, categorias(nombre), proveedores(nombre)')
      .order('nombre');
    if (error) throw error;
    return ((data ?? []) as Producto[]).map(this.conImagen);
  }

  /** Devuelve un producto por su id. */
  async getProducto(id: number): Promise<Producto> {
    const { data, error } = await this.sb
      .from('productos')
      .select('*, categorias(nombre), proveedores(nombre)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return this.conImagen(data as Producto);
  }

  /** Crea un producto nuevo. */
  async crear(producto: ProductoGuardar): Promise<Producto> {
    const { data, error } = await this.sb.from('productos').insert(producto).select().single();
    if (error) throw error;
    return data as Producto;
  }

  /** Actualiza un producto existente. */
  async actualizar(id: number, cambios: Partial<ProductoGuardar>): Promise<void> {
    const { error } = await this.sb.from('productos').update(cambios).eq('id', id);
    if (error) throw error;
  }

  /** Elimina un producto y su imagen del bucket. */
  async eliminar(producto: Producto): Promise<void> {
    const { error } = await this.sb.from('productos').delete().eq('id', producto.id);
    if (error) throw error;
    await this.storage.borrar(producto.imagen_path);
  }

  /** Comprueba si ya existe un producto con ese SKU (validación asíncrona del formulario). */
  async skuExiste(sku: string): Promise<boolean> {
    const { count, error } = await this.sb
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('sku', sku.trim().toUpperCase());
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  /** Lista de categorías para los desplegables y filtros. */
  async getCategorias(): Promise<Categoria[]> {
    const { data, error } = await this.sb.from('categorias').select('*').order('nombre');
    if (error) throw error;
    return (data ?? []) as Categoria[];
  }

  /** Lista de proveedores para el formulario. */
  async getProveedores(): Promise<Proveedor[]> {
    const { data, error } = await this.sb.from('proveedores').select('*').order('nombre');
    if (error) throw error;
    return (data ?? []) as Proveedor[];
  }
}
