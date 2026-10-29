import { Injectable } from '@angular/core';

/** Columna de un informe: título y cómo obtener el valor de cada fila. */
export interface ColumnaInforme<T> {
  titulo: string;
  valor: (fila: T) => string | number;
  /** Alineación en el PDF. */
  alinear?: 'left' | 'right' | 'center';
}

/** Dato destacado que se pinta en la cabecera del PDF. */
export interface IndicadorInforme {
  etiqueta: string;
  valor: string;
}

/** Opciones de un informe. */
export interface Informe<T> {
  /** Nombre del archivo sin extensión. */
  archivo: string;
  titulo: string;
  subtitulo?: string;
  columnas: ColumnaInforme<T>[];
  filas: T[];
  indicadores?: IndicadorInforme[];
}

/**
 * Genera y descarga informes tabulados en CSV y PDF.
 * - CSV: separador ";" y BOM UTF-8, para que Excel en español lo abra con tildes y columnas bien.
 * - PDF: jsPDF + jspdf-autotable, con cabecera de marca, indicadores, tabla y pie con paginación.
 *   Las librerías se cargan bajo demanda (import dinámico) para no aumentar la carga inicial.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  /** Descarga el informe en CSV. */
  csv<T>(informe: Informe<T>): void {
    const escapar = (v: string | number): string => {
      const s = String(v ?? '');
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lineas = [
      informe.columnas.map((c) => escapar(c.titulo)).join(';'),
      ...informe.filas.map((f) => informe.columnas.map((c) => escapar(c.valor(f))).join(';')),
    ];
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    this.descargar(blob, `${informe.archivo}.csv`);
  }

  /** Genera el PDF y lo descarga. */
  async pdf<T>(informe: Informe<T>): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: informe.columnas.length > 5 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    const ancho = doc.internal.pageSize.getWidth();
    const fecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

    // Cabecera de marca
    doc.setFillColor(49, 46, 129);
    doc.rect(0, 0, ancho, 30, 'F');
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 28, ancho, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('InventaPro', 14, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Gestión de inventario', 14, 19);
    doc.text(fecha, ancho - 14, 13, { align: 'right' });

    // Título
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(informe.titulo, 14, 42);
    let y = 42;
    if (informe.subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(informe.subtitulo, 14, 49);
      y = 49;
    }

    // Indicadores en cajas
    const indicadores = informe.indicadores ?? [];
    if (indicadores.length) {
      const hueco = 4;
      const caja = (ancho - 28 - hueco * (indicadores.length - 1)) / indicadores.length;
      indicadores.forEach((ind, i) => {
        const x = 14 + i * (caja + hueco);
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(x, y + 6, caja, 18, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.text(ind.etiqueta, x + 4, y + 12);
        doc.setFontSize(12);
        doc.setTextColor(49, 46, 129);
        doc.setFont('helvetica', 'bold');
        doc.text(ind.valor, x + 4, y + 20);
      });
      y += 24;
    }

    // Tabla
    autoTable(doc, {
      startY: y + 8,
      head: [informe.columnas.map((c) => c.titulo)],
      body: informe.filas.map((f) => informe.columnas.map((c) => String(c.valor(f)))),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: [15, 23, 42] },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: Object.fromEntries(informe.columnas.map((c, i) => [i, { halign: c.alinear ?? 'left' }])),
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        const alto = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('InventaPro · Informe generado automáticamente · Datos ficticios', 14, alto - 8);
        doc.text(`Página ${doc.getNumberOfPages()}`, ancho - 14, alto - 8, { align: 'right' });
      },
    });

    doc.save(`${informe.archivo}.pdf`);
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
