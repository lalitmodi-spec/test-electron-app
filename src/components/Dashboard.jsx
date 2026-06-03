import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Tag, Button, List, Typography, Space, Alert, Segmented, Progress } from 'antd';
import {
  DollarOutlined, FileTextOutlined, WalletOutlined, RiseOutlined,
  PlusOutlined, ArrowRightOutlined, WarningOutlined, ClockCircleOutlined, FireOutlined,
  BarChartOutlined, PieChartOutlined, ArrowDownOutlined, ArrowUpOutlined,
  CalendarOutlined, TeamOutlined, ShoppingCartOutlined, ShoppingOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';
import db from '../db';

const { Text, Title } = Typography;
const PIE_COLORS = ['#52c41a', '#faad14', '#ff4d4f'];

function getPeriodRange(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const today = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  let start, end = today;
  if (period === 'today') start = today;
  else if (period === 'week') {
    const day = now.getDay();
    const mon = new Date(y, m, d - (day === 0 ? 6 : day - 1));
    start = mon.toISOString().split('T')[0];
  } else if (period === 'month') {
    start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  } else if (period === 'year') {
    start = `${y}-01-01`;
  } else {
    return { start: '2000-01-01', end: today };
  }
  return { start, end };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [period, setPeriod] = useState('month');
  const [allInvoices, setAllInvoices] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [activity, setActivity] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    Promise.all([
      db.invoices.toArray(),
      db.expenses.toArray(),
      db.customers.toArray(),
      db.products.toArray(),
      db.purchases.toArray(),
      db.vendors.toArray(),
      db.activity.orderBy('timestamp').reverse().limit(10).toArray(),
    ]).then(([inv, exp, cust, prod, pur, ven, act]) => {
      setAllInvoices(inv);
      setAllExpenses(exp);
      setCustomers(cust);
      setProducts(prod);
      setPurchases(pur);
      setVendors(ven);
      setActivity(act);
      const items = prod.filter(p => {
        const s = Number(p.stock) || 0;
        const mn = Number(p.minStock) || 0;
        return mn > 0 && s <= mn;
      });
      setLowStock(items);
    });
  }, []);

  const range = useMemo(() => getPeriodRange(period), [period]);

  const { filteredInvoices, chartData, stats, paymentPie, prevPeriodSales } = useMemo(() => {
    const fInv = allInvoices.filter(i => i.date >= range.start && i.date <= range.end);
    const fExp = allExpenses.filter(e => e.date >= range.start && e.date <= range.end);

    const totalRevenue = allInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
    const totalPaid = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
    const totalUnpaid = allInvoices.filter(i => i.status === 'unpaid' || !i.status).reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
    const expenseTotal = allExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const curSales = fInv.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
    const curExp = fExp.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const curProfit = curSales - curExp;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayInvs = allInvoices.filter(i => i.date === todayStr);
    const pendingCount = allInvoices.filter(i => i.status === 'unpaid' || i.status === 'partial').length;
    const overdue = allInvoices.filter(i => i.status !== 'paid' && i.dueDate && i.dueDate < todayStr);
    const overdueAmount = overdue.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);

    const paidCount = fInv.filter(i => i.status === 'paid').length;
    const partialCount = fInv.filter(i => i.status === 'partial').length;
    const unpaidCount = fInv.filter(i => i.status === 'unpaid' || !i.status).length;

    let cData;
    if (period === 'today' || period === 'week') {
      const dayMap = {};
      for (let i = 0; i < 7; i++) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const key = dt.toISOString().split('T')[0];
        dayMap[key] = { label: dt.toLocaleString('en', { weekday: 'short' }), sales: 0, expenses: 0, count: 0 };
      }
      fInv.forEach(i => { if (dayMap[i.date]) { dayMap[i.date].sales += Number(i.grandTotal) || 0; dayMap[i.date].count++; } });
      fExp.forEach(e => { if (dayMap[e.date]) dayMap[e.date].expenses += Number(e.amount) || 0; });
      cData = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    } else if (period === 'month') {
      const weekMap = {};
      for (let w = 1; w <= 4; w++) weekMap[w] = { label: `W${w}`, sales: 0, expenses: 0, count: 0 };
      fInv.forEach(i => {
        const day = parseInt(i.date.split('-')[2]);
        const w = Math.min(Math.ceil(day / 7), 4);
        if (weekMap[w]) { weekMap[w].sales += Number(i.grandTotal) || 0; weekMap[w].count++; }
      });
      fExp.forEach(e => {
        const day = parseInt(e.date.split('-')[2]);
        const w = Math.min(Math.ceil(day / 7), 4);
        if (weekMap[w]) weekMap[w].expenses += Number(e.amount) || 0;
      });
      cData = Object.values(weekMap);
    } else {
      const monthMap = {};
      for (let i = 0; i < 12; i++) {
        const dt = new Date();
        dt.setMonth(dt.getMonth() - i);
        const key = `${dt.getFullYear()}-${dt.getMonth()}`;
        monthMap[key] = { label: dt.toLocaleString('en', { month: 'short' }), sales: 0, expenses: 0, count: 0 };
      }
      fInv.forEach(i => {
        const key = i.date.substring(0, 7);
        const k2 = `${i.date.substring(0, 4)}-${parseInt(i.date.substring(5, 7)) - 1}`;
        if (monthMap[key]) { monthMap[key].sales += Number(i.grandTotal) || 0; monthMap[key].count++; }
        else if (monthMap[k2]) { monthMap[k2].sales += Number(i.grandTotal) || 0; monthMap[k2].count++; }
      });
      fExp.forEach(e => {
        const key = e.date.substring(0, 7);
        const k2 = `${e.date.substring(0, 4)}-${parseInt(e.date.substring(5, 7)) - 1}`;
        if (monthMap[key]) monthMap[key].expenses += Number(e.amount) || 0;
        else if (monthMap[k2]) monthMap[k2].expenses += Number(e.amount) || 0;
      });
      cData = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
    }

    const prevStart = new Date(range.start);
    const prevEnd = new Date(range.end);
    const diff = prevEnd.getTime() - prevStart.getTime();
    const pEnd = new Date(prevStart.getTime() - 1);
    const pStart = new Date(pEnd.getTime() - diff);
    const pStartStr = pStart.toISOString().split('T')[0];
    const pEndStr = pEnd.toISOString().split('T')[0];
    const prevSales = allInvoices
      .filter(i => i.date >= pStartStr && i.date <= pEndStr)
      .reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);

    const custMap = {};
    fInv.forEach(i => {
      const name = i.customerName || 'Walk-in';
      custMap[name] = (custMap[name] || 0) + (Number(i.grandTotal) || 0);
    });
    const topCustomers = Object.entries(custMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount }));

    return {
      filteredInvoices: fInv,
      chartData: cData,
      stats: {
        revenue: totalRevenue, paid: totalPaid, unpaid: totalUnpaid, expenseTotal,
        curSales, curExp, curProfit, customers: customers.length,
        invoices: allInvoices.length, pendingCount, overdueCount: overdue.length, overdueAmount,
        todaySales: todayInvs.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0),
        todayCount: todayInvs.length,
      },
      paymentPie: [
        { name: t('common.paid'), value: paidCount },
        { name: t('common.partial'), value: partialCount },
        { name: t('common.unpaid'), value: unpaidCount },
      ],
      prevPeriodSales: prevSales,
      topCustomers,
    };
  }, [allInvoices, allExpenses, customers.length, period, range, t]);

  const purchaseTotal = purchases.reduce((s, p) => s + (Number(p.totalCost) || 0), 0);
  const purchaseQty = purchases.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const stockValue = products.reduce((s, p) => s + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);

  const periodLabel = period === 'today' ? t('dashboard.today') : period === 'week' ? t('dashboard.week') : period === 'month' ? t('dashboard.month') : period === 'year' ? t('dashboard.year') : t('dashboard.all');

  const invoiceColumns = [
    { title: t('invoice.title'), dataIndex: 'invoiceNo', key: 'no', render: (t) => <Text strong>{t}</Text> },
    { title: t('invoice.customer'), dataIndex: 'customerName', key: 'cust', render: (name) => name || t('msg.walkIn') },
    { title: t('common.date'), dataIndex: 'date', key: 'date' },
    {
      title: t('common.status'), dataIndex: 'status', key: 'status',
      render: (s) => {
        const color = s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'error';
        return <Tag color={color}>{s || t('common.unpaid')}</Tag>;
      }
    },
    {
      title: t('common.amount'), dataIndex: 'grandTotal', key: 'amt', align: 'right',
      render: (v) => `₹${Number(v).toFixed(2)}`
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>{t('dashboard.title')}</Title>
          <Text type="secondary">{t('dashboard.subtitle')}</Text>
        </Col>
        <Col>
          <Space>
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { label: t('dashboard.today'), value: 'today' },
                { label: t('dashboard.week'), value: 'week' },
                { label: t('dashboard.month'), value: 'month' },
                { label: t('dashboard.year'), value: 'year' },
                { label: t('dashboard.all'), value: 'all' },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoice/new')}>
              {t('invoice.newTitle')}
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic
              title={<Space size={4}><DollarOutlined style={{ color: '#6366f1' }} />{t('dashboard.revenue')}</Space>}
              value={stats.revenue} prefix="₹" precision={2}
              valueStyle={{ color: '#6366f1', fontSize: 20 }}
            />
            <div style={{ marginTop: 6, display: 'flex', gap: 16, fontSize: 12 }}>
              <span>{t('dashboard.collected')}: <Text style={{ color: '#52c41a' }}>₹{stats.paid.toFixed(2)}</Text></span>
              <span>{t('dashboard.pending')}: <Text style={{ color: '#ff4d4f' }}>₹{stats.unpaid.toFixed(2)}</Text></span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><RiseOutlined style={{ color: '#52c41a' }} />{t('dashboard.sales')}</Space>}
              value={stats.curSales} prefix="₹" precision={2}
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
            {prevPeriodSales > 0 && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                {stats.curSales >= prevPeriodSales ? (
                <Text style={{ color: '#52c41a' }}><ArrowUpOutlined /> +{((stats.curSales - prevPeriodSales) / prevPeriodSales * 100).toFixed(1)}% {t('dashboard.vsPrevious')}</Text>
              ) : (
                <Text style={{ color: '#ff4d4f' }}><ArrowDownOutlined /> {((stats.curSales - prevPeriodSales) / prevPeriodSales * 100).toFixed(1)}% {t('dashboard.vsPrevious')}</Text>
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}>
            <Statistic
              title={<Space size={4}><ClockCircleOutlined style={{ color: '#faad14' }} />{t('dashboard.pendingOverdue')}</Space>}
              value={stats.pendingCount} suffix={t('common.pending')}
              valueStyle={{ color: '#faad14', fontSize: 20 }}
            />
            <div style={{ marginTop: 6, fontSize: 12 }}>
              {stats.overdueCount > 0 ? (
                <Text style={{ color: '#ff4d4f' }}><FireOutlined /> {stats.overdueCount} {t('common.overdue')} (₹{stats.overdueAmount.toFixed(2)})</Text>
              ) : (
                <Text style={{ color: '#52c41a' }}>{t('dashboard.noOverdue')}</Text>
              )}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #722ed1' } }}>
            <Statistic
              title={<Space size={4}><BarChartOutlined style={{ color: '#722ed1' }} />{t('dashboard.profit')}</Space>}
              value={stats.curProfit} prefix="₹" precision={2}
              valueStyle={{ color: stats.curProfit >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 20 }}
            />
            <div style={{ marginTop: 6, fontSize: 12 }}>
              <span>{t('dashboard.expenses')}: <Text style={{ color: '#faad14' }}>₹{stats.curExp.toFixed(2)}</Text></span>
              <span style={{ marginLeft: 12 }}>{t('dashboard.invoices')}: <Text>{filteredInvoices.length}</Text></span>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #13c2c2' } }}>
            <Statistic
              title={<Space size={4}><ShoppingCartOutlined style={{ color: '#13c2c2' }} />{t('dashboard.totalPurchases')}</Space>}
              value={purchaseTotal} precision={2} prefix="₹"
              valueStyle={{ color: '#13c2c2', fontSize: 20 }}
            />
            <div style={{ marginTop: 6, fontSize: 12 }}>
              <span>{purchaseQty} {t('dashboard.unitsPurchased')}</span>
              <Button type="link" size="small" style={{ padding: 0, marginLeft: 8 }} onClick={() => navigate('/purchases')}>
                {t('common.view')} <ArrowRightOutlined />
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #eb2f96' } }}>
            <Statistic
              title={<Space size={4}><ShoppingOutlined style={{ color: '#eb2f96' }} />{t('dashboard.inventoryValue')}</Space>}
              value={stockValue} precision={2} prefix="₹"
              valueStyle={{ color: '#eb2f96', fontSize: 20 }}
            />
            <div style={{ marginTop: 6, fontSize: 12 }}>
              <span>{products.length} {t('dashboard.products')}</span>
              <Button type="link" size="small" style={{ padding: 0, marginLeft: 8 }} onClick={() => navigate('/products')}>
                {t('common.edit')} <ArrowRightOutlined />
              </Button>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><TeamOutlined style={{ color: '#52c41a' }} />{t('dashboard.customers')}</Space>}
              value={customers.length}
              valueStyle={{ fontSize: 20 }}
            />
            <div style={{ marginTop: 6, fontSize: 12 }}>
              <span>{stats.invoices} {t('dashboard.totalInvoices')}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #fa8c16' } }}>
            <Statistic
              title={<Space size={4}><WalletOutlined style={{ color: '#fa8c16' }} />{t('dashboard.totalExpenses')}</Space>}
              value={stats.expenseTotal} precision={2} prefix="₹"
              valueStyle={{ color: '#fa8c16', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #eb2f96' } }}>
            <Statistic
              title={<Space size={4}><TeamOutlined style={{ color: '#eb2f96' }} />{t('dashboard.vendors')}</Space>}
              value={vendors.length}
              valueStyle={{ color: '#eb2f96', fontSize: 20 }}
            />
            <div style={{ marginTop: 6, fontSize: 12 }}>
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/vendors')}>
                {t('common.edit')} <ArrowRightOutlined />
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={16}>
          <Card
            size="small"
            styles={{ body: { padding: '16px 20px' } }}
            title={<Space><BarChartOutlined style={{ color: '#6366f1' }} />{t('dashboard.salesVsExpenses')}</Space>}
            extra={
              <Space size={4}>
                <CalendarOutlined /><Text type="secondary" style={{ fontSize: 11 }}>{range.start} to {range.end}</Text>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ReTooltip />
                <Legend />
                <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} name={t('common.sales')} />
                <Bar dataKey="expenses" fill="#faad14" radius={[4, 4, 0, 0]} name={t('common.expenses')} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }} title={<Space><PieChartOutlined style={{ color: '#52c41a' }} />{t('dashboard.payments')}</Space>}>
            {filteredInvoices.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>{t('msg.noData')}</Text>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {paymentPie.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % 3]} />)}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, marginTop: 4 }}>
              {paymentPie.map((e, i) => e.value > 0 && (
                <span key={e.name}><span style={{ color: PIE_COLORS[i], fontWeight: 700 }}>\u25CF</span> {e.name}: {e.value}</span>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }} title={<Space><TeamOutlined style={{ color: '#722ed1' }} />{t('dashboard.topCustomers')}</Space>}>
            {stats.topCustomers?.length > 0 ? (
              <div style={{ fontSize: 12 }}>
                {stats.topCustomers.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < stats.topCustomers.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <Text ellipsis style={{ maxWidth: 100 }}>{c.name === 'Walk-in' ? t('msg.walkIn') : c.name}</Text>
                    <Text strong>₹{c.amount.toFixed(0)}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>{t('dashboard.noSalesYet')}</Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <Card
            size="small"
            styles={{ body: { padding: 0 } }}
            title={<Space><FileTextOutlined style={{ color: '#6366f1' }} />{t('dashboard.recentInvoices')}</Space>}
            extra={<Button type="link" size="small" onClick={() => navigate('/invoices')}>{t('dashboard.viewAll')} <ArrowRightOutlined /></Button>}
          >
            <Table dataSource={filteredInvoices.slice(0, 5)} columns={invoiceColumns} rowKey="id"
              pagination={false} size="small" locale={{ emptyText: t('dashboard.noInvoicesPeriod') }} />
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }} title={t('dashboard.businessSnapshot')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row justify="space-between"><Text type="secondary">{t('dashboard.totalInvoices')}</Text><Text strong>{stats.invoices}</Text></Row>
              <Row justify="space-between"><Text type="secondary">{t('dashboard.totalCustomers')}</Text><Text strong>{stats.customers}</Text></Row>
              <Row justify="space-between"><Text type="secondary">{t('dashboard.totalVendors')}</Text><Text strong>{vendors.length}</Text></Row>
              <Row justify="space-between"><Text type="secondary">{t('dashboard.totalExpenses')}</Text><Text strong style={{ color: '#faad14' }}>₹{stats.expenseTotal.toFixed(2)}</Text></Row>
              <Row justify="space-between"><Text type="secondary">{t('dashboard.todaySales')}</Text><Text strong style={{ color: '#52c41a' }}>₹{stats.todaySales.toFixed(2)} ({stats.todayCount} {t('invoice.title').toLowerCase()})</Text></Row>
              <Row justify="space-between"><Text type="secondary">{t('dashboard.products')}</Text><Text strong>{products.length}</Text></Row>
              <Row justify="space-between"><Text type="secondary">{t('dashboard.purchases')}</Text><Text strong>{purchases.length}</Text></Row>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          {lowStock.length > 0 ? (
            <Alert
              type="warning" showIcon icon={<WarningOutlined />}
              message={<Text strong>{t('dashboard.lowStockAlert')} ({lowStock.length})</Text>}
              description={
                <div>
                  {lowStock.slice(0, 4).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span>{p.name}</span>
                      <Text type="danger">{t('product.stock')}: {Number(p.stock) || 0} / {t('product.minStock')}: {Number(p.minStock) || 0}</Text>
                    </div>
                  ))}
                  {lowStock.length > 4 && (
                    <Button type="link" size="small" onClick={() => navigate('/products')}>{t('dashboard.viewAll')} {lowStock.length}</Button>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <Button size="small" icon={<ShoppingCartOutlined />} onClick={() => navigate('/purchases')}>
                      {t('purchase.recordPurchase')}
                    </Button>
                  </div>
                </div>
              }
              style={{ borderRadius: 10 }}
            />
          ) : products.length > 0 ? (
            <Card size="small" styles={{ body: { padding: '16px 20px' } }} title={<Space><ShoppingOutlined style={{ color: '#52c41a' }} />{t('dashboard.stockStatus')}</Space>}>
              {(() => {
                const inStock = products.filter(p => (Number(p.stock) || 0) > 0).length;
                const outOfStock = products.filter(p => (Number(p.stock) || 0) === 0).length;
                return (
                  <div style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <Text type="secondary">{t('product.inStock')}</Text>
                      <Text strong style={{ color: '#52c41a' }}>{inStock}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <Text type="secondary">{t('product.outOfStock')}</Text>
                      <Text strong style={{ color: outOfStock > 0 ? '#ff4d4f' : '#52c41a' }}>{outOfStock}</Text>
                    </div>
                    <Progress percent={products.length > 0 ? Math.round((inStock / products.length) * 100) : 0}
                      size="small" strokeColor="#52c41a" trailColor="rgba(255,255,255,0.08)" />
                    <Button type="link" size="small" style={{ padding: 0, marginTop: 4 }} onClick={() => navigate('/products')}>
                      {t('product.editTitle')} <ArrowRightOutlined />
                    </Button>
                  </div>
                );
              })()}
            </Card>
          ) : (
            <Card size="small" styles={{ body: { padding: '16px 20px' } }}
              title={<Space><HistoryOutlined style={{ color: '#6366f1' }} />{t('dashboard.recentActivity')}</Space>}
              extra={<Button type="link" size="small" onClick={() => navigate('/activity')}>{t('dashboard.viewAll')} <ArrowRightOutlined /></Button>}>
              <List
                dataSource={activity.slice(0, 6)}
                renderItem={(a) => (
                  <List.Item style={{ padding: '4px 0' }}>
                    <Text style={{ fontSize: 12 }}>{a.message}</Text>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{new Date(a.timestamp).toLocaleString()}</Text>
                  </List.Item>
                )}
                locale={{ emptyText: <Text type="secondary">{t('msg.noData')}</Text>}}
                size="small"
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
