import { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Select, Statistic, Table, Tabs, Tag, Space, Button } from 'antd';
import { RiseOutlined, FileTextOutlined, AuditOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import db from '../db';

const { Title, Text } = Typography;
const COLORS = ['#6366f1', '#faad14', '#52c41a', '#ff4d4f', '#13c2c2', '#722ed1', '#eb2f96', '#fa8c16'];

export default function Reports() {
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('month');
  const [gstPeriod, setGstPeriod] = useState('month');
  const [data, setData] = useState({ sales: [], expenses: [], summary: {} });
  const [gstData, setGstData] = useState({ periods: [], totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTaxable: 0 });

  useEffect(() => {
    async function load() {
      const invoices = await db.invoices.toArray();
      const expenses = await db.expenses.toArray();
      const now = new Date();

      const months = period === 'month'
        ? Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          return { label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), month: d.getMonth(), year: d.getFullYear() };
        }).reverse()
        : Array.from({ length: 5 }, (_, i) => {
          const y = now.getFullYear() - i;
          return { label: `${y}`, month: -1, year: y };
        }).reverse();

      const sales = months.map(m => {
        const total = period === 'month'
          ? invoices.filter(i => { const d = new Date(i.date); return d.getMonth() === m.month && d.getFullYear() === m.year; })
          : invoices.filter(i => { const d = new Date(i.date); return d.getFullYear() === m.year; });
        return { label: m.label, amount: total.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0), count: total.length };
      });

      const exps = months.map(m => {
        const total = period === 'month'
          ? expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === m.month && d.getFullYear() === m.year; })
          : expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === m.year; });
        return { label: m.label, amount: total.reduce((s, e) => s + (Number(e.amount) || 0), 0), count: total.length };
      });

      const totalSales = sales.reduce((s, m) => s + m.amount, 0);
      const totalExpenses = exps.reduce((s, m) => s + m.amount, 0);

      const catExpenses = {};
      expenses.forEach(e => {
        catExpenses[e.category] = (catExpenses[e.category] || 0) + (Number(e.amount) || 0);
      });

      setData({ sales, expenses: exps, summary: { totalSales, totalExpenses, profit: totalSales - totalExpenses, invoiceCount: invoices.length, expenseCount: expenses.length, catExpenses } });
    }
    load();
  }, [period]);

  useEffect(() => {
    async function loadGst() {
      const invoices = await db.invoices.toArray();
      const now = new Date();

      const months = gstPeriod === 'month'
        ? Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          return { label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), month: d.getMonth(), year: d.getFullYear() };
        }).reverse()
        : Array.from({ length: 5 }, (_, i) => {
          const y = now.getFullYear() - i;
          return { label: `${y}`, month: -1, year: y };
        }).reverse();

      const periods = months.map(m => {
        const filtered = gstPeriod === 'month'
          ? invoices.filter(i => { const d = new Date(i.date); return d.getMonth() === m.month && d.getFullYear() === m.year; })
          : invoices.filter(i => { const d = new Date(i.date); return d.getFullYear() === m.year; });
        let cgst = 0, sgst = 0, taxable = 0, count = 0;
        filtered.forEach(i => {
          const c = Number(i.cgst) || 0;
          const s = Number(i.sgst) || 0;
          if (c > 0 || s > 0) {
            cgst += c;
            sgst += s;
            taxable += Number(i.subtotal) || 0;
            count++;
          }
        });
        return { label: m.label, cgst, sgst, total: cgst + sgst, taxable, count };
      });

      setGstData({
        periods,
        totalCgst: periods.reduce((s, p) => s + p.cgst, 0),
        totalSgst: periods.reduce((s, p) => s + p.sgst, 0),
        totalIgst: 0,
        totalTaxable: periods.reduce((s, p) => s + p.taxable, 0),
      });
    }
    loadGst();
  }, [gstPeriod]);

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

  function downloadOverviewCsv() {
    downloadCsv(
      `overview_${period}_${new Date().toISOString().split('T')[0]}.csv`,
      ['Period', 'Invoices', 'Sales', 'Expenses', 'Profit'],
      data.sales.map((s, i) => [s.label, s.count, s.amount.toFixed(2), (data.expenses[i]?.amount || 0).toFixed(2), (s.amount - (data.expenses[i]?.amount || 0)).toFixed(2)])
    );
  }

  function downloadGstCsv() {
    downloadCsv(
      `gst_${gstPeriod}_${new Date().toISOString().split('T')[0]}.csv`,
      ['Period', 'Invoices', 'Taxable Value', 'CGST', 'SGST', 'Total GST'],
      gstData.periods.map(p => [p.label, p.count, p.taxable.toFixed(2), p.cgst.toFixed(2), p.sgst.toFixed(2), p.total.toFixed(2)])
    );
  }

  const pieData = Object.entries(data.summary.catExpenses || {}).map(([name, value]) => ({ name, value }));

  const combined = data.sales.map((s, i) => ({
    label: s.label,
    sales: s.amount,
    expenses: data.expenses[i]?.amount || 0,
  }));

  const overviewContent = (
    <>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Overview</Title>
        </Col>
        <Col>
          <Space>
            <Button size="small" icon={<DownloadOutlined />} onClick={downloadOverviewCsv}>Download CSV</Button>
            <Select value={period} onChange={setPeriod} style={{ width: 140 }}>
              <Select.Option value="month">Monthly</Select.Option>
              <Select.Option value="year">Yearly</Select.Option>
            </Select>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Sales" value={data.summary.totalSales} precision={2} prefix="₹"
              valueStyle={{ color: '#6366f1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Expenses" value={data.summary.totalExpenses} precision={2} prefix="₹"
              valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Net Profit" value={data.summary.profit} precision={2} prefix="₹"
              valueStyle={{ color: data.summary.profit >= 0 ? '#52c41a' : '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Invoices" value={data.summary.invoiceCount} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Sales vs Expenses Trend">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={combined}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Sales" />
                <Line type="monotone" dataKey="expenses" stroke="#faad14" strokeWidth={2} dot={{ r: 4 }} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Expenses by Category">
            {pieData.length === 0 ? (
              <Text type="secondary">No expense data</Text>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Sales vs Expenses (Bar)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={combined}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} name="Sales" />
                <Bar dataKey="expenses" fill="#faad14" radius={[6, 6, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Monthly Breakdown">
            <Table
              dataSource={data.sales.slice().reverse()}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              columns={[
                { title: 'Period', dataIndex: 'label', key: 'label' },
                { title: 'Invoices', dataIndex: 'count', key: 'count', align: 'right' },
                { title: 'Sales', dataIndex: 'amount', key: 'sales', align: 'right',
                  render: (v) => `₹${v.toFixed(2)}` },
                { title: 'Expenses', dataIndex: 'amount', key: 'expenses', align: 'right',
                  render: (_, r) => {
                    const exp = data.expenses.find(e => e.label === r.label);
                    return `₹${(exp?.amount || 0).toFixed(2)}`;
                  }
                },
                {
                  title: 'Profit', key: 'profit', align: 'right',
                  render: (_, r) => {
                    const exp = data.expenses.find(e => e.label === r.label);
                    const profit = r.amount - (exp?.amount || 0);
                    return <Text style={{ color: profit >= 0 ? '#52c41a' : '#ff4d4f' }}>₹{profit.toFixed(2)}</Text>;
                  }
                },
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
          <Title level={4} style={{ margin: 0 }}>GST Summary</Title>
        </Col>
        <Col>
          <Space>
            <Button size="small" icon={<DownloadOutlined />} onClick={downloadGstCsv}>Download CSV</Button>
            <Select value={gstPeriod} onChange={setGstPeriod} style={{ width: 140 }}>
              <Select.Option value="month">Monthly</Select.Option>
              <Select.Option value="year">Yearly</Select.Option>
            </Select>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Total Taxable Value" value={gstData.totalTaxable} precision={2} prefix="₹"
              valueStyle={{ color: '#6366f1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Total CGST" value={gstData.totalCgst} precision={2} prefix="₹"
              valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Total SGST" value={gstData.totalSgst} precision={2} prefix="₹"
              valueStyle={{ color: '#13c2c2' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="Total GST" value={gstData.totalCgst + gstData.totalSgst} precision={2} prefix="₹"
              valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="CGST vs SGST">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gstData.periods}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cgst" fill="#722ed1" radius={[6, 6, 0, 0]} name="CGST" />
                <Bar dataKey="sgst" fill="#13c2c2" radius={[6, 6, 0, 0]} name="SGST" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Period-wise GST Collection">
            <Table
              dataSource={gstData.periods.slice().reverse()}
              rowKey={(_, i) => i}
              pagination={false}
              size="small"
              columns={[
                { title: 'Period', dataIndex: 'label', key: 'label' },
                { title: 'Invoices', dataIndex: 'count', key: 'count', align: 'right' },
                { title: 'Taxable Value', dataIndex: 'taxable', key: 'taxable', align: 'right',
                  render: (v) => <Text>₹{v.toFixed(2)}</Text> },
                { title: 'CGST', dataIndex: 'cgst', key: 'cgst', align: 'right',
                  render: (v) => <Text style={{ color: '#722ed1' }}>₹{v.toFixed(2)}</Text> },
                { title: 'SGST', dataIndex: 'sgst', key: 'sgst', align: 'right',
                  render: (v) => <Text style={{ color: '#13c2c2' }}>₹{v.toFixed(2)}</Text> },
                { title: 'Total GST', dataIndex: 'total', key: 'total', align: 'right',
                  render: (v) => <Text strong>₹{v.toFixed(2)}</Text> },
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
                  Total Taxable: ₹{gstData.totalTaxable.toFixed(2)} |
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
      <Card>
        <Tabs activeKey={tab} onChange={setTab} items={[
          { key: 'overview', label: <Space><RiseOutlined />Overview</Space>, children: overviewContent },
          { key: 'gst', label: <Space><AuditOutlined />GST Report</Space>, children: gstContent },
        ]} />
      </Card>
    </div>
  );
}
