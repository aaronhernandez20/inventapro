import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ActividadService } from './actividad.service';
import { PerfilListado, Rol } from '../models/models';

/** Gestión de usuarios (solo Administrador: lo impone la política RLS de `perfiles`). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private sb = inject(SupabaseService).client;
  private actividad = inject(ActividadService);

  /** Lista de todos los perfiles. */
  async getUsuarios(): Promise<PerfilListado[]> {
    const { data, error } = await this.sb
      .from('perfiles')
      .select('id, email, nombre, rol, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as PerfilListado[];
  }

  /** Cambia el rol de un usuario. */
  async cambiarRol(usuario: PerfilListado, rol: Rol): Promise<void> {
    const { error } = await this.sb.from('perfiles').update({ rol }).eq('id', usuario.id);
    if (error) throw error;
    await this.actividad.registrar({
      tipo: 'usuario',
      nivel: 'info',
      mensaje: `${usuario.nombre ?? usuario.email} ahora es ${rol === 'admin' ? 'Administrador' : 'Usuario estándar'}`,
    });
  }
}
