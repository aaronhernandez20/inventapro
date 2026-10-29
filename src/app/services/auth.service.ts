import { Injectable, computed, inject, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Perfil } from '../models/models';

/** Resultado del registro de una cuenta nueva. */
export interface ResultadoRegistro {
  /** `true` si Supabase ha abierto sesión directamente (confirmación de email desactivada). */
  sesionIniciada: boolean;
}

/**
 * Servicio de autenticación y roles.
 * Guarda el estado global de la sesión en señales (signals), de forma
 * predecible: solo este servicio puede modificarlo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private sb = inject(SupabaseService).client;

  private readonly _user = signal<User | null>(null);
  private readonly _perfil = signal<Perfil | null>(null);

  /** Usuario autenticado (solo lectura para el resto de la app). */
  readonly user = this._user.asReadonly();
  /** Perfil con el rol del usuario autenticado. */
  readonly perfil = this._perfil.asReadonly();
  /** `true` si hay sesión iniciada. */
  readonly isLoggedIn = computed(() => this._user() !== null);
  /** `true` si el usuario es Administrador. */
  readonly isAdmin = computed(() => this._perfil()?.rol === 'admin');
  /** Nombre a mostrar (nombre del perfil o, si no tiene, el email). */
  readonly nombreVisible = computed(() => this._perfil()?.nombre ?? this._user()?.email ?? '');
  /** Iniciales para el avatar (ej. "Aarón Hernández" -> "AH"). */
  readonly iniciales = computed(() =>
    this.nombreVisible()
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('')
  );

  /** Promesa que se resuelve cuando se ha recuperado la sesión guardada (la usan los guards). */
  readonly ready: Promise<void> = this.restaurarSesion();

  /** Recupera la sesión guardada en el navegador al abrir la app. */
  private async restaurarSesion(): Promise<void> {
    const { data } = await this.sb.auth.getSession();
    await this.establecerUsuario(data.session?.user ?? null);
  }

  /** Actualiza el usuario y carga su perfil (rol) desde la tabla `perfiles`. */
  private async establecerUsuario(user: User | null): Promise<void> {
    if (!user) {
      this._perfil.set(null);
      this._user.set(null);
      return;
    }
    const { data, error } = await this.sb
      .from('perfiles')
      .select('id, email, nombre, rol')
      .eq('id', user.id)
      .single();
    this._perfil.set(error ? null : (data as Perfil));
    this._user.set(user);
  }

  /**
   * Inicia sesión con email y contraseña.
   * @throws Error de Supabase si las credenciales no son válidas.
   */
  async login(email: string, password: string): Promise<void> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.establecerUsuario(data.user);
  }

  /**
   * Crea una cuenta nueva en Supabase Auth. Un trigger de la base de datos
   * crea su fila en `perfiles` con el nombre indicado y el rol 'user'.
   */
  async registrar(nombre: string, email: string, password: string): Promise<ResultadoRegistro> {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (error) throw error;
    if (data.session && data.user) {
      await this.establecerUsuario(data.user);
      return { sesionIniciada: true };
    }
    return { sesionIniciada: false };
  }

  /**
   * Consulta en la base de datos si ya existe una cuenta con ese email
   * (función SQL `email_registrado`). Se usa en la validación asíncrona.
   */
  async emailRegistrado(email: string): Promise<boolean> {
    const { data, error } = await this.sb.rpc('email_registrado', { p_email: email });
    if (error) throw error;
    return data === true;
  }

  /** Cierra la sesión actual. */
  async logout(): Promise<void> {
    await this.sb.auth.signOut();
    await this.establecerUsuario(null);
  }
}
