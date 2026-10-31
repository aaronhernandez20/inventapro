import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonIcon, IonNote
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline, pulseOutline, shieldCheckmarkOutline, documentTextOutline, alertCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { LogoComponent } from '../../shared/components/logo/logo.component';

/** Pantalla de inicio de sesión (formulario reactivo con validación). */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink, LogoComponent,
    IonContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonIcon, IonNote
  ],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  /**
   * URL a la que volver tras iniciar sesión (`/login?returnUrl=/movimientos`).
   * La rellena el router gracias a `withComponentInputBinding()`; la pone `authGuard`.
   */
  readonly returnUrl = input<string>();

  /** Estado de la pantalla. */
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  /** Formulario reactivo: email obligatorio y válido, contraseña mínimo 6 caracteres. */
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    addIcons({ cubeOutline, pulseOutline, shieldCheckmarkOutline, documentTextOutline, alertCircleOutline });
  }

  /** Envía el formulario: inicia sesión y vuelve a la página pedida (o a /inicio). */
  async entrar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email.trim(), password);
      await this.router.navigateByUrl(this.destino(), { replaceUrl: true });
    } catch {
      this.error.set('Email o contraseña incorrectos.');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Destino tras el login: la URL guardada si es interna (empieza por "/"), si no /inicio. */
  private destino(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/inicio';
  }
}
