import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonAccordionGroup,
  IonAccordion, IonItem, IonLabel, IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline, cubeOutline, swapHorizontalOutline, pieChartOutline, peopleOutline, personAddOutline,
  keypadOutline, helpBuoyOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

/** Sección del manual de usuario. */
interface SeccionAyuda {
  id: string;
  titulo: string;
  icono: string;
  soloAdmin: boolean;
  pasos: string[];
}

/**
 * Manual de usuario integrado en la app (sistema de "Ayuda" contextual).
 * Cada página tiene un botón "?" que abre este manual con su sección desplegada
 * gracias al parámetro de la URL `?seccion=...`.
 */
@Component({
  selector: 'app-ayuda',
  templateUrl: 'ayuda.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent,
    IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonIcon
  ],
})
export class AyudaPage {
  protected auth = inject(AuthService);

  /** Sección a abrir (llega como query param ?seccion=... gracias a withComponentInputBinding). */
  readonly seccion = input<string>();
  readonly abierta = computed(() => this.seccion() ?? 'inicio');

  private readonly todas: SeccionAyuda[] = [
    {
      id: 'inicio', titulo: 'Inicio', icono: 'home-outline', soloAdmin: false,
      pasos: [
        'Al entrar verás un resumen del inventario: número de productos, unidades, valor total y productos con stock bajo.',
        'Pulsa en las tarjetas "Productos" o "Stock bajo" para ir directamente al inventario.',
        '"Productos a reponer" muestra los artículos por debajo de su stock mínimo, ordenados por urgencia.',
        '"Actividad reciente" se actualiza sola en tiempo real cuando cualquier usuario hace un cambio.',
      ],
    },
    {
      id: 'productos', titulo: 'Productos', icono: 'cube-outline', soloAdmin: false,
      pasos: [
        'Usa el buscador para filtrar por nombre, SKU, categoría o proveedor.',
        'Cambia entre "Todos" y "Stock bajo" o elige una categoría para filtrar la tabla.',
        'Pulsa en la cabecera de una columna para ordenar (ascendente, descendente o sin orden).',
        'Descarga el listado que estás viendo en CSV (Excel) o en PDF con los botones de la parte superior.',
        'Administrador: crea productos con "Nuevo producto" y edita o elimina con los iconos de cada fila.',
        'Administrador: al crear un producto, el SKU se comprueba al momento en la base de datos para que no se repita. Puedes subir una imagen arrastrándola al recuadro.',
      ],
    },
    {
      id: 'movimientos', titulo: 'Movimientos', icono: 'swap-horizontal-outline', soloAdmin: false,
      pasos: [
        'Elige "Entrada" (llega mercancía) o "Salida" (sale mercancía), el producto y la cantidad, y pulsa "Registrar".',
        'El stock del producto se actualiza automáticamente. No se permite una salida mayor que el stock disponible.',
        'Si un producto queda por debajo de su mínimo se genera una alerta que ven todos los usuarios al instante.',
        'El historial muestra todos los movimientos y se puede buscar, ordenar y exportar.',
      ],
    },
    {
      id: 'dashboard', titulo: 'Cuadro de mando', icono: 'pie-chart-outline', soloAdmin: true,
      pasos: [
        'Filtra por periodo (3, 6 o 12 meses) y por categoría: los indicadores y los gráficos se recalculan al instante.',
        'El gráfico de área muestra las entradas y salidas de cada mes.',
        'El anillo reparte el valor del inventario por categoría (o por producto si eliges una categoría).',
        'El radar compara el stock actual con el stock mínimo.',
        'Descarga el informe completo en PDF o CSV.',
      ],
    },
    {
      id: 'usuarios', titulo: 'Usuarios y roles', icono: 'people-outline', soloAdmin: true,
      pasos: [
        'Consulta todas las cuentas registradas y su rol.',
        'Pulsa el icono de editar para cambiar el rol entre "Usuario estándar" y "Administrador".',
        'Por seguridad no puedes cambiar tu propio rol.',
      ],
    },
    {
      id: 'cuenta', titulo: 'Crear cuenta e iniciar sesión', icono: 'person-add-outline', soloAdmin: false,
      pasos: [
        'Desde la pantalla de inicio de sesión pulsa "Crear una cuenta".',
        'Mientras escribes el email, la app comprueba si ya existe una cuenta con él.',
        'La contraseña debe tener al menos 8 caracteres con letras y números. El medidor te indica su seguridad.',
        'Las cuentas nuevas tienen el rol "Usuario estándar". Un administrador puede cambiarlo.',
      ],
    },
    {
      id: 'teclado', titulo: 'Accesibilidad y uso con teclado', icono: 'keypad-outline', soloAdmin: false,
      pasos: [
        'Toda la aplicación se puede usar con el teclado: Tab para avanzar, Mayús + Tab para retroceder y Enter o Espacio para activar.',
        'El elemento con el foco se resalta con un borde morado.',
        'Puedes ampliar el texto con el zoom del navegador (Ctrl + +) sin que se descoloque la interfaz.',
        'Los gráficos, iconos y botones tienen descripciones para lectores de pantalla.',
      ],
    },
  ];

  /** Secciones visibles según el rol. */
  readonly secciones = computed(() => this.todas.filter((s) => !s.soloAdmin || this.auth.isAdmin()));

  constructor() {
    addIcons({
      homeOutline, cubeOutline, swapHorizontalOutline, pieChartOutline, peopleOutline, personAddOutline,
      keypadOutline, helpBuoyOutline,
    });
  }
}
