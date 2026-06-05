import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#eff6ff',
  accent: '#3b82f6',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 8.5, fontFamily: 'Helvetica', color: COLORS.text },
  headerBar: { backgroundColor: COLORS.primary, marginHorizontal: -36, marginTop: -36, paddingVertical: 6, marginBottom: 16 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 36 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  titleText: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  titleSub: { color: COLORS.white, fontSize: 7, textAlign: 'center', opacity: 0.8 },
  bizName: { fontSize: 12, fontWeight: 'bold', color: COLORS.text },
  bizDetail: { fontSize: 7.5, color: COLORS.muted, marginTop: 2 },
  metaText: { fontSize: 7.5, color: COLORS.muted, marginBottom: 2 },
  metaBold: { fontSize: 7.5, fontWeight: 'bold', color: COLORS.white, marginBottom: 2 },
  divider: { borderBottomColor: COLORS.primary, borderBottomWidth: 2, marginVertical: 6 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', color: COLORS.text, marginBottom: 3, textTransform: 'uppercase' },
  addrText: { fontSize: 7.5, color: COLORS.muted, lineHeight: 1.4 },
  addrBorder: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 3, padding: 8, marginBottom: 6,
  },
  table: { marginTop: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.primary,
    padding: '5 6',
  },
  tableHeaderCell: { color: COLORS.white, fontSize: 7, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: '4 6', borderBottomWidth: 0.3, borderBottomColor: COLORS.border },
  tableRowLast: { borderBottomWidth: 0 },
  tableCell: { fontSize: 7.5, color: COLORS.text },
  totals: { marginTop: 8, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginBottom: 3 },
  totalLabel: { fontSize: 8, color: COLORS.muted },
  totalValue: { fontSize: 8, color: COLORS.text },
  grandTotalRow: {
    flexDirection: 'row', width: 200, justifyContent: 'space-between', marginTop: 4, paddingTop: 4,
    borderTopWidth: 2, borderTopColor: COLORS.primary, backgroundColor: COLORS.primaryLight, padding: '4 6',
    borderRadius: 3,
  },
  grandTotalLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary },
  grandTotalValue: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary },
  words: { fontSize: 7.5, color: COLORS.muted, marginTop: 6 },
  bankSection: { marginTop: 8, padding: 6, backgroundColor: COLORS.primaryLight, borderRadius: 3 },
  bankText: { fontSize: 7, color: COLORS.muted },
  bankLabel: { fontWeight: 'bold', color: COLORS.text },
  signature: { alignItems: 'flex-end', marginTop: 20 },
  sigText: { fontSize: 9, fontWeight: 'bold', color: COLORS.text },
  sigSub: { fontSize: 7.5, color: COLORS.muted, marginTop: 16 },
  footer: { position: 'absolute', bottom: 20, left: 36, right: 36, textAlign: 'center', fontSize: 6.5, color: '#94a3b8' },
  transportBox: {
    marginTop: 4, padding: '4 6', backgroundColor: '#f8fafc', borderRadius: 3,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  transportItem: { width: '33%', fontSize: 7, color: COLORS.muted, marginBottom: 1 },
  transportLabel: { fontWeight: 'bold', color: COLORS.text },
  logo: { width: 50, height: 28, objectFit: 'contain' },
});

export default function ClassicTemplate({ invoice, settings, type = 'invoice' }) {
  const biz = settings || {};
  const inv = invoice || {};
  const items = inv.items || [];
  const transport = inv.transporterName || inv.vehicleNumber;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <Text style={styles.titleText}>{type === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}</Text>
          <Text style={styles.titleSub}>{type === 'quotation' ? 'Price Estimate' : 'GST Compliant Invoice'}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            {biz.businessLogo && <Image source={biz.businessLogo} style={styles.logo} />}
            <View>
              <Text style={styles.bizName}>{biz.businessName || 'Business Name'}</Text>
              {biz.businessAddress && biz.businessAddress.split('\n').map((l, i) => (
                <Text key={i} style={styles.bizDetail}>{l}</Text>
              ))}
              <Text style={styles.bizDetail}>{biz.businessPhone}{biz.businessEmail ? ` | ${biz.businessEmail}` : ''}</Text>
              {biz.businessGstin && <Text style={styles.bizDetail}>GSTIN: {biz.businessGstin}</Text>}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.metaBold, { color: COLORS.text, fontSize: 8 }]}>#{inv.invoiceNo || 'INV-001'}</Text>
            <Text style={styles.metaText}>Date: {inv.date || '-'}</Text>
            {inv.dueDate && <Text style={styles.metaText}>Due: {inv.dueDate}</Text>}
            <Text style={[styles.metaBold, { color: inv.status === 'paid' ? '#10b981' : '#ef4444', fontSize: 7 }]}>
              {(inv.status || 'unpaid').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={[styles.addrBorder, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            {inv.customerCompany && <Text style={[styles.addrText, { fontWeight: 'bold' }]}>{inv.customerCompany}</Text>}
            <Text style={styles.addrText}>{inv.customerName || 'Customer'}</Text>
            {inv.customerGstin && <Text style={styles.addrText}>GSTIN: {inv.customerGstin}</Text>}
            {inv.customerState && <Text style={styles.addrText}>State: {inv.customerState}{inv.customerStateCode ? ` (${inv.customerStateCode})` : ''}</Text>}
            {inv.customerAddress && inv.customerAddress.split('\n').map((l, i) => (
              <Text key={i} style={styles.addrText}>{l}</Text>
            ))}
          </View>
          {inv.customerShippingAddress && inv.customerShippingAddress !== inv.customerAddress && (
            <View style={[styles.addrBorder, { flex: 1 }]}>
              <Text style={styles.sectionTitle}>Ship To:</Text>
              {inv.customerShippingAddress.split('\n').map((l, i) => (
                <Text key={i} style={styles.addrText}>{l}</Text>
              ))}
            </View>
          )}
        </View>

        {transport && (
          <View style={styles.transportBox}>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Transporter:</Text> {inv.transporterName || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Vehicle:</Text> {inv.vehicleNumber || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Mode:</Text> {inv.modeOfTransport || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>LR:</Text> {inv.lrNumber || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Supply Date:</Text> {inv.dateOfSupply || '-'}</Text></View>
            <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Place:</Text> {inv.placeOfSupply || '-'}</Text></View>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '8%' }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: '32%' }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%' }]}>HSN/SAC</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: '13%', textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'center' }]}>Tax%</Text>
            <Text style={[styles.tableHeaderCell, { width: '17%', textAlign: 'right' }]}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[styles.tableRow, i === items.length - 1 && styles.tableRowLast]}>
              <Text style={[styles.tableCell, { width: '8%' }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: '32%' }]}>{item.name || ''}</Text>
              <Text style={[styles.tableCell, { width: '12%' }]}>{item.hsn || '-'}</Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{item.qty}</Text>
              <Text style={[styles.tableCell, { width: '13%', textAlign: 'right' }]}>₹{Number(item.rate).toFixed(2)}</Text>
              <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>{item.taxRate || 0}%</Text>
              <Text style={[styles.tableCell, { width: '17%', textAlign: 'right' }]}>₹{Number(item.amount).toFixed(2)}</Text>
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
            <Text style={[styles.bankText, { marginBottom: 2 }]}>
              <Text style={styles.bankLabel}>Bank Details: </Text>
              {biz.businessBankName ? `${biz.businessBankName} | ` : ''}
              {biz.businessBankAccount ? `A/c: ${biz.businessBankAccount} | ` : ''}
              {biz.businessBankIfsc ? `IFSC: ${biz.businessBankIfsc}` : ''}
            </Text>
          </View>
        )}

        {biz.upiQrDataUrl && (
          <View style={{ position: 'absolute', bottom: 60, right: 36, alignItems: 'center' }}>
            <Image source={biz.upiQrDataUrl} style={{ width: 60, height: 60 }} />
            <Text style={{ fontSize: 5, color: COLORS.muted, marginTop: 2 }}>Scan to Pay</Text>
          </View>
        )}

        <View style={{ marginTop: 8 }}>
          <Text style={[styles.sectionTitle, { fontSize: 7.5 }]}>Terms & Conditions:</Text>
          {(biz.termsConditions || '').split('\n').map((line, i) => (
            <Text key={i} style={[styles.bankText, { marginBottom: 1 }]}>{line}</Text>
          ))}
        </View>

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
