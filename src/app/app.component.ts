import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonFooter, IonButton, IonRouterOutlet, IonNote
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline, cubeOutline, barChartOutline, helpCircleOutline, logOutOutline, menuOutline
} from 'ionicons/icons';
import { AuthService } from './services/auth.service';

/** Opción del menú lateral. */
interface OpcionMenu {
  titulo: string;
  url: string;
  icono: string;
  soloAdmin: boolean;
}

/**
 * Componente raíz: menú lateral global (Side Menu) + zona de páginas.
 * El menú solo se activa con sesión iniciada y muestra las opciones según el rol.
 */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    RouterLink, RouterLinkActive,
    IonApp, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonFooter, IonButton, IonRouterOutlet, IonNote
  ],
})
export class AppComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  private readonly opciones: OpcionMenu[] = [
    { titulo: 'Inicio',            url: '/inicio',    icono: 'home-outline',        soloAdmin: false },
    { titulo: 'Productos',         url: '/productos', icono: 'cube-outline',        soloAdmin: false },
    { titulo: 'Cuadro de mando',   url: '/dashboard', icono: 'bar-chart-outline',   soloAdmin: true },
    { titulo: 'Ayuda',             url: '/ayuda',     icono: 'help-circle-outline', soloAdmin: false },
  ];

  /** Opciones visibles: el Usuario estándar no ve las de administrador. */
  readonly menu = computed(() => this.opciones.filter((o) => !o.soloAdmin || this.auth.isAdmin()));

  constructor() {
    addIcons({ homeOutline, cubeOutline, barChartOutline, helpCircleOutline, logOutOutline, menuOutline });
  }

  /** Cierra sesión y vuelve al login. */
  async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
