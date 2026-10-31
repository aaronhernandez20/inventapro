import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, catchError, from, map, of, switchMap, timer } from 'rxjs';

/**
 * Crea un validador ASÍNCRONO que espera 400 ms desde la última pulsación
 * (debounce) y consulta un servicio. Si el servicio responde `true`, el
 * control queda inválido con el error indicado.
 *
 * Angular cancela la comprobación anterior si el usuario sigue escribiendo.
 *
 * @param comprobar función que devuelve `true` si el valor YA existe.
 * @param error nombre del error (ej. 'emailEnUso', 'skuEnUso').
 * @param valorInicial valor que se permite aunque exista (para el modo edición).
 */
export function existeEnServidorValidator(
  comprobar: (valor: string) => Promise<boolean>,
  error: string,
  valorInicial: () => string | null = () => null
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const valor = String(control.value ?? '').trim();
    if (!valor || valor.toUpperCase() === (valorInicial() ?? '').toUpperCase()) {
      return of(null);
    }
    return timer(400).pipe(
      switchMap(() => from(comprobar(valor))),
      map((existe) => (existe ? { [error]: true } : null)),
      // Si el servidor falla no bloqueamos el formulario
      catchError(() => of(null))
    );
  };
}

/** Comprueba que dos campos de un grupo coinciden (ej. contraseña y confirmación). */
export function camposIgualesValidator(campo: string, confirmacion: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const a = grupo.get(campo)?.value;
    const b = grupo.get(confirmacion)?.value;
    return a && b && a !== b ? { noCoinciden: true } : null;
  };
}

/** Contraseña segura: mínimo 8 caracteres con letras y números. */
export const passwordSeguraValidator: ValidatorFn = (control) => {
  const v = String(control.value ?? '');
  if (!v) return null;
  return v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? null : { passwordDebil: true };
};

/** Nivel de fortaleza de una contraseña de 0 a 4 (para el medidor visual). */
export function nivelPassword(v: string): number {
  if (!v) return 0;
  let nivel = 0;
  if (v.length >= 8) nivel++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) nivel++;
  if (/\d/.test(v)) nivel++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) nivel++;
  return Math.max(1, nivel);
}
