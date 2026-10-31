import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ActividadService } from './actividad.service';
import { Movimiento, Producto } from '../models/models';

/**
 * Movimientos de stock (entradas y salidas) en Supabase.
 * Un trigger de la base de datos actualiza el stock del producto y
 * rechaza las salidas mayores que el stock disponible.
 */
@Injectable({ providedIn: 'root' })
export class MovimientosService {
  private sb = inject(SupabaseService).client;
  private actividad = inject(ActividadService);

  /** Historial de movimientos (más recientes primero) con producto y usuario. */
  async getMovimientos(limite = 200): Promise<Movimiento[]> {
    const { data, error } = await this.sb
      .from('movimientos')
      .select('*, productos(nombre, sku, imagen_path), perfiles(nombre, email)')
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data ?? []) as Movimiento[];
  }

  /**
   * Registra una entrada o salida. Además deja constancia en Firestore y,
   * si el producto queda por debajo de su stock mínimo, genera una alerta.
   */
  async registrar(producto: Producto, tipo: 'entrada' | 'salida', cantidad: number): Promise<void> {
    const { error } = await this.sb.from('movimientos').insert({ producto_id: producto.id, tipo, cantidad });
    if (error) {
      throw new Error(error.message.includes('Stock insuficiente') ? 'No hay stock suficiente para esta salida' : error.message);
    }
    const nuevoStock = tipo === 'entrada' ? producto.stock + cantidad : producto.stock - cantidad;
    await this.actividad.registrar({
      tipo: 'movimiento',
      nivel: 'info',
      mensaje: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${cantidad} uds de ${producto.nombre} (stock: ${nuevoStock})`,
    });
    if (nuevoStock <= producto.stock_minimo) {
      await this.actividad.registrar({
        tipo: 'alerta',
        nivel: 'aviso',
        mensaje: `Stock bajo: ${producto.nombre} tiene ${nuevoStock} uds (mínimo ${producto.stock_minimo})`,
      });
    }
  }
}
