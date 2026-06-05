import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#eef2ff',
  accent: '#8b5cf6',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 8.5, fontFamily: 'Helvetica', color: COLORS.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  titleBar: {
    backgroundColor: COLORS.primary, padding: '6 20', borderRadius: 4, marginBottom: 12,
  },
  titleText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  bizName: { fontSize: 13, fontWeight: 'bold', color: COLORS.text },
  bizDetail: { fontSize: 7.5, color: COLORS.muted, marginTop: 2 },
  metaText: { fontSize: 7.5, color: COLORS.muted, marginBottom: 2 },
  metaBold: { fontSize: 7.5, fontWeight: 'bold', color: COLORS.primary, marginBottom: 2 },
  divider: { borderBottomColor: COLORS.border, borderBottomWidth: 1, marginVertical: 8 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', color: COLORS.text, marginBottom: 3 },
  addrText: { fontSize: 7.5, color: COLORS.muted, lineHeight: 1.4 },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.primary,
    padding: '5 6', borderTopLeftRadius: 3, borderTopRightRadius: 3,
  },
  tableHeaderCell: { color: COLORS.white, fontSize: 7, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: '4 6', borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tableRowAlt: { backgroundColor: COLORS.primaryLight },
  tableCell: { fontSize: 7.5, color: COLORS.text },
  totals: { marginTop: 8, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginBottom: 3 },
  totalLabel: { fontSize: 8, color: COLORS.muted },
  totalValue: { fontSize: 8, color: COLORS.text },
  grandTotalRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1.5, borderTopColor: COLORS.primary },
  grandTotalLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  grandTotalValue: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  words: { fontSize: 7.5, color: COLORS.muted, marginTop: 6 },
  bankSection: { flexDirection: 'row', marginTop: 10, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  bankText: { fontSize: 7, color: COLORS.muted },
  signature: { alignItems: 'flex-end', marginTop: 16 },
  sigText: { fontSize: 9, fontWeight: 'bold', color: COLORS.text },
  sigSub: { fontSize: 7.5, color: COLORS.muted, marginTop: 14 },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, textAlign: 'center', fontSize: 6.5, color: '#cbd5e1' },
  transportBox: {
    marginTop: 6, padding: 6, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 3,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  transportItem: { width: '33%', fontSize: 7, color: COLORS.muted, marginBottom: 2 },
  transportLabel: { fontWeight: 'bold', color: COLORS.text },
  logo: { width: 55, height: 30, objectFit: 'contain' },
});

function TableCell({ children, width, style, align }) {
  return (
    <View style={[{ width: width || 'auto' }, style, align === 'right' && { alignItems: 'flex-end' }, align === 'center' && { alignItems: 'center' }]}>
      <Text style={styles.tableCell}>{children}</Text>
    </View>
  );
}

function HeaderCell({ children, width, align }) {
  return (
    <View style={[{ width: width || 'auto' }, align === 'right' && { alignItems: 'flex-end' }, align === 'center' && { alignItems: 'center' }]}>
      <Text style={styles.tableHeaderCell}>{children}</Text>
    </View>
  );
}

export default function ProfessionalTemplate({ invoice, settings, type = 'invoice' }) {
  const biz = settings || {};
  const inv = invoice || {};
  const items = inv.items || [];
  const transport = inv.transporterName || inv.vehicleNumber;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {biz.businessLogo && (
                <Image source={biz.businessLogo} style={styles.logo} />
              )}
              <View>
                <Text style={styles.bizName}>{biz.businessName || 'Business Name'}</Text>
                {(biz.businessAddress || biz.businessPhone) && (
                  <Text style={styles.bizDetail}>
                    {biz.businessAddress ? biz.businessAddress.split('\n')[0] : ''}
                    {biz.businessPhone ? ` | ${biz.businessPhone}` : ''}
                  </Text>
                )}
                {biz.businessEmail && <Text style={styles.bizDetail}>{biz.businessEmail}</Text>}
                {biz.businessGstin && <Text style={styles.bizDetail}>GSTIN: {biz.businessGstin}</Text>}
              </View>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaBold}>{inv.invoiceNo || 'INV-001'}</Text>
            <Text style={styles.metaText}>Date: {inv.date || '-'}</Text>
            {inv.dueDate && <Text style={styles.metaText}>Due: {inv.dueDate}</Text>}
            <Text style={[styles.metaBold, { color: inv.status === 'paid' ? '#10b981' : '#ef4444' }]}>
              {(inv.status || 'unpaid').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.titleBar}>
          <Text style={styles.titleText}>{type === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            {inv.customerCompany && <Text style={[styles.addrText, { fontWeight: 'bold' }]}>{inv.customerCompany}</Text>}
            <Text style={styles.addrText}>{inv.customerName || 'Customer'}</Text>
            {inv.customerGstin && <Text style={styles.addrText}>GSTIN: {inv.customerGstin}</Text>}
            {inv.customerState && <Text style={styles.addrText}>State: {inv.customerState}{inv.customerStateCode ? ` (Code: ${inv.customerStateCode})` : ''}</Text>}
            {inv.customerAddress && inv.customerAddress.split('\n').map((l, i) => (
              <Text key={i} style={styles.addrText}>{l}</Text>
            ))}
          </View>
          {inv.customerShippingAddress && inv.customerShippingAddress !== inv.customerAddress && (
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Ship To:</Text>
              {inv.customerShippingAddress.split('\n').map((l, i) => (
                <Text key={i} style={styles.addrText}>{l}</Text>
              ))}
            </View>
          )}
        </View>

        {transport && (
          <View style={styles.transportBox}>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Transporter: </Text>{inv.transporterName || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Vehicle: </Text>{inv.vehicleNumber || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Mode: </Text>{inv.modeOfTransport || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>LR No: </Text>{inv.lrNumber || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Supply Date: </Text>{inv.dateOfSupply || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Place: </Text>{inv.placeOfSupply || '-'}</Text></View>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <HeaderCell width="8%">#</HeaderCell>
            <HeaderCell width="32%">Description</HeaderCell>
            <HeaderCell width="12%">HSN/SAC</HeaderCell>
            <HeaderCell width="10%" align="center">Qty</HeaderCell>
            <HeaderCell width="13%" align="right">Rate</HeaderCell>
            <HeaderCell width="8%" align="center">Tax%</HeaderCell>
            <HeaderCell width="17%" align="right">Amount</HeaderCell>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <TableCell width="8%">{i + 1}</TableCell>
              <TableCell width="32%">{item.name || ''}</TableCell>
              <TableCell width="12%">{item.hsn || '-'}</TableCell>
              <TableCell width="10%" align="center">{item.qty}</TableCell>
              <TableCell width="13%" align="right">₹{Number(item.rate).toFixed(2)}</TableCell>
              <TableCell width="8%" align="center">{item.taxRate || 0}%</TableCell>
              <TableCell width="17%" align="right">₹{Number(item.amount).toFixed(2)}</TableCell>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₹{Number(inv.subtotal || 0).toFixed(2)}</Text>
          </View>
          {Number(inv.cgst) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST:</Text>
              <Text style={styles.totalValue}>₹{Number(inv.cgst).toFixed(2)}</Text>
            </View>
          )}
          {Number(inv.sgst) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST:</Text>
              <Text style={styles.totalValue}>₹{Number(inv.sgst).toFixed(2)}</Text>
            </View>
          )}
          {Number(inv.discount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: '#ef4444' }]}>-₹{Number(inv.discount).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>₹{Number(inv.grandTotal || 0).toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.words}>Amount in words: {numberToWords(Number(inv.grandTotal) || 0)}</Text>

        {(biz.businessBankName || biz.businessBankAccount) && (
          <View style={styles.bankSection}>
            <Text style={[styles.bankText, { fontWeight: 'bold', color: COLORS.text, marginRight: 6 }]}>Bank Details:</Text>
            <Text style={styles.bankText}>
              {biz.businessBankName ? `${biz.businessBankName}` : ''}
              {biz.businessBankAccount ? ` | A/c: ${biz.businessBankAccount}` : ''}
              {biz.businessBankIfsc ? ` | IFSC: ${biz.businessBankIfsc}` : ''}
            </Text>
          </View>
        )}

        {biz.upiQrDataUrl && (
          <View style={{ position: 'absolute', bottom: 60, right: 36, alignItems: 'center' }}>
            <Image source={biz.upiQrDataUrl} style={{ width: 60, height: 60 }} />
            <Text style={{ fontSize: 5, color: COLORS.muted, marginTop: 2 }}>Scan to Pay</Text>
          </View>
        )}

        {inv.notes && (
          <Text style={[styles.words, { marginTop: 4 }]}>Notes: {inv.notes}</Text>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { fontSize: 7.5 }]}>Terms & Conditions:</Text>
        {(biz.termsConditions || '').split('\n').map((line, i) => (
          <Text key={i} style={[styles.bankText, { marginBottom: 1 }]}>{line}</Text>
        ))}

        <View style={styles.signature}>
          <Text style={styles.sigText}>For {biz.businessName || 'Business'}</Text>
          <Text style={styles.sigSub}>Authorised Signatory</Text>
        </View>

        <Text style={styles.footer}>This is a computer-generated invoice • {biz.businessName || 'Business'}</Text>
      </Page>
    </Document>
  );
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
