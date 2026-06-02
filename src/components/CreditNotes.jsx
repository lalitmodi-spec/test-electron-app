import { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Select, Space, Modal, Form, Typography, Row, Col, Popconfirm, message, Tag, Tooltip, DatePicker, InputNumber, Divider } from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, SearchOutlined, RollbackOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { logActivity, createCreditNote } from '../db';

const { Title, Text } = Typography;

export default function CreditNotes() {
  const [creditNotes, setCreditNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form] = Form.useForm();
  const [viewCn, setViewCn] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);

  async function load() {
    setLoading(true);
    const [cn, inv] = await Promise.all([
      db.creditNotes.reverse().toArray(),
      db.invoices.toArray(),
    ]);
    setCreditNotes(cn);
    setInvoices(inv);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const invMap = {};
  invoices.forEach(i => { invMap[i.id] = i; });

  const filtered = creditNotes.filter(cn =>
    !search || cn.cnNo?.toLowerCase().includes(search.toLowerCase()) ||
    cn.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    setInvoiceItems([]);
    setShowForm(true);
  }

  function handleSelectInvoice(invoiceId) {
    const inv = invMap[Number(invoiceId)];
    if (inv) {
      form.setFieldsValue({
        customerName: inv.customerName || '',
        customerGstin: inv.customerGstin || '',
        customerId: inv.customerId || '',
      });
      setInvoiceItems((inv.items || []).map((item, i) => ({
        ...item, key: i + 1, returnQty: item.qty || 1, returnAmount: item.amount || 0,
      })));
    }
  }

  async function handleSave() {
    const values = await form.validateFields();
    const items = invoiceItems
      .filter(i => Number(i.returnQty) > 0)
      .map(i => ({
        name: i.name, hsn: i.hsn || '', qty: i.qty, rate: i.rate,
        returnQty: Number(i.returnQty), returnAmount: Number(i.returnAmount),
        taxRate: i.taxRate || 0,
      }));
    if (items.length === 0) {
      message.error('Add at least one item');
      return;
    }
    const subtotal = items.reduce((s, i) => s + i.returnAmount, 0);
    const taxAmount = items.reduce((s, i) => s + (i.returnAmount * (i.taxRate || 0) / 100), 0);
    await createCreditNote({
      invoiceId: values.invoiceId || null,
      customerId: values.customerId || '',
      customerName: values.customerName || '',
      customerGstin: values.customerGstin || '',
      date: values.date.format('YYYY-MM-DD'),
      items,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      reason: values.reason || '',
    });
    message.success('Credit note created');
    setShowForm(false);
    load();
  }

  async function handleDelete(id, cnNo) {
    await db.creditNotes.delete(id);
    await logActivity('delete', `Deleted credit note: ${cnNo}`);
    message.success('Deleted');
    load();
  }

  const columns = [
    { title: 'CN No', dataIndex: 'cnNo', key: 'cnNo', render: (t) => <Text strong style={{ color: '#722ed1' }}>{t}</Text> },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110 },
    {
      title: 'Customer', dataIndex: 'customerName', key: 'customerName',
      render: (t) => t || <Text type="secondary">Walk-in</Text>,
    },
    {
      title: 'Invoice', key: 'invoice', width: 140,
      render: (_, r) => r.invoiceId ? <Text style={{ color: '#6366f1' }}>{invMap[r.invoiceId]?.invoiceNo || `#${r.invoiceId}`}</Text> : '-',
    },
    {
      title: 'Amount', dataIndex: 'total', key: 'total', align: 'right', width: 120,
      render: (v) => <Text strong style={{ color: '#ff4d4f' }}>-₹{Number(v).toFixed(2)}</Text>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 90,
      render: (s) => <Tag color={s === 'issued' ? 'purple' : 'default'}>{s || 'issued'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 100, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => setViewCn(r)} /></Tooltip>
          <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id, r.cnNo)}>
            <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalCnAmount = filtered.reduce((s, cn) => s + Number(cn.total), 0);

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Credit Notes</Title>
          <Text type="secondary">{creditNotes.length} total | ₹{totalCnAmount.toFixed(2)} issued</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Credit Note</Button>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input prefix={<SearchOutlined />} placeholder="Search by CN no or customer..."
              value={search} onChange={e => setSearch(e.target.value)} allowClear />
          </Col>
        </Row>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} credit notes` }}
          scroll={{ x: 800 }} locale={{ emptyText: 'No credit notes yet' }} />
      </Card>

      <Modal title="New Credit Note" open={showForm} onCancel={() => setShowForm(false)}
        onOk={handleSave} okText="Create" width={700}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="invoiceId" label="Reference Invoice">
                <Select showSearch placeholder="Select invoice (optional)" allowClear
                  onChange={handleSelectInvoice}
                  filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {invoices.map(inv => (
                    <Select.Option key={inv.id} value={inv.id}>
                      {inv.invoiceNo} - {inv.customerName || 'Walk-in'} (₹{Number(inv.grandTotal).toFixed(2)})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="customerName" label="Customer Name">
                <Input placeholder="Customer name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="customerGstin" label="GSTIN">
                <Input placeholder="GSTIN" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="reason" label="Reason for Credit Note">
                <Input placeholder="e.g. Return, Discount, Correction" />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {invoiceItems.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text strong>Items to return</Text>
            <Table dataSource={invoiceItems} rowKey="key" pagination={false} size="small"
              columns={[
                { title: 'Item', dataIndex: 'name', key: 'name' },
                { title: 'HSN', dataIndex: 'hsn', key: 'hsn', render: (t) => t || '-' },
                { title: 'Invoiced', dataIndex: 'qty', key: 'qty', align: 'center', width: 70 },
                {
                  title: 'Return Qty', dataIndex: 'returnQty', key: 'returnQty', width: 90,
                  render: (v, r) => (
                    <InputNumber min={0} max={r.qty} value={v} size="small"
                      onChange={(val) => {
                        const amt = (Number(val) || 0) * (Number(r.rate) || 0);
                        setInvoiceItems(prev => prev.map(i =>
                          i.key === r.key ? { ...i, returnQty: val || 0, returnAmount: amt } : i
                        ));
                      }} style={{ width: 70 }} />
                  ),
                },
                {
                  title: 'Amount', dataIndex: 'returnAmount', key: 'returnAmount', align: 'right', width: 100,
                  render: (v) => <Text strong style={{ color: '#ff4d4f' }}>₹{Number(v).toFixed(2)}</Text>,
                },
              ]}
            />
          </div>
        )}
      </Modal>

      <Modal title={`Credit Note: ${viewCn?.cnNo}`} open={!!viewCn} onCancel={() => setViewCn(null)}
        footer={null} width={600}>
        {viewCn && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}><Text type="secondary">Date:</Text> {viewCn.date}</Col>
              <Col span={12}><Text type="secondary">Status:</Text> <Tag color="purple">{viewCn.status}</Tag></Col>
              <Col span={12}><Text type="secondary">Customer:</Text> {viewCn.customerName || '-'}</Col>
              <Col span={12}><Text type="secondary">GSTIN:</Text> {viewCn.customerGstin || '-'}</Col>
              {viewCn.invoiceId && (
                <Col span={24}><Text type="secondary">Reference Invoice:</Text> {invMap[viewCn.invoiceId]?.invoiceNo || `#${viewCn.invoiceId}`}</Col>
              )}
              {viewCn.reason && (
                <Col span={24}><Text type="secondary">Reason:</Text> {viewCn.reason}</Col>
              )}
            </Row>
            <Table dataSource={viewCn.items || []} rowKey={(_, i) => i} pagination={false} size="small"
              columns={[
                { title: 'Item', dataIndex: 'name', key: 'name' },
                { title: 'HSN', dataIndex: 'hsn', key: 'hsn', render: (t) => t || '-' },
                { title: 'Return Qty', dataIndex: 'returnQty', key: 'qty', align: 'center' },
                { title: 'Rate', dataIndex: 'rate', key: 'rate', align: 'right', render: (v) => `₹${Number(v).toFixed(2)}` },
                { title: 'Amount', dataIndex: 'returnAmount', key: 'amount', align: 'right', render: (v) => <Text strong style={{ color: '#ff4d4f' }}>-₹{Number(v).toFixed(2)}</Text> },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong style={{ color: '#ff4d4f' }}>-₹{Number(viewCn.total).toFixed(2)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
