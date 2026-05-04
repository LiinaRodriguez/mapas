import { jsPDF } from 'jspdf';
import type { Layer, User } from '../types';

interface ExportOptions {
  projectName: string;
  projectDescription: string;
  elaboratorName: string;
  layers: Layer[];
  user: User;
  mapImage: string;
}


export function exportMapToPdf(options: ExportOptions) {
  const { projectName, projectDescription, elaboratorName, layers, user, mapImage } = options;

  try {

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = 297;
    const pageH = 210;
    const margin = 12;
    const contentW = pageW - margin * 2;

    pdf.setFillColor(245, 247, 250);
    pdf.rect(0, 0, pageW, pageH, 'F');

    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, margin, contentW, pageH - margin * 2);

    const headerH = 18;
    pdf.setFillColor(22, 22, 22);
    pdf.rect(margin, margin, contentW, headerH, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(projectName.toUpperCase(), margin + 8, margin + 11);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(180, 180, 180);
    const desc = projectDescription.length > 100
      ? projectDescription.substring(0, 100) + '...'
      : projectDescription || 'Reporte cartográfico generado automáticamente.';
    pdf.text(desc, margin + 8, margin + 15);

    const mapTop = margin + headerH + 4;
    const legendW = 75;
    const mapW = contentW - legendW - 6;
    const mapH = pageH - margin * 2 - headerH - 34;

    pdf.setDrawColor(50, 50, 50);
    pdf.setLineWidth(0.3);
    pdf.rect(margin + 2, mapTop, mapW, mapH);

    pdf.addImage(mapImage, 'JPEG', margin + 2, mapTop, mapW, mapH);

    const legendX = margin + mapW + 4;
    const legendTop = mapTop;
    const legendH = mapH;

    pdf.setFillColor(255, 255, 255);
    pdf.rect(legendX, legendTop, legendW, legendH, 'F');
    pdf.setDrawColor(30, 41, 59);
    pdf.rect(legendX, legendTop, legendW, legendH);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(22, 22, 22);
    pdf.text('LEYENDA', legendX + 6, legendTop + 10);

    pdf.setDrawColor(200, 200, 200);
    pdf.line(legendX + 6, legendTop + 13, legendX + legendW - 6, legendTop + 13);

    let ly = legendTop + 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');

    for (const layer of layers) {
      if (ly > legendTop + legendH - 10) {
        pdf.text('...', legendX + 6, ly);
        break;
      }

      const rgb = hexToRgb(layer.color);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(legendX + 6, ly - 3, 4, 4, 'F');
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.1);
      pdf.rect(legendX + 6, ly - 3, 4, 4);

      pdf.setTextColor(50, 50, 50);
      const name = layer.nombre_personalizado.length > 35
        ? layer.nombre_personalizado.substring(0, 35) + '...'
        : layer.nombre_personalizado;
      pdf.text(name, legendX + 14, ly);

      ly += 8;
    }

    const footerTop = mapTop + mapH + 4;
    const footerH = 26;

    pdf.setFillColor(22, 22, 22);
    pdf.rect(margin, footerTop, contentW, footerH, 'F');

    pdf.setTextColor(180, 180, 180);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');

    const col1 = margin + 10;
    const col2 = margin + contentW * 0.4;
    const col3 = margin + contentW * 0.75;
    const fy1 = footerTop + 10;
    const fy2 = footerTop + 18;

    pdf.text('ELABORADO POR:', col1, fy1);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.text(elaboratorName.toUpperCase(), col1, fy2);

    pdf.setTextColor(180, 180, 180);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TARJETA PROFESIONAL:', col2, fy1);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.text(user.es_licenciado ? user.numero_licencia || 'LICENCIADO' : 'NO REGISTRA', col2, fy2);

    pdf.setTextColor(180, 180, 180);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FECHA DE EMISIÓN:', col3, fy1);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }), col3, fy2);

    const fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    alert('Error al generar el PDF. Revisa la consola para más detalles.');
  }
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}
