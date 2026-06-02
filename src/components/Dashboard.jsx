import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Tag, Button, List, Typography, Space, Alert } from 'antd';
import {
  DollarOutlined, FileTextOutlined, WalletOutlined, RiseOutlined,
  PlusOutlined, ArrowRightOutlined, WarningOutlined, ClockCircleOutlined, FireOutlined
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import db from '../db';

const { Text, Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ invoices: 0, customers: 0, expenseTotal: 0, revenue: 0, paid: 0, unpaid: 0, todaySales: 0, todayCount: 0, pendingCount: 0, overdueCount: 0, overdueAmount: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [monthlyData, setMonthlyData] = useState({ sales: 0, expense: 0, profit: 0 });
  const [lowStock, setLowStock] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function load() {
      const [invoices, customers, expenses, products, activityLog] = await Promise.all([
        db.invoices.toArray(),
        db.customers.toArray(),
        db.expenses.toArray(),
        db.products.toArray(),
        db.activity.orderBy('timestamp').reverse().limit(10).toArray(),
      ]);

      const lowStockItems = products.filter(p => {
        const s = Number(p.stock) || 0;
        const m = Number(p.minStock) || 0;
        return m > 0 && s <= m;
      });
      setLowStock(lowStockItems);

      const revenue = invoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
      const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
      const unpaid = invoices.filter(i => i.status === 'unpaid' || !i.status).reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
      const expenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const today = new Date().toISOString().split('T')[0];
      const todayInvoices = invoices.filter(i => i.date === today);
      const todaySales = todayInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
      const pendingCount = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial').length;
      const overdueInvoices = invoices.filter(i => {
        if (i.status === 'paid') return false;
        if (!i.dueDate) return false;
        return i.dueDate < today;
      });
      const overdueAmount = overdueInvoices.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);

      setStats({
        invoices: invoices.length, customers: customers.length, expenseTotal, revenue, paid, unpaid,
        todaySales, todayCount: todayInvoices.length, pendingCount,
        overdueCount: overdueInvoices.length, overdueAmount,
      });
      setRecentInvoices(invoices.sort((a, b) => b.id - a.id).slice(0, 5));
      setActivity(activityLog);

      const now = new Date();
      const m = now.getMonth();
      const y = now.getFullYear();
      const monthSales = invoices
        .filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; })
        .reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
      const monthExp = expenses
        .filter(e => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; })
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      setMonthlyData({ sales: monthSales, expense: monthExp, profit: monthSales - monthExp });

      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(y, m - 5 + i, 1);
        return {
          label: d.toLocaleString('default', { month: 'short' }),
          sales: 0, expenses: 0
        };
      });
      invoices.forEach(i => {
        const d = new Date(i.date);
        const idx = (d.getMonth() - (m - 5)) + (d.getFullYear() - y) * 12;
        if (idx >= 0 && idx < 6) months[idx].sales += Number(i.grandTotal) || 0;
      });
      expenses.forEach(e => {
        const d = new Date(e.date);
        const idx = (d.getMonth() - (m - 5)) + (d.getFullYear() - y) * 12;
        if (idx >= 0 && idx < 6) months[idx].expenses += Number(e.amount) || 0;
      });
      setChartData(months);
    }
    load();
  }, []);

  const invoiceColumns = [
    { title: 'Invoice', dataIndex: 'invoiceNo', key: 'no', render: (t) => <Text strong>{t}</Text> },
    { title: 'Customer', dataIndex: 'customerName', key: 'cust', render: (t) => t || 'Walk-in' },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s) => {
        const color = s === 'paid' ? 'success' : s === 'partial' ? 'warning' : 'error';
        return <Tag color={color}>{s || 'unpaid'}</Tag>;
      }
    },
    {
      title: 'Amount', dataIndex: 'grandTotal', key: 'amt', align: 'right',
      render: (v) => `₹${Number(v).toFixed(2)}`
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
          <Text type="secondary">Your business at a glance</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoice/new')}>
            New Invoice
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Revenue"
              value={stats.revenue}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#6366f1' }}
              suffix={<Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>collected: ₹{stats.paid.toFixed(2)}</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Sales"
              value={stats.todaySales}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              suffix={<Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stats.todayCount} invoice{stats.todayCount !== 1 ? 's' : ''}</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Invoices"
              value={stats.pendingCount}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix={<Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>need payment</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Overdue"
              value={stats.overdueCount}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={stats.overdueAmount > 0 ? <Text style={{ fontSize: 11, color: '#ff4d4f' }}>₹{stats.overdueAmount.toFixed(2)}</Text> : <Text style={{ fontSize: 11, color: '#52c41a' }}>None</Text>}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Invoices"
              value={stats.invoices}
              prefix={<FileTextOutlined />}
              suffix={<Text style={{ fontSize: 12, color: 'var(--text-secondary)' }}>total</Text>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Expenses"
              value={stats.expenseTotal}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Profit (MTD)"
              value={monthlyData.profit}
              prefix="₹"
              precision={2}
              valueStyle={{ color: monthlyData.profit >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Customers"
              value={stats.customers}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Sales vs Expenses" style={{ height: '100%' }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} name="Sales" />
                <Bar dataKey="expenses" fill="#faad14" radius={[6, 6, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Recent Activity" style={{ height: '100%' }}>
            <List
              dataSource={activity}
              renderItem={(a) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={<div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', marginTop: 6 }} />}
                    title={<Text style={{ fontSize: 13 }}>{a.message}</Text>}
                    description={<Text type="secondary" style={{ fontSize: 11 }}>{new Date(a.timestamp).toLocaleString()}</Text>}
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No recent activity' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title="Recent Invoices"
            extra={<Button type="link" onClick={() => navigate('/invoices')}>View All <ArrowRightOutlined /></Button>}
          >
            <Table
              dataSource={recentInvoices}
              columns={invoiceColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'No invoices yet' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          {lowStock.length > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={<Text strong>Low Stock Alert</Text>}
              description={
                <div>
                  {lowStock.slice(0, 5).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span>{p.name}</span>
                      <span><Text type="danger">Stock: {Number(p.stock) || 0}{p.minStock ? `/ min: ${p.minStock}` : ''}</Text></span>
                    </div>
                  ))}
                  {lowStock.length > 5 && (
                    <Button type="link" size="small" onClick={() => navigate('/products')}>
                      View all {lowStock.length} products
                    </Button>
                  )}
                </div>
              }
              style={{ borderRadius: 12 }}
            />
          )}
        </Col>
      </Row>
    </div>
  );
}
