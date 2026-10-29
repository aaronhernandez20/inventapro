/**
 * Modelos de datos de InventaPro (capa "Model" de la arquitectura MVVM).
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
  /** Ruta de la imagen dentro del bucket `productos` de Supabase Storage. */
  imagen_path: string | null;
  descripcion: string | null;
  created_at?: string;
  categorias?: { nombre: string } | null;
  proveedores?: { nombre: string } | null;
  /** URL pública de la imagen (la calcula el servicio, no está en la tabla). */
  imagen_url?: string | null;
}

/** Datos que se envían al crear o editar un producto. */
export type ProductoGuardar = Pick<
  Producto,
  'sku' | 'nombre' | 'descripcion' | 'categoria_id' | 'proveedor_id' | 'precio' | 'stock' | 'stock_minimo' | 'imagen_path'
>;

/** Movimiento de stock (tabla `movimientos`). */
export interface Movimiento {
  id: number;
  producto_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  usuario_id: string | null;
  created_at: string;
  productos?: { nombre: string; sku: string; imagen_path: string | null } | null;
  perfiles?: { nombre: string | null; email: string } | null;
}

/** Perfil con fecha de alta (listado de usuarios para el administrador). */
export interface PerfilListado extends Perfil {
  created_at: string;
}

/**
 * Evento del registro de actividad (documento de la colección `actividad`
 * en Firebase Firestore, la base de datos NoSQL en tiempo real).
 */
export interface Actividad {
  id: string;
  tipo: 'producto' | 'movimiento' | 'alerta' | 'usuario';
  mensaje: string;
  usuario: string;
  nivel: 'info' | 'ok' | 'aviso';
  fecha: Date | null;
}
