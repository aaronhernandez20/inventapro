import { FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom, isObservable } from 'rxjs';
import {
  camposIgualesValidator, existeEnServidorValidator, nivelPassword, passwordSeguraValidator
} from './validators';

describe('Validadores de formularios', () => {
  it('nivelPassword puntúa de 0 a 4', () => {
    expect(nivelPassword('')).toBe(0);
    expect(nivelPassword('abc')).toBe(1);
    expect(nivelPassword('Abcdefgh1')).toBe(3);
    expect(nivelPassword('Abcdefgh1!')).toBe(4);
  });

  it('passwordSeguraValidator exige 8 caracteres con letras y números', () => {
    expect(passwordSeguraValidator(new FormControl('corta1'))).toEqual({ passwordDebil: true });
    expect(passwordSeguraValidator(new FormControl('sinnumeros'))).toEqual({ passwordDebil: true });
    expect(passwordSeguraValidator(new FormControl('segura123'))).toBeNull();
  });

  it('camposIgualesValidator detecta contraseñas distintas', () => {
    const grupo = new FormGroup(
      { password: new FormControl('segura123'), confirmar: new FormControl('otra1234') },
      { validators: camposIgualesValidator('password', 'confirmar') }
    );
    expect(grupo.hasError('noCoinciden')).toBe(true);
    grupo.controls.confirmar.setValue('segura123');
    expect(grupo.hasError('noCoinciden')).toBe(false);
  });

  it('existeEnServidorValidator marca error si el servicio dice que ya existe', async () => {
    const validador = existeEnServidorValidator(async (v) => v === 'INF-001', 'skuEnUso');
    const enUso = validador(new FormControl('INF-001'));
    const libre = validador(new FormControl('INF-999'));
    expect(isObservable(enUso)).toBe(true);
    expect(await firstValueFrom(enUso as never)).toEqual({ skuEnUso: true });
    expect(await firstValueFrom(libre as never)).toBeNull();
  });

  it('existeEnServidorValidator permite el valor original en modo edición', async () => {
    const validador = existeEnServidorValidator(async () => true, 'skuEnUso', () => 'INF-001');
    expect(await firstValueFrom(validador(new FormControl('inf-001')) as never)).toBeNull();
  });
});
