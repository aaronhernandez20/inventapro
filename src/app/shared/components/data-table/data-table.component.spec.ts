import { TestBed } from '@angular/core/testing';
import { Columna, DataTableComponent } from './data-table.component';

interface Fila {
  id: number;
  nombre: string;
  precio: number;
}

describe('DataTableComponent', () => {
  const filas: Fila[] = [
    { id: 1, nombre: 'Teclado', precio: 60 },
    { id: 2, nombre: 'Ratón', precio: 20 },
    { id: 3, nombre: 'Monitor', precio: 230 },
  ];
  const columnas: Columna<Fila>[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'precio', label: 'Precio', tipo: 'moneda' },
  ];

  function crear() {
    const fixture = TestBed.createComponent(DataTableComponent<Fila>);
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('acciones', true);
    fixture.detectChanges();
    return fixture;
  }

  it('filtra las filas con el buscador (sin distinguir tildes)', () => {
    const tabla = crear().componentInstance;
    tabla.buscar('raton');
    expect(tabla.filtradas().map((f) => f.id)).toEqual([2]);
  });

  it('ordena ascendente y descendente al pulsar la cabecera', () => {
    const tabla = crear().componentInstance;
    tabla.ordenar(columnas[1]);
    expect(tabla.ordenadas().map((f) => f.precio)).toEqual([20, 60, 230]);
    tabla.ordenar(columnas[1]);
    expect(tabla.ordenadas().map((f) => f.precio)).toEqual([230, 60, 20]);
  });

  it('emite el evento editar con la fila', () => {
    const fixture = crear();
    let editada: Fila | undefined;
    fixture.componentInstance.editar.subscribe((f) => (editada = f));
    fixture.componentInstance.editar.emit(filas[0]);
    expect(editada).toEqual(filas[0]);
  });

  it('notifica al padre los cambios del buscador', () => {
    const fixture = crear();
    const valores: string[] = [];
    fixture.componentInstance.busqueda.subscribe((v) => valores.push(v));
    fixture.componentInstance.buscar('mon');
    expect(valores).toEqual(['mon']);
  });
});
