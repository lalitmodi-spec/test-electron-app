import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Table, Card, Button, Drawer, Form, Input, Select, DatePicker, InputNumber, Typography,
  Row, Col, Statistic, message, Tag, Space, Popconfirm
} from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { recordPayment, deletePayment, logActivity } from '../db';

const { Title, Text } = Typography;

export default function Payments() {
  const { t } = useLanguage();
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
    message.success(t('msg.saved'));
    setShowForm(false);
    load();
  }

  async function handleDelete(id, invoiceId) {
    await deletePayment(id, invoiceId);
    message.success(t('msg.deleted'));
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
    const headers = [t('payment.date'), t('payment.invoice'), t('common.customer'), t('payment.amount'), t('payment.method'), t('payment.reference'), t('payment.note')];
    const rows = filtered.map(p => {
      const inv = invMap[p.invoiceId];
      return [p.date, inv?.invoiceNo || `#${p.invoiceId}`, inv?.customerName || '-', Number(p.amount).toFixed(2), p.method || t('paymentMethods.cash'), p.reference || '', p.note || ''];
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
      title: t('payment.date'), dataIndex: 'date', key: 'date', width: 110,
      sorter: (a, b) => a.date?.localeCompare(b.date),
    },
    {
      title: t('payment.invoice'), dataIndex: 'invoiceId', key: 'invoiceId',
      render: (id) => {
        const inv = invMap[id];
        return inv ? <Text strong style={{ color: '#6366f1' }}>{inv.invoiceNo}</Text> : `#${id}`;
      },
    },
    {
      title: t('common.customer'), key: 'customer',
      render: (_, r) => {
        const inv = invMap[r.invoiceId];
        return inv?.customerName || '-';
      },
    },
    {
      title: t('payment.amount'), dataIndex: 'amount', key: 'amount', align: 'right',
      render: (v) => <Text strong style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: t('payment.method'), dataIndex: 'method', key: 'method',
      render: (t) => <Tag>{t || t('paymentMethods.cash')}</Tag>,
    },
    {
      title: t('payment.reference'), dataIndex: 'reference', key: 'reference',
      render: (t) => t || '-',
    },
    {
      title: '', key: 'actions', width: 60, align: 'right',
      render: (_, r) => (
        <Popconfirm title={t('msg.confirmDelete')} onConfirm={() => handleDelete(r.id, r.invoiceId)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space align="center" size={14}>
              <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #52c41a, #73d13d)' }}>
                <DollarOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('payment.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Track all payments received</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={downloadPaymentsCsv}>{t('payment.downloadCsv')}</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {t('payment.recordPayment')}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic title={t('payment.totalCollected')} value={totalPayments} precision={2} prefix="₹"
              valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic title={t('payment.transactions')} value={filtered.length} valueStyle={{ color: '#6366f1' }} />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder={t('payment.search')}
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} ${t('payment.title')}` }}
          scroll={{ x: 700 }} locale={{ emptyText: t('msg.noData') }} />
      </Card>

      <Drawer
        title={t('payment.recordPayment')}
        open={showForm}
        onClose={() => setShowForm(false)}
        placement="right"
        width={520}
        extra={
          <Space>
            <Button onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleSave}>{t('payment.recordPayment')}</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="invoiceId" label={t('payment.invoice')} rules={[{ required: true, message: t('placeholder.selectInvoice') }]}>
            <Select showSearch placeholder={t('placeholder.selectInvoice')}
              filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
              {invoices.map(inv => (
                <Select.Option key={inv.id} value={inv.id}>
                  {inv.invoiceNo} - {inv.customerName || t('msg.walkIn')} (₹{Number(inv.grandTotal).toFixed(2)})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label={`${t('payment.amount')} (₹)`} rules={[{ required: true }]}>
                <InputNumber min={1} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="method" label={t('payment.method')}>
                <Select>
                  <Select.Option value="Cash">{t('paymentMethods.cash')}</Select.Option>
                  <Select.Option value="UPI">{t('paymentMethods.upi')}</Select.Option>
                  <Select.Option value="Bank Transfer">{t('paymentMethods.bankTransfer')}</Select.Option>
                  <Select.Option value="Card">{t('paymentMethods.card')}</Select.Option>
                  <Select.Option value="Cheque">{t('paymentMethods.cheque')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label={t('payment.date')} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reference" label={`${t('payment.reference')} (${t('common.optional')})`}>
                <Input placeholder={t('placeholder.reference')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label={t('payment.note')}>
            <Input.TextArea rows={2} placeholder={t('placeholder.notes')} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
