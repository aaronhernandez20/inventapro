import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

/** Bucket público de Supabase Storage con las imágenes de producto. */
export const BUCKET_PRODUCTOS = 'productos';

/**
 * Gestión de imágenes en Supabase Storage (subir, borrar y obtener la URL pública).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private sb = inject(SupabaseService).client;

  /** Devuelve la URL pública de un archivo del bucket (o `null` si no hay ruta). */
  urlPublica(path: string | null | undefined): string | null {
    if (!path) return null;
    return this.sb.storage.from(BUCKET_PRODUCTOS).getPublicUrl(path).data.publicUrl;
  }

  /**
   * Optimiza la imagen en el navegador (máx. 800 px, formato WebP) y la sube al bucket.
   * @returns la ruta del archivo dentro del bucket.
   */
  async subirImagenProducto(archivo: File, sku: string): Promise<string> {
    const blob = await this.optimizar(archivo);
    const extension = blob.type === 'image/webp' ? 'webp' : archivo.name.split('.').pop() ?? 'png';
    const nombre = `${sku.toUpperCase().replace(/[^A-Z0-9-]/g, '')}-${Date.now()}.${extension}`;
    const { error } = await this.sb.storage
      .from(BUCKET_PRODUCTOS)
      .upload(nombre, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
    if (error) throw error;
    return nombre;
  }

  /** Borra una imagen del bucket (si falla no interrumpe el flujo). */
  async borrar(path: string | null | undefined): Promise<void> {
    if (!path) return;
    await this.sb.storage.from(BUCKET_PRODUCTOS).remove([path]);
  }

  /** Redimensiona y convierte la imagen a WebP con un canvas. Si no se puede, devuelve el original. */
  private async optimizar(archivo: File, max = 800): Promise<Blob> {
    try {
      const bitmap = await createImageBitmap(archivo);
      const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.85));
      return blob ?? archivo;
    } catch {
      return archivo;
    }
  }
}
