import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const COLORS = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryLight: '#f0fdfa',
  accent: '#14b8a6',
  text: '#1e293b',
  muted: '#64748b',
  border: '#ccfbf1',
  white: '#ffffff',
  sidebar: '#0d9488',
};

const styles = StyleSheet.create({
  page: { padding: 0, fontSize: 8.5, fontFamily: 'Helvetica', color: COLORS.text, flexDirection: 'row' },
  sidebar: {
    width: 80, backgroundColor: COLORS.sidebar, padding: 16, paddingTop: 40,
    alignItems: 'center', minHeight: '100%',
  },
  sidebarText: { color: COLORS.white, fontSize: 7, textAlign: 'center', marginTop: 8, opacity: 0.8 },
  verticalTitle: { color: COLORS.white, fontSize: 14, fontWeight: 'bold', letterSpacing: 4, transform: 'rotate(-90)', marginTop: 100 },
  mainContent: { flex: 1, padding: 28, paddingLeft: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  bizName: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  bizDetail: { fontSize: 7.5, color: COLORS.muted, marginTop: 1, lineHeight: 1.3 },
  metaText: { fontSize: 7.5, color: COLORS.muted, marginBottom: 1 },
  metaBold: { fontSize: 8, fontWeight: 'bold', color: COLORS.primary, marginBottom: 1 },
  titleBadge: {
    backgroundColor: COLORS.primaryLight, padding: '4 14', borderRadius: 20,
    alignSelf: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  titleText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1 },
  sectionLabel: { fontSize: 7, fontWeight: 'bold', color: COLORS.primary, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 },
  addrText: { fontSize: 7.5, color: COLORS.muted, lineHeight: 1.4 },
  addrCard: {
    borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 6, padding: 8,
    backgroundColor: COLORS.primaryLight, marginBottom: 6,
  },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.primary,
    padding: '5 8', borderRadius: 6,
  },
  tableHeaderCell: { color: COLORS.white, fontSize: 7, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', padding: '4 8', borderBottomWidth: 0.3, borderBottomColor: '#e2e8f0' },
  tableCell: { fontSize: 7.5, color: COLORS.text },
  totals: { marginTop: 8, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', width: 200, justifyContent: 'space-between', marginBottom: 2 },
  totalLabel: { fontSize: 8, color: COLORS.muted },
  totalValue: { fontSize: 8, color: COLORS.text },
  grandTotalRow: {
    flexDirection: 'row', width: 200, justifyContent: 'space-between', marginTop: 4, paddingTop: 4,
    borderTopWidth: 2, borderTopColor: COLORS.primary,
  },
  grandTotalLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  grandTotalValue: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  words: { fontSize: 7.5, color: COLORS.muted, marginTop: 6 },
  bankBox: {
    marginTop: 8, padding: 8, backgroundColor: COLORS.primaryLight, borderRadius: 8,
    borderWidth: 0.5, borderColor: COLORS.border,
  },
  bankText: { fontSize: 7, color: COLORS.muted },
  bankLabel: { fontWeight: 'bold', color: COLORS.primary },
  signature: { alignItems: 'flex-end', marginTop: 18 },
  sigText: { fontSize: 9, fontWeight: 'bold', color: COLORS.primary },
  sigSub: { fontSize: 7.5, color: COLORS.muted, marginTop: 14 },
  footer: { position: 'absolute', bottom: 20, left: 108, right: 28, textAlign: 'center', fontSize: 6.5, color: '#94a3b8' },
  transportBox: {
    marginTop: 4, padding: '4 8', backgroundColor: COLORS.primaryLight, borderRadius: 4,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  transportItem: { width: '33%', fontSize: 7, color: COLORS.muted, marginBottom: 1 },
  transportLabel: { fontWeight: 'bold', color: COLORS.primary },
  logo: { width: 50, height: 28, objectFit: 'contain' },
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

export default function ModernTemplate({ invoice, settings }) {
  const biz = settings || {};
  const inv = invoice || {};
  const items = inv.items || [];
  const transport = inv.transporterName || inv.vehicleNumber;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: 'bold' }}>GST</Text>
          <Text style={styles.verticalTitle}>INVOICE</Text>
          <Text style={styles.sidebarText}>GST Compliant</Text>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
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
            <View style={styles.headerRight}>
              <Text style={[styles.metaBold, { fontSize: 9 }]}>{inv.invoiceNo || 'INV-001'}</Text>
              <Text style={styles.metaText}>Date: {inv.date || '-'}</Text>
              {inv.dueDate && <Text style={styles.metaText}>Due: {inv.dueDate}</Text>}
              <Text style={[styles.metaBold, { color: inv.status === 'paid' ? '#10b981' : '#ef4444' }]}>
                {(inv.status || 'unpaid').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.titleBadge}>
            <Text style={styles.titleText}>TAX INVOICE</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.addrCard, { flex: 1 }]}>
              <Text style={styles.sectionLabel}>Bill To</Text>
              {inv.customerCompany && <Text style={[styles.addrText, { fontWeight: 'bold' }]}>{inv.customerCompany}</Text>}
              <Text style={styles.addrText}>{inv.customerName || 'Customer'}</Text>
              {inv.customerGstin && <Text style={styles.addrText}>GSTIN: {inv.customerGstin}</Text>}
              {inv.customerState && <Text style={styles.addrText}>State: {inv.customerState}{inv.customerStateCode ? ` (${inv.customerStateCode})` : ''}</Text>}
              {inv.customerAddress && inv.customerAddress.split('\n').map((l, i) => (
                <Text key={i} style={styles.addrText}>{l}</Text>
              ))}
            </View>
            {inv.customerShippingAddress && inv.customerShippingAddress !== inv.customerAddress && (
              <View style={[styles.addrCard, { flex: 1 }]}>
                <Text style={styles.sectionLabel}>Ship To</Text>
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
              <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Supply:</Text> {inv.dateOfSupply || '-'}</Text></View>
              <View style={styles.transportItem}><Text><Text style={styles.transportLabel}>Place:</Text> {inv.placeOfSupply || '-'}</Text></View>
            </View>
          )}

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <HeaderCell width="8%">#</HeaderCell>
              <HeaderCell width="30%">Description</HeaderCell>
              <HeaderCell width="12%">HSN/SAC</HeaderCell>
              <HeaderCell width="10%" align="center">Qty</HeaderCell>
              <HeaderCell width="13%" align="right">Rate</HeaderCell>
              <HeaderCell width="10%" align="center">Tax%</HeaderCell>
              <HeaderCell width="17%" align="right">Amount</HeaderCell>
            </View>
            {items.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <TableCell width="8%">{i + 1}</TableCell>
                <TableCell width="30%">{item.name || ''}</TableCell>
                <TableCell width="12%">{item.hsn || '-'}</TableCell>
                <TableCell width="10%" align="center">{item.qty}</TableCell>
                <TableCell width="13%" align="right">₹{Number(item.rate).toFixed(2)}</TableCell>
                <TableCell width="10%" align="center">{item.taxRate || 0}%</TableCell>
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
            <View style={styles.bankBox}>
              <Text style={styles.bankText}>
                <Text style={styles.bankLabel}>Bank: </Text>
                {biz.businessBankName ? `${biz.businessBankName} | ` : ''}
                {biz.businessBankAccount ? `A/c: ${biz.businessBankAccount} | ` : ''}
                {biz.businessBankIfsc ? `IFSC: ${biz.businessBankIfsc}` : ''}
              </Text>
            </View>
          )}

          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionLabel}>Terms</Text>
            {(biz.termsConditions || '').split('\n').map((line, i) => (
              <Text key={i} style={[styles.bankText, { marginBottom: 1 }]}>{line}</Text>
            ))}
          </View>

          <View style={styles.signature}>
            <Text style={styles.sigText}>For {biz.businessName || 'Business'}</Text>
            <Text style={styles.sigSub}>Authorised Signatory</Text>
          </View>

          <Text style={styles.footer}>Computer-generated invoice • {biz.businessName || 'Business'}</Text>
        </View>
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
