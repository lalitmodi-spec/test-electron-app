export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
    if (vals.length === headers.length && vals.some(v => v)) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = vals[idx]; });
      rows.push(row);
    }
  }
  return { headers, rows };
}

export function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { headers, rows } = parseCSV(e.target.result);
        resolve({ headers, rows, filename: file.name });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

const FIELD_MAP = {
  name: ['name', 'customer name', 'product name', 'item name', 'customer_name', 'product_name'],
  phone: ['phone', 'mobile', 'contact', 'phone number', 'telephone'],
  email: ['email', 'e-mail', 'mail', 'email address'],
  gstin: ['gstin', 'gst', 'gst no', 'gst number', 'tax id', 'gst_no'],
  address: ['address', 'billing address', 'street', 'location'],
  city: ['city', 'town'],
  state: ['state', 'province'],
  pincode: ['pincode', 'pin', 'zip', 'postal code', 'pin code'],
  companyName: ['company', 'company name', 'business', 'business name', 'firm'],
  hsn: ['hsn', 'hsn code', 'hsn/sac', 'sac', 'sac code'],
  price: ['price', 'rate', 'selling price', 'sale price', 'unit price'],
  purchasePrice: ['purchase price', 'cost price', 'buying price', 'cost'],
  stock: ['stock', 'quantity', 'qty', 'current stock', 'inventory'],
  minStock: ['min stock', 'minimum stock', 'min stock level', 'reorder level'],
  unit: ['unit', 'uom', 'measurement unit'],
  taxRate: ['tax rate', 'tax', 'gst rate', 'rate %', 'tax%', 'gst%'],
  category: ['category', 'product category', 'item category'],
};

export function mapFields(row) {
  const result = {};
  for (const [field, aliases] of Object.entries(FIELD_MAP)) {
    for (const [key, val] of Object.entries(row)) {
      const k = key.toLowerCase().trim();
      if (aliases.includes(k)) {
        result[field] = val;
        break;
      }
    }
  }
  return result;
}
