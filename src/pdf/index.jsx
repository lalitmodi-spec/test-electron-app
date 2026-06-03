import { pdf } from '@react-pdf/renderer';
import ProfessionalTemplate from './templates/Professional';
import ClassicTemplate from './templates/Classic';
import MinimalTemplate from './templates/Minimal';
import { dummyInvoice, dummySettings } from './dummyData';

const templateComponents = {
  professional: ProfessionalTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
};

export function getTemplateComponent(name) {
  return templateComponents[name] || ProfessionalTemplate;
}

export function getTemplateNames() {
  return Object.keys(templateComponents);
}

export function getTemplateLabel(name) {
  const labels = {
    professional: 'Professional',
    classic: 'Classic',
    minimal: 'Minimal',
  };
  return labels[name] || 'Professional';
}

export function getAllTemplates() {
  return Object.entries(templateComponents).map(([key, Component]) => ({
    key,
    label: getTemplateLabel(key),
    Component,
  }));
}

export function buildInvoiceDocument(invoice, settings) {
  const Template = getTemplateComponent(settings.invoiceTemplate || 'professional');
  return <Template invoice={invoice} settings={settings} type="invoice" />;
}

export function buildQuotationDocument(quotation, settings) {
  const Template = getTemplateComponent(settings.invoiceTemplate || 'professional');
  return <Template invoice={quotation} settings={settings} type="quotation" />;
}

export function getDummyData() {
  return { invoice: dummyInvoice, settings: dummySettings };
}

export async function generatePdfBlob(invoice, settings) {
  const Document = buildInvoiceDocument(invoice, settings);
  const blob = await pdf(Document).toBlob();
  return blob;
}

export async function generateAndDownloadPdf(invoice, settings) {
  const blob = await generatePdfBlob(invoice, settings);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${invoice.invoiceNo || 'download'}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function generatePdfBase64(invoice, settings) {
  const blob = await generatePdfBlob(invoice, settings);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generatePdfArrayBuffer(invoice, settings) {
  const blob = await generatePdfBlob(invoice, settings);
  return blob.arrayBuffer();
}

export async function generateQuotationPdfBlob(quotation, settings) {
  const Document = buildQuotationDocument(quotation, settings);
  const blob = await pdf(Document).toBlob();
  return blob;
}

export async function generateAndDownloadQuotationPdf(quotation, settings) {
  const blob = await generateQuotationPdfBlob(quotation, settings);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Quotation_${quotation.quotationNo || 'download'}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
