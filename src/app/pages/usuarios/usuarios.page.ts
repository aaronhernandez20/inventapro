import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AlertController, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { peopleOutline, shieldCheckmarkOutline, personOutline } from 'ionicons/icons';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';
import { PerfilListado, Rol } from '../../models/models';
import { Columna, DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

/** Gestión de usuarios y roles (solo Administrador). */
@Component({
  selector: 'app-usuarios',
  templateUrl: 'usuarios.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, IonButton, IonIcon,DataTableComponent, StatCardComponent, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent],
})
export class UsuariosPage {
  private usuariosService = inject(UsuariosService);
  private auth = inject(AuthService);
  private notify = inject(NotifyService);
  private alert = inject(AlertController);

  readonly usuarios = signal<PerfilListado[]>([]);
  readonly cargando = signal(true);
  readonly admins = computed(() => this.usuarios().filter((u) => u.rol === 'admin').length);

  readonly columnas: Columna<PerfilListado>[] = [
    { key: 'nombre', label: 'Nombre', secundario: (u) => u.email },
    {
      key: 'rol',
      label: 'Rol',
      tipo: 'estado',
      estado: (u) => (u.rol === 'admin' ? { texto: 'Administrador', tono: 'violet' } : { texto: 'Usuario estándar', tono: 'neutral' }),
    },
    { key: 'created_at', label: 'Alta', tipo: 'fecha' },
  ];

  constructor() {
    addIcons({ peopleOutline, shieldCheckmarkOutline, personOutline });
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      this.usuarios.set(await this.usuariosService.getUsuarios());
    } catch {
      await this.notify.error('No se pudieron cargar los usuarios');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Abre un diálogo para cambiar el rol del usuario. */
  async cambiarRol(u: PerfilListado): Promise<void> {
    if (u.id === this.auth.user()?.id) {
      await this.notify.info('No puedes cambiar tu propio rol');
      return;
    }
    const alerta = await this.alert.create({
      header: 'Cambiar rol',
      subHeader: u.nombre ?? u.email,
      inputs: [
        { type: 'radio', label: 'Usuario estándar', value: 'user', checked: u.rol === 'user' },
        { type: 'radio', label: 'Administrador', value: 'admin', checked: u.rol === 'admin' },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role, data } = await alerta.onDidDismiss<{ values: Rol }>();
    const rol = data?.values;
    if (role !== 'confirm' || !rol || rol === u.rol) return;
    try {
      await this.usuariosService.cambiarRol(u, rol);
      this.usuarios.update((lista) => lista.map((x) => (x.id === u.id ? { ...x, rol } : x)));
      await this.notify.ok('Rol actualizado');
    } catch {
      await this.notify.error('No se pudo cambiar el rol');
    }
  }
}
