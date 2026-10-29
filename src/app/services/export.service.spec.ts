import { TestBed } from '@angular/core/testing';
import { ExportService } from './export.service';

describe('ExportService', () => {
  it('genera un CSV con separador ";" y comillas cuando hace falta', async () => {
    let blob: Blob | undefined;
    const original = URL.createObjectURL;
    URL.createObjectURL = (b: Blob) => {
      blob = b;
      return 'blob:test';
    };
    const servicio = TestBed.inject(ExportService);
    servicio.csv({
      archivo: 'prueba',
      titulo: 'Prueba',
      columnas: [
        { titulo: 'SKU', valor: (f: { sku: string; nombre: string }) => f.sku },
        { titulo: 'Nombre', valor: (f) => f.nombre },
      ],
      filas: [{ sku: 'INF-001', nombre: 'Portátil; 15"' }],
    });
    URL.createObjectURL = original;
    const texto = await blob!.text();
    expect(texto.replace('﻿', '')).toBe('SKU;Nombre\r\nINF-001;"Portátil; 15"""');
  });
});
