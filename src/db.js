import Dexie from 'dexie';

const db = new Dexie('BillingApp');

db.version(6).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  payments: '++id, invoiceId, amount, method, date, reference, note, createdAt',
  creditNotes: '++id, cnNo, invoiceId, customerId, customerName, date, status, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
  counters: '++id, key',
});

db.version(5).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  payments: '++id, invoiceId, amount, method, date, reference, note, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
});

db.version(4).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  payments: '++id, invoiceId, amount, method, date, reference, note, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
});

db.version(3).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
});

db.version(2).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  expenses: '++id, title, category, amount, date, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
});

const defaultSettings = {
  businessName: 'Your Business Name',
  businessAddress: '123, Main Street, City - 000001',
  businessPhone: '+91 9876543210',
  businessEmail: 'business@example.com',
  businessGstin: '29ABCDE1234F1Z5',
  businessLogo: '',
  businessBankName: '',
  businessBankAccount: '',
  businessBankIfsc: '',
  businessUpiId: '',
  currency: 'INR',
  taxLabel: 'GST',
  defaultTaxRate: 18,
  termsConditions: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. on delayed payments.',
  theme: 'dark',
  invoiceTemplate: 'modern',
  invoicePrefix: 'INV',
  invoiceSeparator: '-',
  invoiceNextNumber: 1,
  invoiceZeroPad: 5,
  expenseCategories: JSON.stringify(['Office Supplies', 'Utilities', 'Travel', 'Food', 'Rent', 'Maintenance', 'Salary', 'Marketing', 'Software', 'Other']),
};

export async function getSettings() {
  const settings = await db.settings.toArray();
  const result = { ...defaultSettings };
  settings.forEach(s => { result[s.key] = s.value; });
  return result;
}

export async function updateSetting(key, value) {
  const existing = await db.settings.get(key);
  if (existing) {
    await db.settings.update(key, { value });
  } else {
    await db.settings.add({ id: key, key, value });
  }
}

export async function logActivity(type, message) {
  await db.activity.add({
    type,
    message,
    timestamp: new Date().toISOString(),
  });
}

export async function getPaymentSummary(invoiceId) {
  const payments = await db.payments.where('invoiceId').equals(invoiceId).toArray();
  return payments.reduce((s, p) => s + Number(p.amount), 0);
}

export async function getPaymentsForInvoice(invoiceId) {
  return db.payments.where('invoiceId').equals(invoiceId).reverse().toArray();
}

export async function recordPayment({ invoiceId, amount, method, date, reference, note }) {
  const payment = {
    invoiceId: Number(invoiceId),
    amount: Number(amount),
    method: method || 'Cash',
    date: date || new Date().toISOString().split('T')[0],
    reference: reference || '',
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  const id = await db.payments.add(payment);

  const invoice = await db.invoices.get(Number(invoiceId));
  if (invoice) {
    const totalPaid = await getPaymentSummary(invoiceId);
    const grandTotal = Number(invoice.grandTotal) || 0;
    let newStatus = 'unpaid';
    if (totalPaid >= grandTotal) newStatus = 'paid';
    else if (totalPaid > 0) newStatus = 'partial';
    await db.invoices.update(Number(invoiceId), { status: newStatus });
  }

  await logActivity('payment', `Payment of ₹${Number(amount).toFixed(2)} recorded for invoice #${invoice?.invoiceNo || invoiceId}`);
  return id;
}

export async function deletePayment(id, invoiceId) {
  await db.payments.delete(id);
  const invoice = await db.invoices.get(Number(invoiceId));
  if (invoice) {
    const totalPaid = await getPaymentSummary(invoiceId);
    const grandTotal = Number(invoice.grandTotal) || 0;
    let newStatus = 'unpaid';
    if (totalPaid >= grandTotal) newStatus = 'paid';
    else if (totalPaid > 0) newStatus = 'partial';
    await db.invoices.update(Number(invoiceId), { status: newStatus });
  }
}

export async function getCustomerPaymentSummary(customerId) {
  const invoices = await db.invoices.where('customerId').equals(customerId).toArray();
  let totalBilled = 0;
  let totalPaid = 0;
  for (const inv of invoices) {
    totalBilled += Number(inv.grandTotal) || 0;
    const paid = await getPaymentSummary(inv.id);
    totalPaid += paid;
  }
  return {
    totalBilled,
    totalPaid,
    pending: totalBilled - totalPaid,
    invoiceCount: invoices.length,
  };
}

export async function getInvoicesForCustomer(customerId) {
  const invoices = await db.invoices.where('customerId').equals(customerId).reverse().toArray();
  const result = [];
  for (const inv of invoices) {
    const paid = await getPaymentSummary(inv.id);
    result.push({ ...inv, paidAmount: paid, balance: (Number(inv.grandTotal) || 0) - paid });
  }
  return result;
}

export async function getPaymentsForCustomer(customerId) {
  const invoices = await db.invoices.where('customerId').equals(customerId).toArray();
  const invoiceIds = invoices.map(i => i.id);
  if (invoiceIds.length === 0) return [];
  const payments = await db.payments.where('invoiceId').anyOf(invoiceIds).reverse().toArray();
  const invoiceMap = {};
  invoices.forEach(i => { invoiceMap[i.id] = i.invoiceNo; });
  return payments.map(p => ({
    ...p,
    invoiceNo: invoiceMap[p.invoiceId] || `#${p.invoiceId}`,
  }));
}

export async function getNextInvoiceNo() {
  const settings = await getSettings();
  const prefix = settings.invoicePrefix || 'INV';
  const sep = settings.invoiceSeparator || '-';
  const pad = Number(settings.invoiceZeroPad) || 5;
  let next = Number(settings.invoiceNextNumber) || 1;

  const existing = await db.counters.get('invoice_no');
  if (existing) {
    next = existing.value;
  }

  const num = String(next).padStart(pad, '0');
  const invoiceNo = `${prefix}${sep}${num}`;

  await db.counters.put({ id: 'invoice_no', key: 'invoice_no', value: next + 1 });
  await updateSetting('invoiceNextNumber', next + 1);

  return invoiceNo;
}

export async function getNextCreditNoteNo() {
  const settings = await getSettings();
  const prefix = 'CN';
  const sep = settings.invoiceSeparator || '-';
  const pad = Number(settings.invoiceZeroPad) || 5;

  let next = 1;
  const existing = await db.counters.get('cn_no');
  if (existing) {
    next = existing.value;
  }

  const num = String(next).padStart(pad, '0');
  const cnNo = `${prefix}${sep}${num}`;

  await db.counters.put({ id: 'cn_no', key: 'cn_no', value: next + 1 });

  return cnNo;
}

export async function createCreditNote(data) {
  const cnNo = await getNextCreditNoteNo();
  const cn = {
    cnNo,
    invoiceId: data.invoiceId || null,
    customerId: data.customerId || '',
    customerName: data.customerName || '',
    customerGstin: data.customerGstin || '',
    date: data.date || new Date().toISOString().split('T')[0],
    items: data.items || [],
    subtotal: Number(data.subtotal) || 0,
    taxAmount: Number(data.taxAmount) || 0,
    total: Number(data.total) || 0,
    reason: data.reason || '',
    status: 'issued',
    createdAt: new Date().toISOString(),
  };
  const id = await db.creditNotes.add(cn);
  await logActivity('credit_note', `Credit Note ${cnNo} created for ₹${cn.total.toFixed(2)}`);
  return { ...cn, id };
}

export async function getCreditNotesForInvoice(invoiceId) {
  return db.creditNotes.where('invoiceId').equals(invoiceId).reverse().toArray();
}

export default db;
