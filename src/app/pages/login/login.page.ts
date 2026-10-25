import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle,
  IonCardContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonText
} from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

/** Pantalla de inicio de sesión (formulario reactivo con validación). */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonInput, IonInputPasswordToggle, IonButton, IonSpinner, IonText
  ],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  /** Estado de la pantalla. */
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  /** Formulario reactivo: email obligatorio y válido, contraseña mínimo 6 caracteres. */
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Envía el formulario: inicia sesión y entra a /inicio. */
  async entrar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl('/inicio', { replaceUrl: true });
    } catch {
      this.error.set('Email o contraseña incorrectos.');
    } finally {
      this.cargando.set(false);
    }
  }
}
