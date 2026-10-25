/**
 * Modelos de datos de NexoStock (capa "Model" de la arquitectura MVVM).
 * Reflejan las tablas de Supabase.
 */

/** Rol de un usuario de la aplicación. */
export type Rol = 'admin' | 'user';

/** Perfil de usuario (tabla `perfiles`). */
export interface Perfil {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
}

/** Categoría de producto (tabla `categorias`). */
export interface Categoria {
  id: number;
  nombre: string;
}

/** Proveedor (tabla `proveedores`). */
export interface Proveedor {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
}

/** Producto del inventario (tabla `productos`) con los nombres de sus relaciones. */
export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  categoria_id: number | null;
  proveedor_id: number | null;
  precio: number;
  stock: number;
  stock_minimo: number;
  created_at?: string;
  categorias?: { nombre: string } | null;
  proveedores?: { nombre: string } | null;
}

/** Movimiento de stock (tabla `movimientos`). */
export interface Movimiento {
  id: number;
  producto_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  usuario_id: string | null;
  created_at: string;
}
