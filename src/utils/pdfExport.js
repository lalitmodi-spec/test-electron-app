import db from '../db';
import { generatePdfBlob, generatePdfArrayBuffer, generateQuotationPdfBlob } from '../pdf/index';

export async function generateInvoicePDF(invoiceData, templateOverride) {
  const settingsArr = await db.settings.toArray();
  const settings = {};
  settingsArr.forEach(s => { settings[s.key] = s.value; });

  if (templateOverride) {
    settings.invoiceTemplate = templateOverride;
  }

  if (window.electronAPI && settings.businessLogo) {
    try {
      const logoResult = await window.electronAPI.readLogo();
      if (logoResult.success && logoResult.data) {
        settings.businessLogo = logoResult.data;
      }
    } catch (e) {
      console.warn('Could not read logo file, using stored base64', e);
    }
  }

  const filename = `Invoice_${invoiceData.invoiceNo || 'download'}.pdf`;

  try {
    if (window.electronAPI) {
      const buffer = await generatePdfArrayBuffer(invoiceData, settings);
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const result = await window.electronAPI.savePdf({ pdfData: base64, filename });
      if (result.success) {
        console.log('PDF saved to:', result.filePath);
      }
    } else {
      const blob = await generatePdfBlob(invoiceData, settings);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  } catch (err) {
    console.error('PDF generation error:', err);
  }
}

export async function generateQuotationPDF(quotationData, templateOverride) {
  const settingsArr = await db.settings.toArray();
  const settings = {};
  settingsArr.forEach(s => { settings[s.key] = s.value; });

  if (templateOverride) {
    settings.invoiceTemplate = templateOverride;
  }

  if (window.electronAPI && settings.businessLogo) {
    try {
      const logoResult = await window.electronAPI.readLogo();
      if (logoResult.success && logoResult.data) {
        settings.businessLogo = logoResult.data;
      }
    } catch (e) {
      console.warn('Could not read logo file, using stored base64', e);
    }
  }

  const filename = `Quotation_${quotationData.quotationNo || 'download'}.pdf`;

  try {
    if (window.electronAPI) {
      const doc = await import('../pdf/index');
      const buffer = await doc.generateQuotationPdfBlob(quotationData, settings).then(b => b.arrayBuffer());
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const result = await window.electronAPI.savePdf({ pdfData: base64, filename });
      if (result.success) {
        console.log('PDF saved to:', result.filePath);
      }
    } else {
      const blob = await generateQuotationPdfBlob(quotationData, settings);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  } catch (err) {
    console.error('Quotation PDF generation error:', err);
  }
}
