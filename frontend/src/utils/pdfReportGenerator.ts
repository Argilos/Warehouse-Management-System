import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OtpremnicaDocument } from '../types';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations, Language } from '../lib/translations';

export interface PDFColumn {
  header: string;
  dataKey: string;
}

const getTranslate = (lang: Language) => {
  return (key: string) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
};

/**
 * Generate and download a multi-page PDF report for filtered datasets in BS, EN, or DE.
 */
export const exportReportPDF = (
  title: string,
  columns: PDFColumn[],
  data: Record<string, any>[],
  activeFilters: string[] = [],
  generatedBy: string = 'System Admin'
) => {
  const activeLang = useLanguageStore.getState().language;
  const tr = getTranslate(activeLang);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleString();

  // Header Banner
  doc.setFillColor(30, 58, 138); // Brand 900
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Enterprise Warehouse Asset Management Platform').toUpperCase(), 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${tr('Date')}: ${dateStr}`, pageWidth - 14, 11, { align: 'right' });

  // Title Section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 28);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${tr('Issued By')}: ${generatedBy}  |  ${tr('Filtered Record Count')}: ${data.length}`, 14, 34);

  let startY = 40;

  // Active Filters Summary Box
  if (activeFilters.length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 37, pageWidth - 28, 12, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`${tr('Advanced Multi-Criteria Report Filters')}:`, 18, 42);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const filterText = activeFilters.join('  |  ');
    doc.text(filterText.length > 130 ? filterText.slice(0, 130) + '...' : filterText, 18, 46);

    startY = 54;
  }

  // Table Columns & Rows
  const tableHeaders = columns.map(col => tr(col.header));
  const tableBody = data.map(item =>
    columns.map(col => (item[col.dataKey] !== undefined && item[col.dataKey] !== null ? String(item[col.dataKey]) : '—'))
  );

  autoTable(doc, {
    startY,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 20, left: 14, right: 14, bottom: 20 },
    didDrawPage: (dataArg) => {
      // Repeating header for pages after page 1
      if (dataArg.pageNumber > 1) {
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${title} (${tr('In Progress')})`, 14, 8);
      }

      // Page Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${tr('Showing')} ${dataArg.pageNumber} ${tr('of')} ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
      doc.text(
        'CONFIDENTIAL — OFFICIAL WAREHOUSE FLEET RECORD',
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  const sanitizedFileName = title.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${sanitizedFileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

/**
 * Generate Printable A4 Otpremnica (Equipment Handover Receipt) in active language
 */
export const exportOtpremnicaPDF = (otpremnica: OtpremnicaDocument) => {
  const activeLang = useLanguageStore.getState().language;
  const tr = getTranslate(activeLang);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('OTPREMNICA').toUpperCase(), 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(tr('Enterprise Warehouse Asset Management Platform').toUpperCase(), 14, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(otpremnica.documentNumber, pageWidth - 14, 14, { align: 'right' });

  // Document Information Grid
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 30, pageWidth - 28, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Date')}:`, 18, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(otpremnica.issueDate, 55, 38);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Employee / Recipient:')}`, 18, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(`${otpremnica.employeeName || 'N/A'} (${otpremnica.employeeNumber || ''})`, 65, 45);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Department:')}`, 18, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(otpremnica.employeeDepartment || 'Field Operations', 55, 52);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Project / Job Site:')}`, 18, 59);
  doc.setFont('helvetica', 'normal');
  doc.text(otpremnica.projectName ? `${otpremnica.projectName} (${otpremnica.projectCode || ''})` : tr('General Stock Issue'), 55, 59);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Issuer / Warehouse Rep:')}`, 120, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(otpremnica.createdByName || tr('Warehouse Manager'), 160, 38);

  if (otpremnica.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${tr('Notes (optional)')}:`, 120, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(otpremnica.notes.slice(0, 40), 160, 45);
  }

  // Items Table
  const items = otpremnica.items || [];
  const tableHeaders = [tr('Asset Code'), tr('Asset Name'), tr('QR / Serial'), tr('Category'), tr('Quantity')];
  const tableBody = items.map(item => [
    item.assetNumber,
    item.assetName,
    item.serialNumber || 'N/A',
    tr(item.category),
    item.quantity || 1,
  ]);

  autoTable(doc, {
    startY: 72,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // Legal declaration text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    tr('Potvrđujem da sam gore navedenu opremu preuzeo u ispravnom stanju i preuzimam punu materijalnu odgovornost.'),
    14,
    finalY
  );

  // Signature Blocks
  const sigY = finalY + 25;

  // Employee Signature Box
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(tr('Potpis Preuzimaoca / Employee Signature:'), 14, sigY);
  doc.line(14, sigY + 12, 90, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${otpremnica.employeeName || tr('Zaposlenik')}`, 14, sigY + 17);

  // Warehouse Signature Box
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Izdavalac Skladište / Warehouse Representative:'), 120, sigY);
  doc.line(120, sigY + 12, 196, sigY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${otpremnica.createdByName || tr('Skladištar')}`, 120, sigY + 17);

  // Date
  doc.text(`${tr('Date')}: ____________________`, 14, sigY + 28);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL — OFFICIAL WAREHOUSE HANDOVER RECEIPT', pageWidth / 2, pageHeight - 10, { align: 'center' });

  doc.save(`${otpremnica.documentNumber}.pdf`);
};

/**
 * Generate Printable A4 "Inventurni List" (Toolbox Physical Inspection Sheet) in active language
 */
export const exportToolboxInventorySheetPDF = (toolBox: any, items: any[]) => {
  const activeLang = useLanguageStore.getState().language;
  const tr = getTranslate(activeLang);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toISOString().slice(0, 10);

  // Header Banner
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Inventurni list').toUpperCase(), 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PHYSICAL STOCK INSPECTION RECORD', 14, 17);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`REF: INV-${toolBox.boxNumber}`, pageWidth - 14, 14, { align: 'right' });

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, pageWidth - 28, 28, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Toolbox Kit:')}`, 18, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(toolBox.name, 60, 35);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Tool Box Kit Identifier Number')}:`, 18, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(toolBox.boxNumber, 60, 42);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Assigned Technician:')}`, 18, 49);
  doc.setFont('helvetica', 'normal');
  doc.text(toolBox.employeeName || tr('Unassigned'), 60, 49);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Date')}:`, 125, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(today, 165, 35);

  doc.setFont('helvetica', 'bold');
  doc.text(`${tr('Auditor')}:`, 125, 42);
  doc.setFont('helvetica', 'normal');
  doc.text('__________________', 165, 42);

  // Table with Intentionally Blank Physical Count / Notes Column
  const tableHeaders = ['No.', tr('Asset Code'), tr('Asset Name'), tr('Quantity'), tr('Physical Inspection')];
  const tableBody = items.map((item, idx) => [
    idx + 1,
    item.assetNumber,
    item.name,
    1,
    `[  ] ${tr('AVAILABLE')}   [  ] ${tr('MISSING')}   [  ] ${tr('DAMAGED')}`,
  ]);

  autoTable(doc, {
    startY: 62,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      4: { cellWidth: 70, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;

  // Summary & Signatures
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${tr('Notes (optional)')}:`, 14, finalY);
  doc.rect(14, finalY + 3, pageWidth - 28, 16);

  const sigY = finalY + 26;

  doc.text(tr('Potpis Preuzimaoca / Employee Signature:'), 14, sigY);
  doc.line(14, sigY + 10, 85, sigY + 10);

  doc.text(tr('Izdavalac Skladište / Warehouse Representative:'), 120, sigY);
  doc.line(120, sigY + 10, 190, sigY + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL — OFFICIAL INVENTORY INSPECTION RECORD', pageWidth / 2, pageHeight - 8, { align: 'center' });

  doc.save(`${tr('Inventurni list')}_${toolBox.boxNumber}_${today}.pdf`);
};
