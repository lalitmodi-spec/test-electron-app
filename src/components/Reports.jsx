import { useEffect, useState, useMemo } from 'react';
import { Card, Typography, Row, Col, Select, Statistic, Table, Tabs, Tag, Space, Button, DatePicker, Segmented } from 'antd';
import { RiseOutlined, FileTextOutlined, AuditOutlined, DownloadOutlined, BarChartOutlined, PieChartOutlined, CalendarOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import db from '../db';
import dayjs from 'dayjs';

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
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <BarChartOutlined style={{ color: '#6366f1' }} />
            <Title level={4} style={{ margin: 0 }}>Overview</Title>
          </Space>
        </Col>
        <Col>
          <Space wrap>
            <RangePicker
              size="small"
              value={dateRange}
              onChange={(dates) => setDateRange(dates || [null, null])}
              allowClear
            />
            <Segmented
              value={period}
              onChange={setPeriod}
              options={[
                { label: 'Day', value: 'day' },
                { label: 'Week', value: 'week' },
                { label: 'Month', value: 'month' },
                { label: 'Year', value: 'year' },
              ]}
            />
            <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadCsv(
              `overview_${period}_${new Date().toISOString().split('T')[0]}.csv`,
              ['Period', 'Invoices', 'Sales', 'Expenses', 'Profit'],
              data.sales.map((s, i) => [s.label, s.count, s.amount.toFixed(2), (data.expenses[i]?.amount || 0).toFixed(2), (s.amount - (data.expenses[i]?.amount || 0)).toFixed(2)])
            )}>CSV</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}><Statistic title="Total Sales" value={data.summary.totalSales} precision={2} prefix="₹" valueStyle={{ color: '#6366f1' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}><Statistic title="Total Expenses" value={data.summary.totalExpenses} precision={2} prefix="₹" valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}><Statistic title="Net Profit" value={data.summary.profit} precision={2} prefix="₹" valueStyle={{ color: data.summary.profit >= 0 ? '#52c41a' : '#ff4d4f' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #722ed1' } }}><Statistic title="Invoices" value={data.summary.invoiceCount} prefix={<FileTextOutlined />} valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title={<Space><LineChart />Sales Trend</Space>} size="small">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={combined}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#faad14" stopOpacity={0.2} /><stop offset="95%" stopColor="#faad14" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ReTooltip />
                <Legend />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#salesGrad)" strokeWidth={2} name="Sales" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="expenses" stroke="#faad14" fill="url(#expGrad)" strokeWidth={2} name="Expenses" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={<Space><PieChartOutlined />Expenses by Category</Space>} size="small">
            {pieData.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 30 }}>No expense data</Text>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<Space><BarChartOutlined />Sales vs Expenses</Space>} size="small">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={combined}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ReTooltip />
                <Legend />
                <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="expenses" fill="#faad14" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<Space><CalendarOutlined />Period Breakdown</Space>} size="small">
            <Table
              dataSource={data.sales.slice().reverse()}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              columns={[
                { title: 'Period', dataIndex: 'label', key: 'label' },
                { title: 'Invoices', dataIndex: 'count', key: 'count', align: 'right' },
                { title: 'Sales', dataIndex: 'amount', key: 'sales', align: 'right', render: (v) => `₹${v.toFixed(2)}` },
                { title: 'Expenses', dataIndex: 'amount', key: 'expenses', align: 'right', render: (_, r) => `₹${(data.expenses.find(e => e.label === r.label)?.amount || 0).toFixed(2)}` },
                { title: 'Profit', key: 'profit', align: 'right', render: (_, r) => { const e = data.expenses.find(x => x.label === r.label); const p = r.amount - (e?.amount || 0); return <Text style={{ color: p >= 0 ? '#52c41a' : '#ff4d4f' }}>₹{p.toFixed(2)}</Text>; } },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );

  const gstContent = (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <AuditOutlined style={{ color: '#722ed1' }} />
            <Title level={4} style={{ margin: 0 }}>GST Summary</Title>
          </Space>
        </Col>
        <Col>
          <Space wrap>
            <RangePicker size="small" value={gstDateRange} onChange={(dates) => setGstDateRange(dates || [null, null])} allowClear />
            <Segmented value={gstPeriod} onChange={setGstPeriod} options={[{ label: 'Monthly', value: 'month' }, { label: 'Yearly', value: 'year' }]} />
            <Button size="small" icon={<DownloadOutlined />} onClick={() => downloadCsv(
              `gst_${gstPeriod}_${new Date().toISOString().split('T')[0]}.csv`,
              ['Period', 'Invoices', 'Taxable Value', 'CGST', 'SGST', 'Total GST'],
              gstData.periods.map(p => [p.label, p.count, p.taxable.toFixed(2), p.cgst.toFixed(2), p.sgst.toFixed(2), p.total.toFixed(2)])
            )}>CSV</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}><Statistic title="Taxable Value" value={gstData.totalTaxable} precision={2} prefix="₹" valueStyle={{ color: '#6366f1' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #722ed1' } }}><Statistic title="CGST" value={gstData.totalCgst} precision={2} prefix="₹" valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #13c2c2' } }}><Statistic title="SGST" value={gstData.totalSgst} precision={2} prefix="₹" valueStyle={{ color: '#13c2c2' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}><Statistic title="Total GST" value={gstData.totalCgst + gstData.totalSgst} precision={2} prefix="₹" valueStyle={{ color: '#faad14' }} /></Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<Space><BarChartOutlined />CGST vs SGST</Space>} size="small">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gstData.periods}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ReTooltip />
                <Legend />
                <Bar dataKey="cgst" fill="#722ed1" radius={[4, 4, 0, 0]} name="CGST" />
                <Bar dataKey="sgst" fill="#13c2c2" radius={[4, 4, 0, 0]} name="SGST" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<Space><CalendarOutlined />Period-wise GST Collection</Space>} size="small">
            <Table
              dataSource={gstData.periods.slice().reverse()}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              columns={[
                { title: 'Period', dataIndex: 'label', key: 'label' },
                { title: 'Invoices', dataIndex: 'count', key: 'count', align: 'right' },
                { title: 'Taxable', dataIndex: 'taxable', key: 'taxable', align: 'right', render: (v) => <Text>₹{v.toFixed(2)}</Text> },
                { title: 'CGST', dataIndex: 'cgst', key: 'cgst', align: 'right', render: (v) => <Text style={{ color: '#722ed1' }}>₹{v.toFixed(2)}</Text> },
                { title: 'SGST', dataIndex: 'sgst', key: 'sgst', align: 'right', render: (v) => <Text style={{ color: '#13c2c2' }}>₹{v.toFixed(2)}</Text> },
                { title: 'Total GST', dataIndex: 'total', key: 'total', align: 'right', render: (v) => <Text strong>₹{v.toFixed(2)}</Text> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {gstData.periods.length > 0 && gstData.totalTaxable > 0 && (
        <Card size="small" style={{ marginTop: 16, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Space>
            <AuditOutlined style={{ color: '#6366f1', fontSize: 20 }} />
            <div>
              <Text strong>GST Filing Summary</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">
                  Period: {gstPeriods.start} to {gstPeriods.end} |
                  Taxable: ₹{gstData.totalTaxable.toFixed(2)} |
                  CGST: ₹{gstData.totalCgst.toFixed(2)} |
                  SGST: ₹{gstData.totalSgst.toFixed(2)} |
                  Net GST: ₹{(gstData.totalCgst + gstData.totalSgst).toFixed(2)}
                </Text>
              </div>
            </div>
          </Space>
        </Card>
      )}
    </>
  );

  return (
    <div>
      <Row style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Reports &amp; GST</Title>
          <Text type="secondary">Sales, expense analytics &amp; GST filing data</Text>
        </Col>
      </Row>
      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Tabs activeKey={tab} onChange={setTab} items={[
          { key: 'overview', label: <Space><RiseOutlined />Overview</Space>, children: overviewContent },
          { key: 'gst', label: <Space><AuditOutlined />GST Report</Space>, children: gstContent },
        ]} />
      </Card>
    </div>
  );
}
