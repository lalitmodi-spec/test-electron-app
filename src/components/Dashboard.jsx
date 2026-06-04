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

  const cardStyle = (color) => ({
    borderLeft: `4px solid ${color}`,
    borderRadius: 12,
    height: '100%',
  });

  const renderStatFooter = (children) => (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '2px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space align="center" size={14}>
              <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                <BarChartOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('dashboard.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{t('dashboard.subtitle')}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space wrap size={8}>
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
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#6366f1')}>
            <div className="stat-label"><DollarOutlined style={{ color: '#6366f1', marginRight: 4 }} />{t('dashboard.revenue')}</div>
            <div className="stat-value" style={{ color: '#6366f1' }}>₹{stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {renderStatFooter(
              <>
                <span style={{ color: '#52c41a' }}>● {t('dashboard.collected')}: ₹{stats.paid.toFixed(2)}</span>
                <span style={{ color: '#ff4d4f' }}>● {t('dashboard.pending')}: ₹{stats.unpaid.toFixed(2)}</span>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#52c41a')}>
            <div className="stat-label"><RiseOutlined style={{ color: '#52c41a', marginRight: 4 }} />{t('dashboard.sales')}</div>
            <div className="stat-value" style={{ color: '#52c41a' }}>₹{stats.curSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {renderStatFooter(
              prevPeriodSales > 0 ? (
                stats.curSales >= prevPeriodSales ? (
                  <span className="trend-up"><ArrowUpOutlined /> +{((stats.curSales - prevPeriodSales) / prevPeriodSales * 100).toFixed(1)}% {t('dashboard.vsPrevious')}</span>
                ) : (
                  <span className="trend-down"><ArrowDownOutlined /> {((stats.curSales - prevPeriodSales) / prevPeriodSales * 100).toFixed(1)}% {t('dashboard.vsPrevious')}</span>
                )
              ) : <span style={{ color: 'var(--text-secondary)' }}>{t('msg.noData')}</span>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#faad14')}>
            <div className="stat-label"><ClockCircleOutlined style={{ color: '#faad14', marginRight: 4 }} />{t('dashboard.pendingOverdue')}</div>
            <div className="stat-value" style={{ color: '#faad14' }}>{stats.pendingCount} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>{t('common.pending')}</span></div>
            {renderStatFooter(
              stats.overdueCount > 0 ? (
                <span style={{ color: '#ff4d4f' }}><FireOutlined /> {stats.overdueCount} {t('common.overdue')} (₹{stats.overdueAmount.toFixed(2)})</span>
              ) : (
                <span style={{ color: '#52c41a' }}>✓ {t('dashboard.noOverdue')}</span>
              )
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#722ed1')}>
            <div className="stat-label"><BarChartOutlined style={{ color: '#722ed1', marginRight: 4 }} />{t('dashboard.profit')}</div>
            <div className="stat-value" style={{ color: stats.curProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>₹{stats.curProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {renderStatFooter(
              <>
                <span style={{ color: '#faad14' }}>{t('dashboard.expenses')}: ₹{stats.curExp.toFixed(2)}</span>
                <span style={{ color: 'var(--text-primary)' }}>{t('dashboard.invoices')}: {filteredInvoices.length}</span>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#13c2c2')}>
            <div className="stat-label"><ShoppingCartOutlined style={{ color: '#13c2c2', marginRight: 4 }} />{t('dashboard.totalPurchases')}</div>
            <div className="stat-value" style={{ color: '#13c2c2' }}>₹{purchaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {renderStatFooter(
              <>
                <span style={{ color: 'var(--text-secondary)' }}>{purchaseQty} {t('dashboard.unitsPurchased')}</span>
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/purchases')}>
                  {t('common.view')} <ArrowRightOutlined />
                </Button>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#eb2f96')}>
            <div className="stat-label"><ShoppingOutlined style={{ color: '#eb2f96', marginRight: 4 }} />{t('dashboard.inventoryValue')}</div>
            <div className="stat-value" style={{ color: '#eb2f96' }}>₹{stockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {renderStatFooter(
              <>
                <span style={{ color: 'var(--text-secondary)' }}>{products.length} {t('dashboard.products')}</span>
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/products')}>
                  {t('common.edit')} <ArrowRightOutlined />
                </Button>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#52c41a')}>
            <div className="stat-label"><TeamOutlined style={{ color: '#52c41a', marginRight: 4 }} />{t('dashboard.customers')}</div>
            <div className="stat-value" style={{ color: '#52c41a' }}>{customers.length}</div>
            {renderStatFooter(
              <span style={{ color: 'var(--text-secondary)' }}>{stats.invoices} {t('dashboard.totalInvoices')}</span>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={cardStyle('#fa8c16')}>
            <div className="stat-label"><WalletOutlined style={{ color: '#fa8c16', marginRight: 4 }} />{t('dashboard.totalExpenses')}</div>
            <div className="stat-value" style={{ color: '#fa8c16' }}>₹{stats.expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {renderStatFooter(
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/expenses')}>
                {t('common.view')} <ArrowRightOutlined />
              </Button>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={16}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '20px 20px' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 28, height: 28, borderRadius: 6 }}>
                  <BarChartOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('dashboard.salesVsExpenses')}</span>
              </Space>
            }
            extra={
              <Space size={4}>
                <CalendarOutlined style={{ color: 'var(--text-secondary)' }} />
                <Text type="secondary" style={{ fontSize: 11 }}>{range.start} - {range.end}</Text>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barGap={4} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <ReTooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    background: 'var(--bg-card)',
                  }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} name={t('common.sales')} maxBarSize={40} />
                <Bar dataKey="expenses" fill="#faad14" radius={[6, 6, 0, 0]} name={t('common.expenses')} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '16px 16px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 38px)' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #52c41a, #73d13d)', width: 28, height: 28, borderRadius: 6 }}>
                  <PieChartOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('dashboard.payments')}</span>
              </Space>
            }
          >
            {filteredInvoices.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '20px 0' }}>{t('msg.noData')}</Text>
            ) : (
              <>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={4}>
                        {paymentPie.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[i % 3]} />)}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 11, marginTop: 8, flexWrap: 'wrap' }}>
                  {paymentPie.map((e, i) => e.value > 0 && (
                    <span key={e.name}>
                      <span style={{ color: PIE_COLORS[i], fontWeight: 700 }}>●</span> {e.name}: {e.value}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '16px 16px' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', width: 28, height: 28, borderRadius: 6 }}>
                  <TeamOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('dashboard.topCustomers')}</span>
              </Space>
            }
          >
            {stats.topCustomers?.length > 0 ? (
              <div style={{ fontSize: 12 }}>
                {stats.topCustomers.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0',
                    borderBottom: i < stats.topCustomers.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}>
                    <Space size={8}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: i === 0 ? '#faad14' : i === 1 ? '#e8e8e8' : i === 2 ? '#cd7f32' : 'var(--border-color)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: i <= 2 ? '#fff' : 'var(--text-secondary)'
                      }}>{i + 1}</span>
                      <Text ellipsis style={{ maxWidth: 80 }}>{c.name === 'Walk-in' ? t('msg.walkIn') : c.name}</Text>
                    </Space>
                    <Text strong style={{ fontSize: 13 }}>₹{c.amount.toFixed(0)}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '30px 0' }}>{t('dashboard.noSalesYet')}</Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: 0 } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 28, height: 28, borderRadius: 6 }}>
                  <FileTextOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('dashboard.recentInvoices')}</span>
              </Space>
            }
            extra={<Button type="link" size="small" onClick={() => navigate('/invoices')}>{t('dashboard.viewAll')} <ArrowRightOutlined /></Button>}
          >
            <Table
              dataSource={filteredInvoices.slice(0, 5)}
              columns={invoiceColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: t('dashboard.noInvoicesPeriod') }}
              style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '18px 20px' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #13c2c2, #36cfc9)', width: 28, height: 28, borderRadius: 6 }}>
                  <CalendarOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('dashboard.businessSnapshot')}</span>
              </Space>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: t('dashboard.totalInvoices'), value: stats.invoices, color: null },
                { label: t('dashboard.totalCustomers'), value: stats.customers, color: null },
                { label: t('dashboard.totalVendors'), value: vendors.length, color: null },
                { label: t('dashboard.totalExpenses'), value: `₹${stats.expenseTotal.toFixed(2)}`, color: '#faad14' },
                { label: t('dashboard.todaySales'), value: `₹${stats.todaySales.toFixed(2)} (${stats.todayCount})`, color: '#52c41a' },
                { label: t('dashboard.products'), value: products.length, color: null },
                { label: t('dashboard.purchases'), value: purchases.length, color: null },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0',
                  borderBottom: i < 6 ? '1px solid var(--border-color)' : 'none'
                }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                  <Text strong style={{ fontSize: 13, color: item.color || 'var(--text-primary)' }}>{item.value}</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          {lowStock.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={
                <Space>
                  <span style={{ fontWeight: 600 }}>{t('dashboard.lowStockAlert')}</span>
                  <Tag color="warning" style={{ borderRadius: 10 }}>{lowStock.length}</Tag>
                </Space>
              }
              description={
                <div style={{ marginTop: 4 }}>
                  {lowStock.slice(0, 4).map(p => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', fontSize: 12,
                      borderBottom: '1px solid rgba(250,173,20,0.15)'
                    }}>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      <Text type="danger">
                        {t('product.stock')}: {Number(p.stock) || 0} / {t('product.minStock')}: {Number(p.minStock) || 0}
                      </Text>
                    </div>
                  ))}
                  {lowStock.length > 4 && (
                    <Button type="link" size="small" style={{ padding: '4px 0' }} onClick={() => navigate('/products')}>
                      {t('dashboard.viewAll')} {lowStock.length}
                    </Button>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <Button size="small" icon={<ShoppingCartOutlined />} onClick={() => navigate('/purchases')}>
                      {t('purchase.recordPurchase')}
                    </Button>
                  </div>
                </div>
              }
              style={{ borderRadius: 12, border: 'none' }}
            />
          ) : products.length > 0 ? (
            <Card
              className="chart-card"
              size="small"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <Space>
                  <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #52c41a, #73d13d)', width: 28, height: 28, borderRadius: 6 }}>
                    <ShoppingOutlined style={{ color: '#fff', fontSize: 14 }} />
                  </div>
                  <span style={{ fontWeight: 600 }}>{t('dashboard.stockStatus')}</span>
                </Space>
              }
            >
              {(() => {
                const inStock = products.filter(p => (Number(p.stock) || 0) > 0).length;
                const outOfStock = products.filter(p => (Number(p.stock) || 0) === 0).length;
                const pct = products.length > 0 ? Math.round((inStock / products.length) * 100) : 0;
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <Text type="secondary">{t('product.inStock')}</Text>
                      <Text strong style={{ color: '#52c41a' }}>{inStock}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <Text type="secondary">{t('product.outOfStock')}</Text>
                      <Text strong style={{ color: outOfStock > 0 ? '#ff4d4f' : '#52c41a' }}>{outOfStock}</Text>
                    </div>
                    <Progress
                      percent={pct}
                      size="small"
                      strokeColor="#52c41a"
                      trailColor="rgba(255,255,255,0.08)"
                      style={{ margin: '8px 0 4px' }}
                    />
                    <Button type="link" size="small" style={{ padding: 0, marginTop: 4 }} onClick={() => navigate('/products')}>
                      {t('product.editTitle')} <ArrowRightOutlined />
                    </Button>
                  </div>
                );
              })()}
            </Card>
          ) : (
            <Card
              className="chart-card"
              size="small"
              styles={{ body: { padding: '18px 20px' } }}
              title={
                <Space>
                  <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 28, height: 28, borderRadius: 6 }}>
                    <HistoryOutlined style={{ color: '#fff', fontSize: 14 }} />
                  </div>
                  <span style={{ fontWeight: 600 }}>{t('dashboard.recentActivity')}</span>
                </Space>
              }
              extra={<Button type="link" size="small" onClick={() => navigate('/activity')}>{t('dashboard.viewAll')} <ArrowRightOutlined /></Button>}
            >
              <List
                dataSource={activity.slice(0, 6)}
                renderItem={(a) => (
                  <List.Item style={{ padding: '5px 0' }}>
                    <div>
                      <Text style={{ fontSize: 12 }}>{a.message}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 10 }}>{new Date(a.timestamp).toLocaleString()}</Text>
                      </div>
                    </div>
                  </List.Item>
                )}
                locale={{ emptyText: <Text type="secondary">{t('msg.noData')}</Text> }}
                size="small"
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
