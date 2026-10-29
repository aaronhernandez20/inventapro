import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon,
  IonLabel, IonFooter, IonToolbar, IonButton, IonRouterOutlet
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline, cubeOutline, pieChartOutline, helpCircleOutline, logOutOutline,
  swapHorizontalOutline, peopleOutline, checkmarkCircleOutline, alertCircleOutline,
  informationCircleOutline, close
} from 'ionicons/icons';
import { AuthService } from './services/auth.service';
import { LogoComponent } from './shared/components/logo/logo.component';

/** Opción del menú lateral. */
interface OpcionMenu {
  titulo: string;
  url: string;
  icono: string;
  seccion: 'General' | 'Administración' | 'Soporte';
  soloAdmin: boolean;
}

/**
 * Componente raíz: menú lateral global (Side Menu) + zona de páginas.
 * El menú solo se activa con sesión iniciada y muestra las opciones según el rol.
 */
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, RouterLinkActive, LogoComponent,
    IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon,
    IonLabel, IonFooter, IonToolbar, IonButton, IonRouterOutlet
  ],
})
export class AppComponent {
  protected auth = inject(AuthService);
  private router = inject(Router);

  private readonly opciones: OpcionMenu[] = [
    { titulo: 'Inicio',          url: '/inicio',    icono: 'home-outline',        seccion: 'General',        soloAdmin: false },
    { titulo: 'Productos',       url: '/productos', icono: 'cube-outline',        seccion: 'General',        soloAdmin: false },
    { titulo: 'Cuadro de mando', url: '/dashboard', icono: 'pie-chart-outline',   seccion: 'Administración', soloAdmin: true },
    { titulo: 'Ayuda',           url: '/ayuda',     icono: 'help-circle-outline', seccion: 'Soporte',        soloAdmin: false },
  ];

  /** Secciones del menú con sus opciones visibles según el rol. */
  readonly secciones = computed(() => {
    const visibles = this.opciones.filter((o) => !o.soloAdmin || this.auth.isAdmin());
    const nombres = [...new Set(visibles.map((o) => o.seccion))];
    return nombres.map((nombre) => ({ nombre, opciones: visibles.filter((o) => o.seccion === nombre) }));
  });

  constructor() {
    addIcons({
      homeOutline, cubeOutline, pieChartOutline, helpCircleOutline, logOutOutline,
      swapHorizontalOutline, peopleOutline, checkmarkCircleOutline, alertCircleOutline,
      informationCircleOutline, close,
    });
  }

  /** Cierra sesión y vuelve al login. */
  async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
