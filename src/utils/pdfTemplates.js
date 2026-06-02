import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const COLORS = {
  modern: { primary: [99, 102, 241], light: [238, 242, 255], accent: [139, 92, 246], text: [30, 41, 59], muted: [100, 116, 139] },
  classic: { primary: [41, 128, 185], light: [235, 248, 255], accent: [31, 98, 145], text: [44, 62, 80], muted: [127, 140, 141] },
  minimal: { primary: [30, 41, 59], light: [248, 250, 252], accent: [100, 116, 139], text: [30, 41, 59], muted: [148, 163, 184] },
};

export function generatePDF(invoiceData, settings, template = 'modern') {
  const biz = {
    name: settings.businessName || 'Business Name',
    address: settings.businessAddress || '',
    phone: settings.businessPhone || '',
    email: settings.businessEmail || '',
    gstin: settings.businessGstin || '',
    logo: settings.businessLogo || '',
    bankName: settings.businessBankName || '',
    bankAccount: settings.businessBankAccount || '',
    bankIfsc: settings.businessBankIfsc || '',
  };

  const cus = {
    name: invoiceData.customerName || 'Customer',
    company: invoiceData.customerCompany || '',
    gstin: invoiceData.customerGstin || '',
    state: invoiceData.customerState || '',
    stateCode: invoiceData.customerStateCode || '',
    address: invoiceData.customerAddress || '',
    shippingAddress: invoiceData.customerShippingAddress || '',
  };

  const transport = {
    name: invoiceData.transporterName || '',
    vehicle: invoiceData.vehicleNumber || '',
    lr: invoiceData.lrNumber || '',
    mode: invoiceData.modeOfTransport || '',
    place: invoiceData.placeOfSupply || '',
    dateOfSupply: invoiceData.dateOfSupply || '',
  };

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const colors = COLORS[template] || COLORS.modern;

  const drawer = getDrawer(doc, pw, biz, cus, invoiceData, transport, settings, colors);

  switch (template) {
    case 'modern': return drawer('modern');
    case 'classic': return drawer('classic');
    case 'minimal': return drawer('minimal');
    default: return drawer('modern');
  }
}

function getDrawer(doc, pw, biz, cus, inv, transport, settings, colors) {
  return function draw(template) {
    let y = 14;
    const rightX = pw - 14;
    const col1X = rightX - 55;
    const logoMaxH = 28;
    const logoMaxW = 50;

    const [pr, pg, pb] = colors.primary;
    const [mr, mg, mb] = colors.muted;

    // ── Header ──
    if (template === 'modern') {
      doc.setFillColor(...colors.light);
      doc.rect(0, 0, pw, template === 'classic' ? 8 : 48, 'F');
    }
    if (template === 'classic') {
      doc.setFillColor(pr, pg, pb);
      doc.rect(0, 0, pw, 8, 'F');
    }

    // Logo + Business Info
    let leftStart = 14;
    if (biz.logo) {
      try {
        const logoY = template === 'minimal' ? 14 : 14;
        doc.addImage(biz.logo, 'JPEG', leftStart, logoY, logoMaxW, logoMaxH);
        leftStart += logoMaxW + 8;
        y = Math.max(y, logoY + logoMaxH + 4);
      } catch {
        doc.addImage(biz.logo, 'PNG', leftStart, 14, logoMaxW, logoMaxH);
        leftStart += logoMaxW + 8;
        y = Math.max(y, 14 + logoMaxH + 4);
      }
    }

    doc.setFontSize(template === 'minimal' ? 14 : 12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...colors.text);
    doc.text(biz.name, leftStart, y + 2);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.muted);
    biz.address && doc.text(biz.address, leftStart, y);
    y += 4;
    doc.text(`Phone: ${biz.phone}${biz.email ? ` | Email: ${biz.email}` : ''}`, leftStart, y);
    y += 4;
    if (biz.gstin) { doc.text(`GSTIN: ${biz.gstin}`, leftStart, y); y += 4; }

    // Title + Meta (Right Side)
    const metaX = pw - 14;
    let metaY = template === 'minimal' ? 22 : 16;

    if (template === 'modern') {
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(pr, pg, pb);
      doc.text('TAX INVOICE', pw / 2, 18, { align: 'center' });
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.5);
      doc.line(14, 22, pw - 14, 22);
    }
    if (template === 'classic') {
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(pr, pg, pb);
      doc.text('INVOICE', pw / 2, 20, { align: 'center' });
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.3);
      doc.line(14, 24, pw - 14, 24);
      metaY = 28;
    }
    if (template === 'minimal') {
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(pr, pg, pb);
      doc.text('INVOICE', 14, y + 2);
      y += 4;
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(0.5);
      doc.line(14, y, 80, y);
      y += 6;
      metaY = y - 4;
    }

    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...colors.muted);
    doc.text(`# ${inv.invoiceNo}`, metaX, metaY, { align: 'right' });
    metaY += 4.5;
    doc.text(`Date: ${inv.date}`, metaX, metaY, { align: 'right' });
    metaY += 4.5;
    if (inv.dueDate) { doc.text(`Due: ${inv.dueDate}`, metaX, metaY, { align: 'right' }); metaY += 4.5; }
    doc.setFont(undefined, 'bold');
    doc.setTextColor(pr, pg, pb);
    doc.text(`Status: ${(inv.status || 'unpaid').toUpperCase()}`, metaX, metaY, { align: 'right' });
    doc.setFont(undefined, 'normal');

    // Divider line
    const divY = Math.max(y + 4, template === 'minimal' ? y : 50);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, divY, pw - 14, divY);

    // ── Bill To / Ship To ──
    let sy = divY + 5;
    const colW = (pw - 42) / 2;

    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...colors.text);
    doc.text('Bill To:', 14, sy);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.muted);
    sy += 4;
    cus.company ? doc.text(cus.company, 14, sy) : doc.text(cus.name, 14, sy);
    sy += 3.5;
    doc.text(cus.name, 14, sy);
    sy += 3.5;
    if (cus.gstin) { doc.text(`GSTIN: ${cus.gstin}`, 14, sy); sy += 3.5; }
    if (cus.state) { doc.text(`State: ${cus.state}${cus.stateCode ? ` (Code: ${cus.stateCode})` : ''}`, 14, sy); sy += 3.5; }
    if (cus.address) {
      const addrLines = cus.address.split('\n');
      addrLines.forEach(line => { doc.text(line, 14, sy); sy += 3.5; });
    }

    // Shipping Address
    if (cus.shippingAddress && cus.shippingAddress !== cus.address) {
      const shipY = divY + 5;
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...colors.text);
      doc.text('Ship To:', pw / 2 + 4, shipY);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...colors.muted);
      let sY = shipY + 4;
      const sLines = cus.shippingAddress.split('\n');
      sLines.forEach(line => { doc.text(line, pw / 2 + 4, sY); sY += 3.5; });
      sy = Math.max(sy, sY);
    }

    // ── Transport Details ──
    if (transport.name || transport.vehicle || transport.place) {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(14, sy + 1, pw - 14, sy + 1);
      sy += 4;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.text);
      doc.text('Transport Details:', 14, sy);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...colors.muted);
      sy += 3.5;
      const parts = [];
      if (transport.name) parts.push(`Transporter: ${transport.name}`);
      if (transport.vehicle) parts.push(`Vehicle: ${transport.vehicle}`);
      if (transport.mode) parts.push(`Mode: ${transport.mode}`);
      if (transport.lr) parts.push(`LR No: ${transport.lr}`);
      if (transport.dateOfSupply) parts.push(`Supply Date: ${transport.dateOfSupply}`);
      if (transport.place) parts.push(`Place: ${transport.place}`);
      doc.text(parts.join(' | '), 14, sy);
      sy += 4;
    }

    const tblY = sy + 4;

    // ── Items Table ──
    const head = ['#', template === 'minimal' ? 'Description' : 'Description', ...(template === 'minimal' ? [] : ['HSN/SAC']), 'Qty', 'Rate', 'Tax%', 'Amount'];
    const body = (inv.items || []).map((item, i) => [
      i + 1,
      item.name?.substring(0, 40) || '',
      ...(template === 'minimal' ? [] : [item.hsn || '-']),
      item.qty,
      `₹${Number(item.rate).toFixed(2)}`,
      `${item.taxRate || 0}%`,
      `₹${Number(item.amount).toFixed(2)}`,
    ]);

    const colStyles = {
      0: { cellWidth: 10, halign: 'center' },
      ...(template === 'minimal'
        ? { 1: { cellWidth: 'auto' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        : { 2: { cellWidth: 18 }, 3: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'center' }, 6: { halign: 'right' } }
      ),
    };

    const theme = template === 'minimal' ? 'plain' : 'grid';
    const headStyles = {
      fillColor: template === 'minimal' ? false : [pr, pg, pb],
      textColor: template === 'minimal' ? [pr, pg, pb] : 255,
      fontSize: 7.5,
      fontStyle: 'bold',
    };
    const bodyStyles = { fontSize: 7.5, textColor: [...colors.text] };

    autoTable(doc, {
      startY: tblY,
      head: [head],
      body,
      theme,
      headStyles,
      bodyStyles,
      alternateRowStyles: template !== 'minimal' ? { fillColor: [...colors.light] } : {},
      columnStyles: colStyles,
      margin: { left: 14, right: 14 },
    });

    let yp = doc.lastAutoTable.finalY + 6;

    // ── Totals ──
    const subtotal = Number(inv.subtotal) || 0;
    const cgst = Number(inv.cgst) || 0;
    const sgst = Number(inv.sgst) || 0;
    const discount = Number(inv.discount) || 0;
    const grandTotal = Number(inv.grandTotal) || 0;

    doc.setFontSize(8);
    doc.setTextColor(...colors.muted);
    const lines = [
      { label: 'Subtotal:', value: `₹${subtotal.toFixed(2)}` },
      ...(cgst > 0 ? [{ label: 'CGST:', value: `₹${cgst.toFixed(2)}` }] : []),
      ...(sgst > 0 ? [{ label: 'SGST:', value: `₹${sgst.toFixed(2)}` }] : []),
      ...(discount > 0 ? [{ label: 'Discount:', value: `-₹${discount.toFixed(2)}` }] : []),
    ];
    lines.forEach(l => {
      doc.text(l.label, col1X, yp, { align: 'right' });
      doc.text(l.value, rightX, yp, { align: 'right' });
      yp += 4.5;
    });
    yp += 1;
    doc.setDrawColor(pr, pg, pb);
    doc.setLineWidth(0.5);
    doc.line(col1X - 5, yp, rightX, yp);
    yp += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(pr, pg, pb);
    doc.text('Grand Total:', col1X, yp, { align: 'right' });
    doc.text(`₹${grandTotal.toFixed(2)}`, rightX, yp, { align: 'right' });

    // ── Amount in Words ──
    yp += 7;
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...colors.muted);
    doc.text(`Amount in words: ${numberToWords(grandTotal)}`, 14, yp);

    // ── Bank Details ──
    if (biz.bankName || biz.bankAccount) {
      yp += 5;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(14, yp, pw - 14, yp);
      yp += 4;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...colors.text);
      doc.text('Bank Details:', 14, yp);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...colors.muted);
      yp += 3.5;
      const bankParts = [];
      if (biz.bankName) bankParts.push(`Bank: ${biz.bankName}`);
      if (biz.bankAccount) bankParts.push(`A/c: ${biz.bankAccount}`);
      if (biz.bankIfsc) bankParts.push(`IFSC: ${biz.bankIfsc}`);
      bankParts.length && doc.text(bankParts.join(' | '), 14, yp);
      yp += 5;
    }

    // ── Terms & Conditions ──
    yp += 2;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    doc.text('Terms & Conditions:', 14, yp);
    yp += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    (settings.termsConditions || '').split('\n').forEach(line => {
      doc.text(line, 14, yp);
      yp += 3.5;
    });

    // ── Signature ──
    const sigY = Math.max(yp + 6, doc.lastAutoTable.finalY + (biz.bankName ? 95 : 85));
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...colors.text);
    doc.text(`For ${biz.name}`, pw - 14, sigY, { align: 'right' });
    doc.text('Authorised Signatory', pw - 14, sigY + 16, { align: 'right' });

    if (template !== 'minimal') {
      doc.setFontSize(6.5);
      doc.setTextColor(180, 180, 180);
      doc.setFont(undefined, 'normal');
      doc.text('This is a computer-generated invoice', pw / 2, sigY + 30, { align: 'center' });
    }

    return doc;
  };
}

function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const fn = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + fn(n % 100) : '');
    if (n < 100000) return fn(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + fn(n % 1000) : '');
    return fn(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + fn(n % 100000) : '');
  };
  return fn(Math.round(num)) + ' Rupees Only';
}
