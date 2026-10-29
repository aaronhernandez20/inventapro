import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Logotipo de InventaPro (marca + nombre).
 * Componente visual reutilizable en el menú, el login y el registro.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="brand-mark" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5Z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M3.8 7.2 12 11.7l8.2-4.5M12 11.7v9.6" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    </span>
    <span>
      <span class="brand-name">InventaPro</span>
      @if (tagline()) {
        <span class="brand-tag">{{ tagline() }}</span>
      }
    </span>
  `,
  host: { class: 'brand' },
})
export class LogoComponent {
  /** Texto pequeño bajo el nombre (opcional). */
  readonly tagline = input<string>('');
}
