import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  primary: '#0f172a',
  accent: '#334155',
  muted: '#64748b',
  light: '#f8fafc',
  border: '#e2e8f0',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 8.5, fontFamily: 'Helvetica', color: COLORS.primary },
  headerLine: { borderBottomColor: COLORS.primary, borderBottomWidth: 2, marginBottom: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  titleText: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  titleSub: { fontSize: 7, color: COLORS.muted, marginTop: -2, letterSpacing: 3, textTransform: 'uppercase' },
  bizName: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  bizDetail: { fontSize: 7, color: COLORS.muted, marginTop: 1, lineHeight: 1.3 },
  metaText: { fontSize: 7, color: COLORS.muted, marginBottom: 1 },
  metaBold: { fontSize: 7, fontWeight: 'bold', color: COLORS.primary, marginBottom: 1 },
  sectionLabel: { fontSize: 7, fontWeight: 'bold', color: COLORS.accent, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 },
  addrText: { fontSize: 7.5, color: COLORS.muted, lineHeight: 1.4 },
  lightDivider: { borderBottomColor: COLORS.border, borderBottomWidth: 0.5, marginVertical: 8 },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingBottom: 4, marginBottom: 2 },
  tableHeaderCell: { color: COLORS.accent, fontSize: 6.5, fontWeight: 'bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: '3 0', borderBottomWidth: 0.3, borderBottomColor: COLORS.border },
  tableCell: { fontSize: 7.5, color: COLORS.text || COLORS.primary },
  totals: { marginTop: 8, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 180, justifyContent: 'space-between', marginBottom: 2 },
  totalLabel: { fontSize: 7.5, color: COLORS.muted },
  totalValue: { fontSize: 7.5, color: COLORS.primary },
  grandTotalRow: { flexDirection: 'row', width: 180, justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTopWidth: 1.5, borderTopColor: COLORS.primary },
  grandTotalLabel: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary },
  grandTotalValue: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary },
  words: { fontSize: 7, color: COLORS.muted, marginTop: 6 },
  bankSection: { marginTop: 8 },
  bankText: { fontSize: 6.5, color: COLORS.muted },
  signature: { alignItems: 'flex-end', marginTop: 24 },
  sigText: { fontSize: 8.5, fontWeight: 'bold', color: COLORS.primary },
  sigSub: { fontSize: 7, color: COLORS.muted, marginTop: 16 },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center', fontSize: 6, color: '#cbd5e1' },
  transportBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  transportItem: { fontSize: 6.5, color: COLORS.muted },
  transportLabel: { fontWeight: 'bold', color: COLORS.accent },
  logo: { width: 45, height: 25, objectFit: 'contain' },
});

export default function MinimalTemplate({ invoice, settings, type = 'invoice' }) {
  const biz = settings || {};
  const inv = invoice || {};
  const items = inv.items || [];
  const transport = inv.transporterName || inv.vehicleNumber;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {biz.businessLogo && <Image source={biz.businessLogo} style={styles.logo} />}
              <View>
                <Text style={styles.bizName}>{biz.businessName || 'Business Name'}</Text>
                <Text style={styles.bizDetail}>{biz.businessAddress ? biz.businessAddress.split('\n')[0] : ''}</Text>
                <Text style={styles.bizDetail}>{biz.businessPhone}{biz.businessEmail ? ` | ${biz.businessEmail}` : ''}</Text>
                {biz.businessGstin && <Text style={styles.bizDetail}>GSTIN: {biz.businessGstin}</Text>}
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.titleText}>{type === 'quotation' ? 'QUOTATION' : 'INVOICE'}</Text>
            <Text style={styles.titleSub}>{inv.invoiceNo || 'INV-001'}</Text>
          </View>
        </View>

        <View style={styles.headerLine} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.metaText}>Date: {inv.date || '-'}</Text>
            {inv.dueDate && <Text style={styles.metaText}>Due: {inv.dueDate}</Text>}
          </View>
          <Text style={[styles.metaBold, { color: inv.status === 'paid' ? '#10b981' : '#ef4444' }]}>
            {(inv.status || 'unpaid').toUpperCase()}
          </Text>
        </View>

        <View style={styles.lightDivider} />

        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Bill To</Text>
            {inv.customerCompany && <Text style={[styles.addrText, { fontWeight: 'bold' }]}>{inv.customerCompany}</Text>}
            <Text style={styles.addrText}>{inv.customerName || 'Customer'}</Text>
            {inv.customerGstin && <Text style={styles.addrText}>GSTIN: {inv.customerGstin}</Text>}
            {inv.customerAddress && inv.customerAddress.split('\n').map((l, i) => (
              <Text key={i} style={styles.addrText}>{l}</Text>
            ))}
          </View>
          {inv.customerShippingAddress && inv.customerShippingAddress !== inv.customerAddress && (
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Ship To</Text>
              {inv.customerShippingAddress.split('\n').map((l, i) => (
                <Text key={i} style={styles.addrText}>{l}</Text>
              ))}
            </View>
          )}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {inv.customerState && <Text style={styles.addrText}>State: {inv.customerState}</Text>}
            {inv.customerStateCode && <Text style={styles.addrText}>Code: {inv.customerStateCode}</Text>}
          </View>
        </View>

        {transport && (
          <View style={[styles.transportBox, { marginTop: 6 }]}>
            {inv.transporterName && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Carrier:</Text> {inv.transporterName}</Text>}
            {inv.vehicleNumber && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Veh:</Text> {inv.vehicleNumber}</Text>}
            {inv.lrNumber && <Text style={styles.transportItem}><Text style={styles.transportLabel}>LR:</Text> {inv.lrNumber}</Text>}
            {inv.dateOfSupply && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Supply:</Text> {inv.dateOfSupply}</Text>}
            {inv.placeOfSupply && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Place:</Text> {inv.placeOfSupply}</Text>}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '8%' }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Item</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Tax</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '8%' }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>{item.name || ''}{item.hsn ? ` (${item.hsn})` : ''}</Text>
              <Text style={[styles.tableCell, { width: '12%', textAlign: 'center' }]}>{item.qty}</Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>₹{Number(item.rate).toFixed(2)}</Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{item.taxRate || 0}%</Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>₹{Number(item.amount).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{Number(inv.subtotal || 0).toFixed(2)}</Text>
          </View>
          {Number(inv.cgst) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>CGST</Text>
              <Text style={styles.totalValue}>₹{Number(inv.cgst).toFixed(2)}</Text>
            </View>
          )}
          {Number(inv.sgst) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SGST</Text>
              <Text style={styles.totalValue}>₹{Number(inv.sgst).toFixed(2)}</Text>
            </View>
          )}
          {Number(inv.discount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#ef4444' }]}>-₹{Number(inv.discount).toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>₹{Number(inv.grandTotal || 0).toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.words}>In words: {numberToWords(Number(inv.grandTotal) || 0)}</Text>

        {(biz.businessBankName || biz.businessBankAccount) && (
          <View style={[styles.bankSection, styles.lightDivider, { paddingTop: 4 }]}>
            <Text style={[styles.sectionLabel, { marginBottom: 2 }]}>Payment</Text>
            <Text style={styles.bankText}>
              {biz.businessBankName ? `${biz.businessBankName}` : ''}
              {biz.businessBankAccount ? ` | A/c: ${biz.businessBankAccount}` : ''}
              {biz.businessBankIfsc ? ` | IFSC: ${biz.businessBankIfsc}` : ''}
            </Text>
          </View>
        )}

        <View style={[styles.lightDivider, { marginTop: 4 }]} />

        <Text style={[styles.sectionLabel, { marginBottom: 2 }]}>Terms</Text>
        {(biz.termsConditions || '').split('\n').map((line, i) => (
          <Text key={i} style={[styles.bankText, { marginBottom: 1 }]}>{line}</Text>
        ))}

        <View style={styles.signature}>
          <Text style={styles.sigText}>For {biz.businessName || 'Business'}</Text>
          <Text style={styles.sigSub}>Authorised Signatory</Text>
        </View>

        <Text style={styles.footer}>Computer-generated invoice • {biz.businessName || 'Business'}</Text>
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
