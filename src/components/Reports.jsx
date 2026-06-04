import { useEffect, useState, useMemo } from 'react';
import { Card, Typography, Row, Col, Select, Statistic, Table, Tabs, Tag, Space, Button, DatePicker, Segmented } from 'antd';
import { RiseOutlined, FileTextOutlined, AuditOutlined, DownloadOutlined, BarChartOutlined, PieChartOutlined, CalendarOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import db from '../db';
import dayjs from 'dayjs';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const COLORS = ['#6366f1', '#faad14', '#52c41a', '#ff4d4f', '#13c2c2', '#722ed1', '#eb2f96', '#fa8c16'];

function buildPeriods(period, startDate, endDate) {
  const s = startDate ? new Date(startDate) : new Date();
  const e = endDate ? new Date(endDate) : new Date();
  const periods = [];
  let cursor = new Date(s);

  if (period === 'day') {
    while (cursor <= e) {
      const key = cursor.toISOString().split('T')[0];
      periods.push({ label: key, key, year: cursor.getFullYear(), month: cursor.getMonth(), day: cursor.getDate(), date: key });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (period === 'week') {
    const weekMap = {};
    while (cursor <= e) {
      const weekStart = new Date(cursor);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const wk = weekStart.toISOString().split('T')[0];
      if (!weekMap[wk]) weekMap[wk] = { label: `Wk ${weekStart.toLocaleString('en', { month: 'short', day: 'numeric' })}`, key: wk, start: wk, year: cursor.getFullYear(), month: cursor.getMonth() };
      cursor.setDate(cursor.getDate() + 1);
    }
    Object.values(weekMap).forEach(w => periods.push(w));
  } else if (period === 'month') {
    const monthMap = {};
    while (cursor <= e) {
      const mk = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      if (!monthMap[mk]) monthMap[mk] = { label: cursor.toLocaleString('en', { month: 'short', year: '2-digit' }), key: mk, year: cursor.getFullYear(), month: cursor.getMonth() };
      cursor.setMonth(cursor.getMonth() + 1);
    }
    Object.values(monthMap).forEach(m => periods.push(m));
  } else {
    const yearMap = {};
    while (cursor <= e) {
      const y = cursor.getFullYear();
      if (!yearMap[y]) yearMap[y] = { label: `${y}`, key: `${y}`, year: y, month: -1 };
      cursor.setFullYear(cursor.getFullYear() + 1);
    }
    Object.values(yearMap).forEach(y => periods.push(y));
  }
  return periods;
}

function filterByPeriod(data, p, dateField = 'date') {
  if (p.month === -1) {
    return data.filter(d => {
      const dt = new Date(d[dateField]);
      return dt.getFullYear() === p.year;
    });
  }
  if (p.day !== undefined) {
    return data.filter(d => d[dateField] === p.key || d[dateField] === p.date);
  }
  return data.filter(d => {
    const dt = new Date(d[dateField]);
    return dt.getMonth() === p.month && dt.getFullYear() === p.year;
  });
}

export default function Reports() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [gstPeriod, setGstPeriod] = useState('month');
  const [dateRange, setDateRange] = useState([null, null]);
  const [gstDateRange, setGstDateRange] = useState([null, null]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [data, setData] = useState({ sales: [], expenses: [], summary: {} });
  const [gstData, setGstData] = useState({ periods: [], totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTaxable: 0 });

  useEffect(() => {
    Promise.all([db.invoices.toArray(), db.expenses.toArray()]).then(([inv, exp]) => {
      setAllInvoices(inv);
      setAllExpenses(exp);
    });
  }, []);

  const overviewPeriods = useMemo(() => {
    let s, e;
    if (dateRange[0] && dateRange[1]) {
      s = dateRange[0].toISOString().split('T')[0];
      e = dateRange[1].toISOString().split('T')[0];
    } else {
      const now = new Date();
      if (period === 'day') { s = now.toISOString().split('T')[0]; e = s; }
      else if (period === 'week') { const d = now.getDay(); const mon = new Date(now); mon.setDate(mon.getDate() - (d === 0 ? 6 : d - 1)); s = mon.toISOString().split('T')[0]; e = now.toISOString().split('T')[0]; }
      else if (period === 'month') { s = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; e = now.toISOString().split('T')[0]; }
      else { s = `${now.getFullYear()}-01-01`; e = now.toISOString().split('T')[0]; }
    }
    return { periods: buildPeriods(period, s, e), start: s, end: e };
  }, [period, dateRange]);

  const gstPeriods = useMemo(() => {
    let s, e;
    if (gstDateRange[0] && gstDateRange[1]) {
      s = gstDateRange[0].toISOString().split('T')[0];
      e = gstDateRange[1].toISOString().split('T')[0];
    } else {
      const now = new Date();
      if (gstPeriod === 'month') { s = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; e = now.toISOString().split('T')[0]; }
      else { s = `${now.getFullYear()}-01-01`; e = now.toISOString().split('T')[0]; }
    }
    return { periods: buildPeriods(gstPeriod === 'month' ? 'month' : 'year', s, e), start: s, end: e };
  }, [gstPeriod, gstDateRange]);

  useEffect(() => {
    const { periods } = overviewPeriods;
    const sales = periods.map(p => {
      const total = filterByPeriod(allInvoices, p);
      return { label: p.label, amount: total.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0), count: total.length };
    });
    const exps = periods.map(p => {
      const total = filterByPeriod(allExpenses, p);
      return { label: p.label, amount: total.reduce((s, e) => s + (Number(e.amount) || 0), 0), count: total.length };
    });
    const totalSales = sales.reduce((s, m) => s + m.amount, 0);
    const totalExpenses = exps.reduce((s, m) => s + m.amount, 0);
    const catExpenses = {};
    allExpenses.forEach(e => { catExpenses[e.category] = (catExpenses[e.category] || 0) + (Number(e.amount) || 0); });
    setData({ sales, expenses: exps, summary: { totalSales, totalExpenses, profit: totalSales - totalExpenses, invoiceCount: allInvoices.length, expenseCount: allExpenses.length, catExpenses } });
  }, [allInvoices, allExpenses, overviewPeriods]);

  useEffect(() => {
    const { periods } = gstPeriods;
    const result = periods.map(p => {
      const filtered = filterByPeriod(allInvoices, p);
      let cgst = 0, sgst = 0, taxable = 0, count = 0;
      filtered.forEach(i => {
        const c = Number(i.cgst) || 0;
        const s = Number(i.sgst) || 0;
        if (c > 0 || s > 0) { cgst += c; sgst += s; taxable += Number(i.subtotal) || 0; count++; }
      });
      return { label: p.label, cgst, sgst, total: cgst + sgst, taxable, count };
    });
    setGstData({
      periods: result,
      totalCgst: result.reduce((s, p) => s + p.cgst, 0),
      totalSgst: result.reduce((s, p) => s + p.sgst, 0),
      totalIgst: 0,
      totalTaxable: result.reduce((s, p) => s + p.taxable, 0),
    });
  }, [allInvoices, gstPeriods]);

  function csvEscape(val) {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadCsv(filename, headers, rows) {
    const csv = [headers.join(','), ...rows.map(r => r.map(csvEscape).join(','))].join('\n');
    if (window.electronAPI) {
      window.electronAPI.saveFile({ data: csv, filename, filters: [{ name: 'CSV', extensions: ['csv'] }] });
    } else {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  const pieData = Object.entries(data.summary.catExpenses || {}).map(([name, value]) => ({ name, value }));
  const combined = data.sales.map((s, i) => ({ label: s.label, sales: s.amount, expenses: data.expenses[i]?.amount || 0 }));

  const overviewContent = (
    <>
      <div className="toolbar-card">
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space size={8}>
              <RangePicker
                size="small"
                value={dateRange}
                onChange={(dates) => setDateRange(dates || [null, null])}
                allowClear
                style={{ borderRadius: 8 }}
              />
              <Segmented
                value={period}
                onChange={setPeriod}
                options={[
                  { label: t('common.daily'), value: 'day' },
                  { label: t('common.weekly'), value: 'week' },
                  { label: t('common.monthly'), value: 'month' },
                  { label: t('common.yearly'), value: 'year' },
                ]}
              />
            </Space>
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={() => downloadCsv(
              `overview_${period}_${new Date().toISOString().split('T')[0]}.csv`,
              [t('report.period'), t('common.invoice'), t('report.sales'), t('report.expenses'), t('report.profit')],
              data.sales.map((s, i) => [s.label, s.count, s.amount.toFixed(2), (data.expenses[i]?.amount || 0).toFixed(2), (s.amount - (data.expenses[i]?.amount || 0)).toFixed(2)])
            )} style={{ borderRadius: 8 }}>{t('report.downloadCsv')}</Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #6366f1', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><RiseOutlined style={{ color: '#6366f1', marginRight: 4 }} />{t('report.totalSales')}</div>
            <div className="stat-value" style={{ color: '#6366f1' }}>₹{(data.summary.totalSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #faad14', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><FileTextOutlined style={{ color: '#faad14', marginRight: 4 }} />{t('report.totalExpenses')}</div>
            <div className="stat-value" style={{ color: '#faad14' }}>₹{(data.summary.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #52c41a', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><BarChartOutlined style={{ color: '#52c41a', marginRight: 4 }} />{t('report.netProfit')}</div>
            <div className="stat-value" style={{ color: (data.summary.profit || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}>₹{(data.summary.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #722ed1', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><FileTextOutlined style={{ color: '#722ed1', marginRight: 4 }} />{t('report.invoices')}</div>
            <div className="stat-value" style={{ color: '#722ed1' }}>{data.summary.invoiceCount || 0}</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '20px 20px' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 28, height: 28, borderRadius: 6 }}>
                  <BarChartOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('report.salesTrend')}</span>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={310}>
              <AreaChart data={combined}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#faad14" stopOpacity={0.2} /><stop offset="95%" stopColor="#faad14" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--bg-card)' }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#salesGrad)" strokeWidth={2.5} name={t('report.sales')} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="expenses" stroke="#faad14" fill="url(#expGrad)" strokeWidth={2.5} name={t('report.expenses')} dot={{ r: 3, fill: '#faad14' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '20px 20px' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #52c41a, #73d13d)', width: 28, height: 28, borderRadius: 6 }}>
                  <PieChartOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('report.expensesByCategory')}</span>
              </Space>
            }
          >
            {pieData.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '40px 0' }}>{t('msg.noData')}</Text>
            ) : (
              <ResponsiveContainer width="100%" height={310}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                  </Pie>
                  <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '20px 20px' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #faad14, #ffc53d)', width: 28, height: 28, borderRadius: 6 }}>
                  <BarChartOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('report.salesVsExpenses')}</span>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={combined} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} name={t('report.sales')} maxBarSize={36} />
                <Bar dataKey="expenses" fill="#faad14" radius={[6, 6, 0, 0]} name={t('report.expenses')} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: 0 } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', width: 28, height: 28, borderRadius: 6 }}>
                  <CalendarOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('report.periodBreakdown')}</span>
              </Space>
            }
          >
            <Table
              dataSource={data.sales.slice().reverse()}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              columns={[
                { title: t('report.period'), dataIndex: 'label', key: 'label' },
                { title: t('report.invoices'), dataIndex: 'count', key: 'count', align: 'right' },
                { title: t('report.sales'), dataIndex: 'amount', key: 'sales', align: 'right', render: (v) => <Text strong>₹{v.toFixed(2)}</Text> },
                { title: t('report.expenses'), dataIndex: 'amount', key: 'expenses', align: 'right', render: (_, r) => `₹${(data.expenses.find(e => e.label === r.label)?.amount || 0).toFixed(2)}` },
                { title: t('report.profit'), key: 'profit', align: 'right', render: (_, r) => { const e = data.expenses.find(x => x.label === r.label); const p = r.amount - (e?.amount || 0); return <Text style={{ color: p >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>₹{p.toFixed(2)}</Text>; } },
              ]}
              style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden' }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const gstContent = (
    <>
      <div className="toolbar-card">
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space size={8}>
              <RangePicker size="small" value={gstDateRange} onChange={(dates) => setGstDateRange(dates || [null, null])} allowClear style={{ borderRadius: 8 }} />
              <Segmented value={gstPeriod} onChange={setGstPeriod} options={[{ label: t('common.monthly'), value: 'month' }, { label: t('common.yearly'), value: 'year' }]} />
            </Space>
          </Col>
          <Col>
            <Button icon={<DownloadOutlined />} onClick={() => downloadCsv(
              `gst_${gstPeriod}_${new Date().toISOString().split('T')[0]}.csv`,
              [t('report.period'), t('report.invoices'), t('report.taxableValue'), t('report.cgst'), t('report.sgst'), t('report.totalGst')],
              gstData.periods.map(p => [p.label, p.count, p.taxable.toFixed(2), p.cgst.toFixed(2), p.sgst.toFixed(2), p.total.toFixed(2)])
            )} style={{ borderRadius: 8 }}>{t('report.downloadCsv')}</Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #6366f1', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><AuditOutlined style={{ color: '#6366f1', marginRight: 4 }} />{t('report.taxableValue')}</div>
            <div className="stat-value" style={{ color: '#6366f1' }}>₹{(gstData.totalTaxable || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #722ed1', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><BarChartOutlined style={{ color: '#722ed1', marginRight: 4 }} />{t('report.cgst')}</div>
            <div className="stat-value" style={{ color: '#722ed1' }}>₹{(gstData.totalCgst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #13c2c2', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><BarChartOutlined style={{ color: '#13c2c2', marginRight: 4 }} />{t('report.sgst')}</div>
            <div className="stat-value" style={{ color: '#13c2c2' }}>₹{(gstData.totalSgst || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #faad14', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><AuditOutlined style={{ color: '#faad14', marginRight: 4 }} />{t('report.totalGst')}</div>
            <div className="stat-value" style={{ color: '#faad14' }}>₹{((gstData.totalCgst || 0) + (gstData.totalSgst || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={12}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: '20px 20px' } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #722ed1, #9254de)', width: 28, height: 28, borderRadius: 6 }}>
                  <BarChartOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>CGST vs SGST</span>
              </Space>
            }
          >
            <ResponsiveContainer width="100%" height={310}>
              <BarChart data={gstData.periods} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <ReTooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)' }} />
                <Legend iconType="circle" />
                <Bar dataKey="cgst" fill="#722ed1" radius={[6, 6, 0, 0]} name={t('report.cgst')} maxBarSize={36} />
                <Bar dataKey="sgst" fill="#13c2c2" radius={[6, 6, 0, 0]} name={t('report.sgst')} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            className="chart-card"
            size="small"
            styles={{ body: { padding: 0 } }}
            title={
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', width: 28, height: 28, borderRadius: 6 }}>
                  <CalendarOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t('report.gstSummary')}</span>
              </Space>
            }
          >
            <Table
              dataSource={gstData.periods.slice().reverse()}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              columns={[
                { title: t('report.period'), dataIndex: 'label', key: 'label' },
                { title: t('report.invoices'), dataIndex: 'count', key: 'count', align: 'right' },
                { title: t('report.taxableValue'), dataIndex: 'taxable', key: 'taxable', align: 'right', render: (v) => <Text>₹{v.toFixed(2)}</Text> },
                { title: t('report.cgst'), dataIndex: 'cgst', key: 'cgst', align: 'right', render: (v) => <Text style={{ color: '#722ed1', fontWeight: 600 }}>₹{v.toFixed(2)}</Text> },
                { title: t('report.sgst'), dataIndex: 'sgst', key: 'sgst', align: 'right', render: (v) => <Text style={{ color: '#13c2c2', fontWeight: 600 }}>₹{v.toFixed(2)}</Text> },
                { title: t('report.totalGst'), dataIndex: 'total', key: 'total', align: 'right', render: (v) => <Text strong>₹{v.toFixed(2)}</Text> },
              ]}
              style={{ borderRadius: '0 0 12px 12px', overflow: 'hidden' }}
            />
          </Card>
        </Col>
      </Row>

      {gstData.periods.length > 0 && (gstData.totalTaxable || 0) > 0 && (
        <Card className="summary-footer-card" size="small" style={{ marginTop: 20 }}>
          <Row align="middle" gutter={16}>
            <Col>
              <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                <AuditOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
            </Col>
            <Col flex="auto">
              <Text strong style={{ fontSize: 15 }}>{t('report.gstSummary')}</Text>
              <div style={{ marginTop: 6, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                <Text type="secondary">
                  {t('report.period')}: <Text strong>{gstPeriods.start}</Text> - <Text strong>{gstPeriods.end}</Text>
                </Text>
                <Text type="secondary">
                  {t('report.taxableValue')}: <Text strong style={{ color: '#6366f1' }}>₹{(gstData.totalTaxable || 0).toFixed(2)}</Text>
                </Text>
                <Text type="secondary">
                  CGST: <Text strong style={{ color: '#722ed1' }}>₹{(gstData.totalCgst || 0).toFixed(2)}</Text>
                </Text>
                <Text type="secondary">
                  SGST: <Text strong style={{ color: '#13c2c2' }}>₹{(gstData.totalSgst || 0).toFixed(2)}</Text>
                </Text>
                <Text type="secondary">
                  {t('report.totalGst')}: <Text strong style={{ color: '#faad14' }}>₹{((gstData.totalCgst || 0) + (gstData.totalSgst || 0)).toFixed(2)}</Text>
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}
    </>
  );

  return (
    <div style={{ padding: '2px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={[12, 12]}>
          <Col>
            <Space align="center" size={14}>
              <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                <BarChartOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('report.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{t('report.subtitle')}</Text>
              </div>
            </Space>
          </Col>
        </Row>
      </div>

      <Card
        className="report-tab-card chart-card"
        styles={{ body: { padding: '0 20px 20px 20px' } }}
        style={{ borderRadius: 12, overflow: 'hidden' }}
      >
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'overview', label: <Space><RiseOutlined />{t('report.overview')}</Space>, children: overviewContent },
            { key: 'gst', label: <Space><AuditOutlined />{t('report.gstReport')}</Space>, children: gstContent },
          ]}
        />
      </Card>
    </div>
  );
}
