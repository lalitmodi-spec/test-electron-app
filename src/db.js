import Dexie from 'dexie';

const db = new Dexie('BillingApp');

db.version(10).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  payments: '++id, invoiceId, amount, method, date, reference, note, createdAt',
  creditNotes: '++id, cnNo, invoiceId, customerId, customerName, date, status, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  purchases: '++id, productId, productName, vendorId, date, supplier, createdAt',
  vendors: '++id, name, company, phone, email, gstin, address, createdAt',
  quotations: '++id, quotationNo, customerId, customerName, date, status, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
  counters: '++id, key',
  backups: '++id, createdAt',
});

db.version(9).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  payments: '++id, invoiceId, amount, method, date, reference, note, createdAt',
  creditNotes: '++id, cnNo, invoiceId, customerId, customerName, date, status, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  purchases: '++id, productId, productName, vendorId, date, supplier, createdAt',
  vendors: '++id, name, company, phone, email, gstin, address, createdAt',
  quotations: '++id, quotationNo, customerId, customerName, date, status, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
  counters: '++id, key',
});

db.version(8).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  payments: '++id, invoiceId, amount, method, date, reference, note, createdAt',
  creditNotes: '++id, cnNo, invoiceId, customerId, customerName, date, status, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  purchases: '++id, productId, productName, vendorId, date, supplier, createdAt',
  vendors: '++id, name, company, phone, email, gstin, address, createdAt',
  activity: '++id, type, message, timestamp',
  settings: '++id, key',
  counters: '++id, key',
});

db.version(7).stores({
  customers: '++id, name, phone, gstin, email, createdAt',
  products: '++id, name, hsn, taxRate, price, stock, minStock, unit, createdAt',
  invoices: '++id, invoiceNo, customerId, customerName, date, status, paymentMethod, createdAt',
  payments: '++id, invoiceId, amount, method, date, reference, note, createdAt',
  creditNotes: '++id, cnNo, invoiceId, customerId, customerName, date, status, createdAt',
  expenses: '++id, title, category, amount, date, items, createdAt',
  purchases: '++id, productId, productName, vendorId, date, supplier, createdAt',
  vendors: '++id, name, company, phone, email, gstin, address, createdAt',
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
  businessPan: '',
  businessCin: '',
  businessFssai: '',
  businessMsme: '',
  businessType: 'Proprietorship',
  businessLogo: '',
  businessBankName: '',
  businessBankAccount: '',
  businessBankIfsc: '',
  businessUpiId: '',
  currency: 'INR',
  taxLabel: 'GST',
  defaultTaxRate: 18,
  defaultPaymentTerms: 'due_on_receipt',
  termsConditions: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. on delayed payments.\n3. Payment due within 15 days.',
  reminderEnabled: false,
  reminderDaysBefore: 3,
  reminderNote: 'Dear {{customer}},\n\nThis is a friendly reminder that invoice {{invoiceNo}} of ₹{{amount}} is due on {{dueDate}}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you,\n{{businessName}}',
  theme: 'dark',
  themeColor: '#6366f1',
  invoiceTemplate: 'modern',
  invoicePrefix: 'INV',
  invoiceSeparator: '-',
  invoiceNextNumber: 1,
  invoiceZeroPad: 5,
  expenseCategories: JSON.stringify(['Office Supplies', 'Utilities', 'Travel', 'Food', 'Rent', 'Maintenance', 'Salary', 'Marketing', 'Software', 'Other']),
  productCategories: JSON.stringify(['Electronics', 'Clothing', 'Food & Beverages', 'Furniture', 'Stationery', 'Software', 'Services', 'Raw Material', 'Packaging', 'Other']),
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFromEmail: '',
  smtpSecure: false,
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
    reasonType: data.reasonType || 'other',
    additionalCharges: Number(data.additionalCharges) || 0,
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

// ---- Quotation Management ----

export async function getNextQuotationNo() {
  const settings = await getSettings();
  const prefix = 'QTN';
  const sep = settings.invoiceSeparator || '-';
  const pad = Number(settings.invoiceZeroPad) || 5;

  let next = 1;
  const existing = await db.counters.get('quotation_no');
  if (existing) {
    next = existing.value;
  }

  const num = String(next).padStart(pad, '0');
  const quotationNo = `${prefix}${sep}${num}`;

  await db.counters.put({ id: 'quotation_no', key: 'quotation_no', value: next + 1 });

  return quotationNo;
}

export async function getQuotations() {
  return db.quotations.reverse().toArray();
}

export async function getQuotation(id) {
  return db.quotations.get(Number(id));
}

export async function addQuotation(data) {
  const quotationNo = data.quotationNo || await getNextQuotationNo();
  const q = {
    quotationNo,
    date: data.date || new Date().toISOString().split('T')[0],
    validUntil: data.validUntil || '',
    customerId: data.customerId || '',
    customerName: data.customerName || '',
    customerCompany: data.customerCompany || '',
    customerGstin: data.customerGstin || '',
    customerState: data.customerState || '',
    customerAddress: data.customerAddress || '',
    customerShippingAddress: data.customerShippingAddress || '',
    customerStateCode: data.customerStateCode || '',
    items: data.items || [],
    subtotal: Number(data.subtotal) || 0,
    cgst: Number(data.cgst) || 0,
    sgst: Number(data.sgst) || 0,
    discount: Number(data.discount) || 0,
    grandTotal: Number(data.grandTotal) || 0,
    notes: data.notes || '',
    status: data.status || 'draft',
    convertedToInvoiceId: data.convertedToInvoiceId || null,
    createdAt: new Date().toISOString(),
  };
  const id = await db.quotations.add(q);
  await logActivity('quotation', `Created quotation: ${quotationNo} - ₹${q.grandTotal}`);
  return { ...q, id };
}

export async function updateQuotation(id, data) {
  const q = await db.quotations.get(Number(id));
  if (!q) throw new Error('Quotation not found');
  const updateData = {
    date: data.date || q.date,
    validUntil: data.validUntil || q.validUntil,
    customerId: data.customerId || q.customerId,
    customerName: data.customerName || q.customerName,
    customerCompany: data.customerCompany || q.customerCompany,
    customerGstin: data.customerGstin || q.customerGstin,
    customerState: data.customerState || q.customerState,
    customerAddress: data.customerAddress || q.customerAddress,
    customerShippingAddress: data.customerShippingAddress || q.customerShippingAddress,
    customerStateCode: data.customerStateCode || q.customerStateCode,
    items: data.items || q.items,
    subtotal: Number(data.subtotal) || q.subtotal,
    cgst: Number(data.cgst) || q.cgst,
    sgst: Number(data.sgst) || q.sgst,
    discount: Number(data.discount) || q.discount,
    grandTotal: Number(data.grandTotal) || q.grandTotal,
    notes: data.notes !== undefined ? data.notes : q.notes,
    status: data.status || q.status,
    convertedToInvoiceId: data.convertedToInvoiceId !== undefined ? data.convertedToInvoiceId : q.convertedToInvoiceId,
  };
  await db.quotations.update(Number(id), updateData);
  await logActivity('quotation', `Updated quotation: ${q.quotationNo}`);
}

export async function deleteQuotation(id) {
  const q = await db.quotations.get(Number(id));
  if (!q) throw new Error('Quotation not found');
  await db.quotations.delete(Number(id));
  await logActivity('quotation', `Deleted quotation: ${q.quotationNo}`);
}

export async function convertQuotationToInvoice(quotationId) {
  const q = await db.quotations.get(Number(quotationId));
  if (!q) throw new Error('Quotation not found');
  if (q.status === 'converted') throw new Error('Quotation already converted to invoice');

  const invoiceNo = await getNextInvoiceNo();
  const invoiceData = {
    invoiceNo,
    date: new Date().toISOString().split('T')[0],
    customerId: q.customerId,
    customerName: q.customerName,
    customerCompany: q.customerCompany,
    customerGstin: q.customerGstin,
    customerState: q.customerState,
    customerAddress: q.customerAddress,
    customerShippingAddress: q.customerShippingAddress,
    customerStateCode: q.customerStateCode,
    items: q.items.map(({ key, ...rest }) => rest),
    subtotal: q.subtotal,
    cgst: q.cgst,
    sgst: q.sgst,
    discount: q.discount,
    grandTotal: q.grandTotal,
    notes: q.notes,
    paymentMethod: '',
    status: 'unpaid',
    transporterName: '',
    vehicleNumber: '',
    dateOfSupply: '',
    placeOfSupply: '',
    modeOfTransport: '',
    lrNumber: '',
    createdAt: new Date().toISOString(),
  };
  const invoiceId = await db.invoices.add(invoiceData);
  await db.quotations.update(Number(quotationId), { status: 'converted', convertedToInvoiceId: invoiceId });
  await logActivity('quotation', `Quotation ${q.quotationNo} converted to invoice ${invoiceNo}`);
  return { invoiceId, invoiceNo };
}

// ---- Purchase / Stock Management ----

export async function recordPurchase({ productId, productName, quantity, unit, costPerUnit, totalCost, gstAmount, discount, additionalCharges, invoiceRef, paymentStatus, paymentMethod, dueDate, supplier, vendorId, date, note }) {
  const purchase = {
    productId: Number(productId),
    productName: productName || '',
    quantity: Number(quantity) || 0,
    unit: unit || 'pcs',
    costPerUnit: Number(costPerUnit) || 0,
    totalCost: Number(totalCost) || 0,
    gstAmount: Number(gstAmount) || 0,
    discount: Number(discount) || 0,
    additionalCharges: Number(additionalCharges) || 0,
    invoiceRef: invoiceRef || '',
    paymentStatus: paymentStatus || 'unpaid',
    paymentMethod: paymentMethod || '',
    dueDate: dueDate || '',
    supplier: supplier || '',
    vendorId: vendorId ? Number(vendorId) : null,
    date: date || new Date().toISOString().split('T')[0],
    note: note || '',
    createdAt: new Date().toISOString(),
  };
  const id = await db.purchases.add(purchase);

  const product = await db.products.get(Number(productId));
  if (product) {
    const currentStock = Number(product.stock) || 0;
    await db.products.update(Number(productId), {
      stock: currentStock + Number(quantity),
    });
  }

  await logActivity('purchase', `Purchased ${quantity} ${unit} of ${productName} for ₹${totalCost}`);
  return id;
}

export async function updateProductStock(productId, newStock) {
  await db.products.update(Number(productId), { stock: Math.max(0, Number(newStock)) });
}

export async function adjustProductStock(productId, adjustment, reason) {
  const product = await db.products.get(Number(productId));
  if (!product) throw new Error('Product not found');
  const currentStock = Number(product.stock) || 0;
  const newStock = Math.max(0, currentStock + Number(adjustment));
  await db.products.update(Number(productId), { stock: newStock });
  const action = adjustment > 0 ? 'added to' : 'removed from';
  await logActivity('stock', `${Math.abs(adjustment)} ${product.unit || 'pcs'} ${action} ${product.name} (${reason || 'manual adjustment'})`);
  return newStock;
}

export async function getPurchaseSummary(productId) {
  const purchases = await db.purchases.where('productId').equals(Number(productId)).toArray();
  const totalQty = purchases.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const totalCost = purchases.reduce((s, p) => s + (Number(p.totalCost) || 0), 0);
  return { totalQty, totalCost, count: purchases.length, purchases };
}

// ---- Vendor / Supplier Management ----

export async function getVendors() {
  return db.vendors.reverse().toArray();
}

export async function addVendor(data) {
  const vendor = {
    ...data,
    createdAt: new Date().toISOString(),
  };
  const id = await db.vendors.add(vendor);
  await logActivity('vendor', `Added vendor: ${data.name}`);
  return id;
}

export async function updateVendor(id, data) {
  await db.vendors.update(id, data);
  await logActivity('vendor', `Updated vendor: ${data.name}`);
}

export async function deleteVendor(id, name) {
  await db.vendors.delete(id);
  await logActivity('vendor', `Deleted vendor: ${name}`);
}

export async function getVendorPurchaseSummary(vendorId) {
  const purchases = await db.purchases.where('vendorId').equals(Number(vendorId)).toArray();
  const totalCost = purchases.reduce((s, p) => s + (Number(p.totalCost) || 0), 0);
  const totalQty = purchases.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  return { totalCost, totalQty, count: purchases.length, purchases };
}

// ---- Activity Log ----

export async function getActivityLog({ type, search, limit = 50, offset = 0 } = {}) {
  let collection = db.activity.orderBy('timestamp').reverse();
  let results = await collection.toArray();
  
  if (type) {
    results = results.filter(a => a.type === type);
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(a => a.message?.toLowerCase().includes(q));
  }
  
  return {
    items: results.slice(offset, offset + limit),
    total: results.length,
  };
}

export async function clearActivityLog() {
  await db.activity.clear();
  await logActivity('system', 'Activity log cleared');
}

// ---- Backup & Restore ----

export async function backupAllData() {
  const data = {
    customers: await db.customers.toArray(),
    products: await db.products.toArray(),
    invoices: await db.invoices.toArray(),
    payments: await db.payments?.toArray(),
    creditNotes: await db.creditNotes.toArray(),
    expenses: await db.expenses.toArray(),
    purchases: await db.purchases.toArray(),
    vendors: await db.vendors.toArray(),
    quotations: await db.quotations.toArray(),
    settings: await db.settings.toArray(),
    counters: await db.counters.toArray(),
    activity: await db.activity.toArray(),
    exportedAt: new Date().toISOString(),
  };
  return data;
}

export async function restoreAllData(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid backup data');

  await db.customers.clear();
  await db.products.clear();
  await db.invoices.clear();
  await db.payments?.clear();
  await db.creditNotes.clear();
  await db.expenses.clear();
  await db.purchases.clear();
  await db.vendors.clear();
  await db.quotations.clear();
  await db.settings.clear();
  await db.counters.clear();
  await db.activity.clear();

  const tables = ['customers', 'products', 'invoices', 'payments', 'creditNotes',
    'expenses', 'purchases', 'vendors', 'quotations', 'settings', 'counters', 'activity'];
  for (const table of tables) {
    if (data[table]?.length) {
      await db[table].bulkAdd(data[table]);
    }
  }
  await logActivity('backup', `Data restored from backup (${data.exportedAt || 'unknown date'})`);
}

export async function saveBackupRecord(record) {
  return db.backups.add({
    ...record,
    createdAt: new Date().toISOString(),
  });
}

export async function getBackupHistory() {
  return db.backups.orderBy('createdAt').reverse().toArray();
}

export async function deleteBackupRecord(id) {
  await db.backups.delete(id);
}

export default db;
