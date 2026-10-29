import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, input, output, signal, viewChild
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, closeCircleOutline, imageOutline } from 'ionicons/icons';

/**
 * Selector de imagen REUTILIZABLE con vista previa y "arrastrar y soltar".
 *
 * - `url` (input): imagen actual (por ejemplo, la ya guardada en Supabase Storage).
 * - `archivo` (output): emite el archivo elegido (o `null` si se quita).
 * Libera la URL temporal de la vista previa en `ngOnDestroy` para evitar fugas de memoria.
 */
@Component({
  selector: 'app-image-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon],
  template: `
    <div
      class="picker"
      [class.picker--drag]="arrastrando()"
      (dragover)="$event.preventDefault(); arrastrando.set(true)"
      (dragleave)="arrastrando.set(false)"
      (drop)="soltar($event)">
      @if (vista(); as src) {
        <img class="picker-img" [src]="src" alt="Vista previa de la imagen del producto" />
      } @else {
        <span class="picker-empty" aria-hidden="true"><ion-icon name="image-outline"></ion-icon></span>
      }
      <div class="picker-info">
        <p class="picker-title">Imagen del producto</p>
        <p class="picker-help">PNG, JPG o WebP · máx. 2 MB. Se optimiza antes de subirla a Supabase Storage.</p>
        <div class="picker-actions">
          <ion-button size="small" fill="outline" (click)="input()?.nativeElement?.click()">
            <ion-icon slot="start" name="cloud-upload-outline" aria-hidden="true"></ion-icon>
            {{ vista() ? 'Cambiar imagen' : 'Subir imagen' }}
          </ion-button>
          @if (preview()) {
            <ion-button size="small" fill="clear" color="medium" (click)="quitar()">
              <ion-icon slot="start" name="close-circle-outline" aria-hidden="true"></ion-icon> Quitar
            </ion-button>
          }
        </div>
        @if (error()) { <p class="picker-error" role="alert">{{ error() }}</p> }
      </div>
      <input #fileInput type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="elegir($event)" />
    </div>
  `,
})
export class ImagePickerComponent implements OnDestroy {
  /** URL de la imagen actual (opcional). */
  readonly url = input<string | null | undefined>(null);
  /** Archivo elegido por el usuario, o `null` si lo quita. */
  readonly archivo = output<File | null>();

  readonly input = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly preview = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly arrastrando = signal(false);

  /** Imagen a mostrar: la nueva elegida o la actual. */
  readonly vista = computed(() => this.preview() ?? this.url() ?? null);

  private static readonly MAX_BYTES = 2 * 1024 * 1024;
  private static readonly TIPOS = ['image/png', 'image/jpeg', 'image/webp'];

  constructor() {
    addIcons({ cloudUploadOutline, closeCircleOutline, imageOutline });
  }

  elegir(evento: Event): void {
    const file = (evento.target as HTMLInputElement).files?.[0];
    if (file) this.procesar(file);
  }

  soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const file = evento.dataTransfer?.files?.[0];
    if (file) this.procesar(file);
  }

  quitar(): void {
    this.liberar();
    this.preview.set(null);
    this.archivo.emit(null);
    const el = this.input()?.nativeElement;
    if (el) el.value = '';
  }

  private procesar(file: File): void {
    this.error.set(null);
    if (!ImagePickerComponent.TIPOS.includes(file.type)) {
      this.error.set('Formato no válido. Usa PNG, JPG o WebP.');
      return;
    }
    if (file.size > ImagePickerComponent.MAX_BYTES) {
      this.error.set('La imagen supera los 2 MB.');
      return;
    }
    this.liberar();
    this.preview.set(URL.createObjectURL(file));
    this.archivo.emit(file);
  }

  /** Libera la URL temporal creada con createObjectURL. */
  private liberar(): void {
    const p = this.preview();
    if (p) URL.revokeObjectURL(p);
  }

  /** Ciclo de vida: al destruir el componente se libera la memoria de la vista previa. */
  ngOnDestroy(): void {
    this.liberar();
  }
}
