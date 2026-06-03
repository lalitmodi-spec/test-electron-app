import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  primaryLight: '#eff6ff',
  accent: '#3b82f6',
  text: '#1e293b',
  muted: '#6b7280',
  border: '#dbeafe',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 7.5, fontFamily: 'Helvetica', color: COLORS.text },
  headerBar: {
    backgroundColor: COLORS.primary, marginHorizontal: -24, marginTop: -24,
    paddingVertical: 8, paddingHorizontal: 24, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { alignItems: 'flex-end' },
  titleText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  bizName: { fontSize: 11, fontWeight: 'bold', color: COLORS.white },
  bizDetail: { fontSize: 6.5, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  metaText: { fontSize: 6.5, color: 'rgba(255,255,255,0.8)', marginBottom: 1 },
  metaBold: { fontSize: 7, fontWeight: 'bold', color: COLORS.white, marginBottom: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 6.5, fontWeight: 'bold', color: COLORS.primary, marginBottom: 1, textTransform: 'uppercase' },
  addrText: { fontSize: 6.5, color: COLORS.muted, lineHeight: 1.3 },
  divider: { borderBottomColor: COLORS.border, borderBottomWidth: 0.5, marginVertical: 4 },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.primaryLight,
    padding: '3 4', borderBottomWidth: 1, borderBottomColor: COLORS.primary,
  },
  tableHeaderCell: { color: COLORS.primary, fontSize: 6, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: '2 4', borderBottomWidth: 0.3, borderBottomColor: '#e2e8f0' },
  tableCell: { fontSize: 6.5, color: COLORS.text },
  totals: { marginTop: 4, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 160, justifyContent: 'space-between', marginBottom: 1 },
  totalLabel: { fontSize: 7, color: COLORS.muted },
  totalValue: { fontSize: 7, color: COLORS.text },
  grandTotalRow: {
    flexDirection: 'row', width: 160, justifyContent: 'space-between', marginTop: 2, paddingTop: 2,
    borderTopWidth: 1.5, borderTopColor: COLORS.primary,
  },
  grandTotalLabel: { fontSize: 9, fontWeight: 'bold', color: COLORS.primary },
  grandTotalValue: { fontSize: 9, fontWeight: 'bold', color: COLORS.primary },
  words: { fontSize: 6.5, color: COLORS.muted, marginTop: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  bankText: { fontSize: 6, color: COLORS.muted, flex: 1 },
  bankLabel: { fontWeight: 'bold', color: COLORS.primary },
  signature: { alignItems: 'flex-end', flex: 1 },
  sigText: { fontSize: 7, fontWeight: 'bold', color: COLORS.primary },
  sigSub: { fontSize: 6, color: COLORS.muted, marginTop: 10 },
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, textAlign: 'center', fontSize: 5.5, color: '#94a3b8' },
  transportBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 2 },
  transportItem: { fontSize: 6, color: COLORS.muted, marginRight: 8 },
  transportLabel: { fontWeight: 'bold', color: COLORS.primary },
  logo: { width: 40, height: 22, objectFit: 'contain' },
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

export default function CompactTemplate({ invoice, settings }) {
  const biz = settings || {};
  const inv = invoice || {};
  const items = inv.items || [];
  const transport = inv.transporterName || inv.vehicleNumber;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            {biz.businessLogo && <Image source={biz.businessLogo} style={styles.logo} />}
            <View>
              <Text style={styles.bizName}>{biz.businessName || 'Business Name'}</Text>
              <Text style={styles.bizDetail}>
                {biz.businessAddress?.split('\n')[0] || ''}
                {biz.businessPhone ? ` | ${biz.businessPhone}` : ''}
              </Text>
              {biz.businessGstin && <Text style={styles.bizDetail}>GSTIN: {biz.businessGstin}</Text>}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.titleText}>TAX INVOICE</Text>
            <Text style={[styles.metaBold, { fontSize: 6 }]}>{inv.invoiceNo || 'INV-001'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Bill To</Text>
            {inv.customerCompany && <Text style={[styles.addrText, { fontWeight: 'bold' }]}>{inv.customerCompany}</Text>}
            <Text style={styles.addrText}>{inv.customerName || 'Customer'}</Text>
            {inv.customerGstin && <Text style={styles.addrText}>GSTIN: {inv.customerGstin}</Text>}
            {inv.customerState && <Text style={styles.addrText}>State: {inv.customerState}{inv.customerStateCode ? ` (${inv.customerStateCode})` : ''}</Text>}
            {inv.customerAddress && inv.customerAddress.split('\n').map((l, i) => (
              <Text key={i} style={styles.addrText}>{l}</Text>
            ))}
          </View>
          <View style={{ width: 20 }} />
          {inv.customerShippingAddress && inv.customerShippingAddress !== inv.customerAddress && (
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Ship To</Text>
              {inv.customerShippingAddress.split('\n').map((l, i) => (
                <Text key={i} style={styles.addrText}>{l}</Text>
              ))}
            </View>
          )}
          <View style={[styles.infoBox, { alignItems: 'flex-end' }]}>
            <Text style={styles.infoLabel}>Details</Text>
            <Text style={styles.addrText}>Date: {inv.date || '-'}</Text>
            {inv.dueDate && <Text style={styles.addrText}>Due: {inv.dueDate}</Text>}
            <Text style={[styles.addrText, { fontWeight: 'bold', color: inv.status === 'paid' ? '#10b981' : '#ef4444' }]}>
              {(inv.status || 'unpaid').toUpperCase()}
            </Text>
          </View>
        </View>

        {transport && (
          <View style={styles.transportBox}>
            {inv.transporterName && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Carrier:</Text> {inv.transporterName}</Text>}
            {inv.vehicleNumber && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Veh:</Text> {inv.vehicleNumber}</Text>}
            {inv.modeOfTransport && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Mode:</Text> {inv.modeOfTransport}</Text>}
            {inv.lrNumber && <Text style={styles.transportItem}><Text style={styles.transportLabel}>LR:</Text> {inv.lrNumber}</Text>}
            {inv.dateOfSupply && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Supply:</Text> {inv.dateOfSupply}</Text>}
            {inv.placeOfSupply && <Text style={styles.transportItem}><Text style={styles.transportLabel}>Place:</Text> {inv.placeOfSupply}</Text>}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <HeaderCell width="6%">#</HeaderCell>
            <HeaderCell width="34%">Description</HeaderCell>
            <HeaderCell width="13%">HSN/SAC</HeaderCell>
            <HeaderCell width="10%" align="center">Qty</HeaderCell>
            <HeaderCell width="13%" align="right">Rate</HeaderCell>
            <HeaderCell width="8%" align="center">Tax%</HeaderCell>
            <HeaderCell width="16%" align="right">Amount</HeaderCell>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <TableCell width="6%">{i + 1}</TableCell>
              <TableCell width="34%">{item.name || ''}</TableCell>
              <TableCell width="13%">{item.hsn || '-'}</TableCell>
              <TableCell width="10%" align="center">{item.qty}</TableCell>
              <TableCell width="13%" align="right">₹{Number(item.rate).toFixed(2)}</TableCell>
              <TableCell width="8%" align="center">{item.taxRate || 0}%</TableCell>
              <TableCell width="16%" align="right">₹{Number(item.amount).toFixed(2)}</TableCell>
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

        <Text style={styles.words}>In words: {numberToWords(Number(inv.grandTotal) || 0)}</Text>

        {(biz.businessBankName || biz.businessBankAccount || biz.termsConditions) && (
          <View style={styles.footerRow}>
            {(biz.businessBankName || biz.businessBankAccount) && (
              <Text style={styles.bankText}>
                <Text style={styles.bankLabel}>Bank: </Text>
                {biz.businessBankName || ''}{biz.businessBankAccount ? ` A/c: ${biz.businessBankAccount}` : ''}{biz.businessBankIfsc ? ` IFSC: ${biz.businessBankIfsc}` : ''}
              </Text>
            )}
            <View style={styles.signature}>
              <Text style={styles.sigText}>For {biz.businessName || 'Business'}</Text>
              <Text style={styles.sigSub}>Authorised Signatory</Text>
            </View>
          </View>
        )}

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
