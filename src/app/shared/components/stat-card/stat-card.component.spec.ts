import { TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  it('muestra la etiqueta y el valor recibidos por input', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('etiqueta', 'Productos');
    fixture.componentRef.setInput('valor', 13);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Productos');
    expect(texto).toContain('13');
  });

  it('si es interactiva se pinta como botón y emite seleccionar', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('etiqueta', 'Stock bajo');
    fixture.componentRef.setInput('valor', 4);
    fixture.componentRef.setInput('interactiva', true);
    fixture.detectChanges();
    let pulsada = false;
    fixture.componentInstance.seleccionar.subscribe(() => (pulsada = true));
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(pulsada).toBe(true);
  });
});
