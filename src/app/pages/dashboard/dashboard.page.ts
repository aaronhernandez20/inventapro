import { Component } from '@angular/core';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonCardContent
} from '@ionic/angular';

/** Cuadro de mando (solo Administrador). Los gráficos se añaden en la rama feature/dashboard. */
@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.page.html',
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonCardContent],
})
export class DashboardPage {}
