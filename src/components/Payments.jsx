import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Typography,
  Row, Col, Statistic, message, Tag, Space, Popconfirm
} from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { recordPayment, deletePayment, logActivity } from '../db';

const { Title, Text } = Typography;

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [p, inv] = await Promise.all([
      db.payments.reverse().toArray(),
      db.invoices.toArray(),
    ]);
    setPayments(p);
    setInvoices(inv);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), method: 'Cash' });
    setShowForm(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    await recordPayment({
      invoiceId: values.invoiceId,
      amount: values.amount,
      method: values.method,
      date: values.date.format('YYYY-MM-DD'),
      reference: values.reference || '',
      note: values.note || '',
    });
    message.success('Payment recorded');
    setShowForm(false);
    load();
  }

  async function handleDelete(id, invoiceId) {
    await deletePayment(id, invoiceId);
    message.success('Payment deleted');
    load();
  }

  const invMap = {};
  invoices.forEach(i => { invMap[i.id] = i; });

  const filtered = payments.filter(p => {
    const inv = invMap[p.invoiceId];
    return !search || inv?.invoiceNo?.toLowerCase().includes(search.toLowerCase());
  });

  const totalPayments = filtered.reduce((s, p) => s + Number(p.amount), 0);

  function downloadPaymentsCsv() {
    const headers = ['Date', 'Invoice', 'Customer', 'Amount', 'Method', 'Reference', 'Note'];
    const rows = filtered.map(p => {
      const inv = invMap[p.invoiceId];
      return [p.date, inv?.invoiceNo || `#${p.invoiceId}`, inv?.customerName || '-', Number(p.amount).toFixed(2), p.method || 'Cash', p.reference || '', p.note || ''];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','))].join('\n');
    if (window.electronAPI) {
      window.electronAPI.saveFile({ data: csv, filename: `payments_${new Date().toISOString().split('T')[0]}.csv`, filters: [{ name: 'CSV', extensions: ['csv'] }] });
    } else {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  const columns = [
    {
      title: 'Date', dataIndex: 'date', key: 'date', width: 110,
      sorter: (a, b) => a.date?.localeCompare(b.date),
    },
    {
      title: 'Invoice', dataIndex: 'invoiceId', key: 'invoiceId',
      render: (id) => {
        const inv = invMap[id];
        return inv ? <Text strong style={{ color: '#6366f1' }}>{inv.invoiceNo}</Text> : `#${id}`;
      },
    },
    {
      title: 'Customer', key: 'customer',
      render: (_, r) => {
        const inv = invMap[r.invoiceId];
        return inv?.customerName || '-';
      },
    },
    {
      title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right',
      render: (v) => <Text strong style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: 'Method', dataIndex: 'method', key: 'method',
      render: (t) => <Tag>{t || 'Cash'}</Tag>,
    },
    {
      title: 'Reference', dataIndex: 'reference', key: 'reference',
      render: (t) => t || '-',
    },
    {
      title: '', key: 'actions', width: 60, align: 'right',
      render: (_, r) => (
        <Popconfirm title="Delete this payment?" onConfirm={() => handleDelete(r.id, r.invoiceId)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Payments</Title>
          <Text type="secondary">Track all payments received</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={downloadPaymentsCsv}>Download CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Record Payment
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic title="Total Collected" value={totalPayments} precision={2} prefix="₹"
              valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic title="Transactions" value={filtered.length} valueStyle={{ color: '#6366f1' }} />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder="Search by invoice..."
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} payments` }}
          scroll={{ x: 700 }} locale={{ emptyText: 'No payments recorded yet' }} />
      </Card>

      <Modal
        title="Record Payment"
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText="Record"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="invoiceId" label="Invoice" rules={[{ required: true, message: 'Select invoice' }]}>
            <Select showSearch placeholder="Search invoice..."
              filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
              {invoices.map(inv => (
                <Select.Option key={inv.id} value={inv.id}>
                  {inv.invoiceNo} - {inv.customerName || 'Walk-in'} (₹{Number(inv.grandTotal).toFixed(2)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
                <InputNumber min={1} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="method" label="Payment Method">
                <Select>
                  <Select.Option value="Cash">Cash</Select.Option>
                  <Select.Option value="UPI">UPI</Select.Option>
                  <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                  <Select.Option value="Card">Card</Select.Option>
                  <Select.Option value="Cheque">Cheque</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reference" label="Reference (optional)">
                <Input placeholder="Cheque/UTR no." />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} placeholder="Optional note" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
