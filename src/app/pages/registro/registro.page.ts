import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonIcon, IonNote, IonCheckbox
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline, pulseOutline, shieldCheckmarkOutline, documentTextOutline,
  checkmarkCircle, alertCircleOutline, syncOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { NotifyService } from '../../services/notify.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import {
  camposIgualesValidator, existeEnServidorValidator, nivelPassword, passwordSeguraValidator
} from '../../shared/validators/validators';

/**
 * Pantalla de registro de cuenta nueva.
 * Usa un formulario reactivo con:
 *  - validación síncrona (obligatorios, formato de email, contraseña segura, confirmación),
 *  - validación ASÍNCRONA del email contra Supabase (¿ya existe una cuenta?).
 * La cuenta se crea en Supabase Auth y su perfil (rol 'user') en la tabla `perfiles`.
 */
@Component({
  selector: 'app-registro',
  templateUrl: 'registro.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, LogoComponent,
    IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonIcon, IonNote, IonCheckbox
  ],
})
export class RegistroPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotifyService);
  private fb = inject(FormBuilder);

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]],
      email: this.fb.nonNullable.control('', {
        validators: [Validators.required, Validators.email],
        asyncValidators: [existeEnServidorValidator((v) => this.auth.emailRegistrado(v), 'emailEnUso')],
      }),
      password: ['', [Validators.required, passwordSeguraValidator]],
      confirmar: ['', Validators.required],
      acepto: [false, Validators.requiredTrue],
    },
    { validators: camposIgualesValidator('password', 'confirmar') }
  );

  /** Estado del formulario como señal: refresca la vista cuando termina la validación asíncrona. */
  private readonly estado = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  private readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  /** Estado del email: 'comprobando' | 'disponible' | 'en-uso' | null. */
  readonly estadoEmail = computed(() => {
    this.estado();
    const c = this.form.controls.email;
    if (c.pending) return 'comprobando';
    if (c.hasError('emailEnUso')) return 'en-uso';
    if (c.valid && c.value) return 'disponible';
    return null;
  });

  /** Nivel de fortaleza de la contraseña (0-4) para el medidor visual. */
  readonly nivel = computed(() => nivelPassword(this.password()));
  readonly textoNivel = computed(() => ['', 'Débil', 'Mejorable', 'Buena', 'Muy segura'][this.nivel()]);

  /** ¿Las contraseñas no coinciden? */
  readonly noCoinciden = computed(() => {
    this.estado();
    return this.form.hasError('noCoinciden') && this.form.controls.confirmar.touched;
  });

  constructor() {
    addIcons({
      cubeOutline, pulseOutline, shieldCheckmarkOutline, documentTextOutline,
      checkmarkCircle, alertCircleOutline, syncOutline,
    });
  }

  /** Mensaje de error del email según el fallo. */
  errorEmail(): string {
    const c = this.form.controls.email;
    if (c.hasError('required')) return 'El email es obligatorio';
    if (c.hasError('email')) return 'Introduce un email válido';
    if (c.hasError('emailEnUso')) return 'Ya existe una cuenta con este email';
    return '';
  }

  /** Crea la cuenta en Supabase. */
  async registrar(): Promise<void> {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    try {
      const { nombre, email, password } = this.form.getRawValue();
      const r = await this.auth.registrar(nombre.trim(), email.trim().toLowerCase(), password);
      if (r.sesionIniciada) {
        await this.notify.ok(`¡Bienvenido, ${nombre.trim()}! Tu cuenta se ha creado.`);
        await this.router.navigateByUrl('/inicio', { replaceUrl: true });
      } else {
        await this.notify.info('Cuenta creada. Revisa tu correo para confirmarla y después inicia sesión.');
        await this.router.navigateByUrl('/login', { replaceUrl: true });
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se ha podido crear la cuenta.');
    } finally {
      this.enviando.set(false);
    }
  }
}
