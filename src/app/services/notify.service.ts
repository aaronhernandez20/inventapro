import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

/**
 * Notificaciones tipo "toast" con un estilo común para toda la app.
 */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private toast = inject(ToastController);

  /** Muestra un mensaje de éxito. */
  ok(mensaje: string): Promise<void> {
    return this.mostrar(mensaje, 'success', 'checkmark-circle-outline');
  }

  /** Muestra un mensaje de error. */
  error(mensaje: string): Promise<void> {
    return this.mostrar(mensaje, 'danger', 'alert-circle-outline');
  }

  /** Muestra un mensaje informativo. */
  info(mensaje: string): Promise<void> {
    return this.mostrar(mensaje, 'dark', 'information-circle-outline');
  }

  private async mostrar(message: string, color: string, icon: string): Promise<void> {
    const t = await this.toast.create({
      message,
      color,
      icon,
      duration: 3000,
      position: 'top',
      cssClass: 'app-toast',
      buttons: [{ icon: 'close', role: 'cancel', side: 'end' }],
    });
    await t.present();
  }
}
