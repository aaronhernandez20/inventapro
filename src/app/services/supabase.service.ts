import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Crea un único cliente de Supabase para toda la app (patrón Singleton).
 * El resto de servicios lo inyectan en vez de crear el suyo.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** Cliente de Supabase (base de datos SQL, Auth y Storage). */
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);
}
