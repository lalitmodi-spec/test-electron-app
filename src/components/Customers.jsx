import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, Space, Modal, Form, Typography,
  Row, Col, Popconfirm, message, Tag, Tooltip, Tabs, Statistic, Descriptions
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  EyeOutlined, DollarOutlined, WalletOutlined, RiseOutlined, FallOutlined
} from '@ant-design/icons';
import db, { logActivity, getCustomerPaymentSummary, getInvoicesForCustomer, getPaymentsForCustomer } from '../db';

const { Title, Text } = Typography;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [summaryMap, setSummaryMap] = useState({});

  async function load() {
    setLoading(true);
    const data = await db.customers.reverse().toArray();
    setCustomers(data);
    const map = {};
    for (const c of data) {
      map[c.id] = await getCustomerPaymentSummary(c.id);
    }
    setSummaryMap(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEdit(null);
    form.resetFields();
    setShowForm(true);
  }

  function openEdit(record) {
    setEdit(record);
    form.setFieldsValue(record);
    setShowForm(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    if (edit) {
      await db.customers.update(edit.id, values);
      await logActivity('update', `Updated customer: ${values.name}`);
      message.success('Customer updated');
    } else {
      await db.customers.add({ ...values, createdAt: new Date().toISOString() });
      await logActivity('create', `Added customer: ${values.name}`);
      message.success('Customer added');
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, name) {
    await db.customers.delete(id);
    await logActivity('delete', `Deleted customer: ${name}`);
    message.success(`Deleted ${name}`);
    load();
  }

  async function openDetail(customer) {
    setDetailCustomer(customer);
    setDetailLoading(true);
    setDetailData(null);
    const [summary, invoices, payments] = await Promise.all([
      getCustomerPaymentSummary(customer.id),
      getInvoicesForCustomer(customer.id),
      getPaymentsForCustomer(customer.id),
    ]);
    setDetailData({ summary, invoices, payments });
    setDetailLoading(false);
  }

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.gstin?.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = Object.values(summaryMap).reduce((s, v) => s + v.pending, 0);
  const totalBilled = Object.values(summaryMap).reduce((s, v) => s + v.totalBilled, 0);

  const columns = [
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (t, r) => (
        <Space>
          <Text strong>{t}</Text>
          {r.companyName && <Text type="secondary" style={{ fontSize: 12 }}>({r.companyName})</Text>}
        </Space>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (t) => t || '-' },
    {
      title: 'GSTIN', dataIndex: 'gstin', key: 'gstin',
      render: (t) => t ? <Tag color="blue">{t}</Tag> : '-'
    },
    {
      title: 'Outstanding', key: 'outstanding', width: 140, align: 'right',
      render: (_, r) => {
        const s = summaryMap[r.id];
        if (!s || s.invoiceCount === 0) return <Text type="secondary">-</Text>;
        return (
          <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
            {s.pending > 0 ? (
              <Text strong style={{ color: '#ff4d4f' }}>₹{s.pending.toFixed(2)}</Text>
            ) : (
              <Text strong style={{ color: '#52c41a' }}>Settled</Text>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>{s.invoiceCount} invoice{s.invoiceCount > 1 ? 's' : ''}</Text>
          </Space>
        );
      },
    },
    {
      title: '', key: 'actions', width: 140, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
          </Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title={`Delete ${r.name}?`} onConfirm={() => handleDelete(r.id, r.name)}>
            <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    },
  ];

  const formFields = (
    <Form form={form} layout="vertical">
      <Tabs items={[
        {
          key: 'basic', label: 'Basic Info',
          children: (
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="name" label="Contact Person *" rules={[{ required: true }]}>
                  <Input placeholder="Full name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="companyName" label="Company / Business Name">
                  <Input placeholder="Company name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="Phone"><Input placeholder="Phone number" /></Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="email" label="Email"><Input placeholder="Email address" type="email" /></Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="gstin" label="GSTIN"><Input placeholder="GSTIN" /></Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="stateCode" label="State Code"><Input placeholder="e.g. 29" /></Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="pincode" label="Pincode"><Input placeholder="Pincode" /></Form.Item>
              </Col>
            </Row>
          )
        },
        {
          key: 'address', label: 'Addresses',
          children: (
            <>
              <Form.Item name="address" label="Billing Address">
                <Input.TextArea rows={2} placeholder="Billing address" />
              </Form.Item>
              <Form.Item name="shippingAddress" label="Shipping Address (if different)">
                <Input.TextArea rows={2} placeholder="Shipping address" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="state" label="State"><Input placeholder="State" /></Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="city" label="City"><Input placeholder="City" /></Form.Item>
                </Col>
              </Row>
            </>
          )
        },
      ]} />
    </Form>
  );

  const detailTabs = detailData ? [
    {
      key: 'invoices',
      label: `Invoices (${detailData.invoices.length})`,
      children: (
        <Table dataSource={detailData.invoices} rowKey="id" pagination={false} size="small"
          columns={[
            { title: 'Invoice', dataIndex: 'invoiceNo', key: 'invoiceNo', render: (t) => <Text strong style={{ color: '#6366f1' }}>{t}</Text> },
            { title: 'Date', dataIndex: 'date', key: 'date', width: 100 },
            {
              title: 'Amount', dataIndex: 'grandTotal', key: 'grandTotal', align: 'right', width: 110,
              render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>,
            },
            {
              title: 'Paid', dataIndex: 'paidAmount', key: 'paidAmount', align: 'right', width: 110,
              render: (v) => <Text style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text>,
            },
            {
              title: 'Balance', dataIndex: 'balance', key: 'balance', align: 'right', width: 110,
              render: (v) => v > 0
                ? <Text style={{ color: '#ff4d4f' }}>₹{Number(v).toFixed(2)}</Text>
                : <Tag color="success" style={{ margin: 0 }}>Paid</Tag>,
            },
            {
              title: 'Status', dataIndex: 'status', key: 'status', width: 90,
              render: (s) => {
                const map = { paid: 'success', partial: 'warning', unpaid: 'error' };
                return <Tag color={map[s] || 'default'}>{s || 'unpaid'}</Tag>;
              },
            },
          ]}
        />
      ),
    },
    {
      key: 'payments',
      label: `Payments (${detailData.payments.length})`,
      children: (
        <Table dataSource={detailData.payments} rowKey="id" pagination={false} size="small"
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'date', width: 100 },
            { title: 'Invoice', dataIndex: 'invoiceNo', key: 'invoiceNo', render: (t) => <Text strong style={{ color: '#6366f1' }}>{t}</Text> },
            {
              title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', width: 110,
              render: (v) => <Text strong style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text>,
            },
            { title: 'Method', dataIndex: 'method', key: 'method', width: 100, render: (t) => <Tag>{t}</Tag> },
            { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (t) => t || '-' },
          ]}
          locale={{ emptyText: 'No payments recorded' }}
        />
      ),
    },
  ] : [];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Customers</Title>
          <Text type="secondary">{customers.length} total customers</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Customer</Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic title="Total Customers" value={customers.length} prefix={<WalletOutlined />} valueStyle={{ color: '#6366f1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic title="Total Billed" value={totalBilled} precision={2} prefix="₹" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #ff4d4f' } }}>
            <Statistic title="Outstanding" value={totalOutstanding} precision={2} prefix="₹"
              valueStyle={{ color: totalOutstanding > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder="Search by name, company, phone or GSTIN..." value={search}
                onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} customers` }}
          scroll={{ x: 800 }} locale={{ emptyText: 'No customers yet' }}
          expandable={{
            expandedRowRender: (r) => (
              <div style={{ padding: 8 }}>
                <Row gutter={24}>
                  <Col span={12}>
                    <Text type="secondary">Billing:</Text>
                    <div style={{ fontSize: 13 }}>{r.address || '-'}</div>
                    {r.city && <div style={{ fontSize: 13 }}>{r.city}{r.state ? `, ${r.state}` : ''}{r.pincode ? ` - ${r.pincode}` : ''}</div>}
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Shipping:</Text>
                    <div style={{ fontSize: 13 }}>{r.shippingAddress || r.address || '-'}</div>
                  </Col>
                </Row>
                <Row gutter={24} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Text type="secondary">State Code:</Text>
                    <span style={{ marginLeft: 8 }}>{r.stateCode || '-'}</span>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Contact:</Text>
                    <span style={{ marginLeft: 8 }}>{r.phone || '-'}{r.email ? ` | ${r.email}` : ''}</span>
                  </Col>
                </Row>
                {summaryMap[r.id]?.pending > 0 && (
                  <Row style={{ marginTop: 8 }}>
                    <Col>
                      <Tag color="red" style={{ fontSize: 12 }}>
                        Outstanding: ₹{summaryMap[r.id].pending.toFixed(2)}
                      </Tag>
                    </Col>
                  </Row>
                )}
              </div>
            ),
          }}
        />
      </Card>

      <Modal
        title={edit ? 'Edit Customer' : 'Add Customer'}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={edit ? 'Update' : 'Save'}
        width={650}
      >
        {formFields}
      </Modal>

      <Modal
        title={
          <Space>
            <Text strong>{detailCustomer?.name}</Text>
            {detailCustomer?.companyName && <Text type="secondary">({detailCustomer.companyName})</Text>}
            {detailCustomer?.gstin && <Tag color="blue">{detailCustomer.gstin}</Tag>}
          </Space>
        }
        open={!!detailCustomer}
        onCancel={() => { setDetailCustomer(null); setDetailData(null); }}
        width={800}
        footer={null}
        loading={detailLoading}
      >
        {detailData && (
          <div>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Phone">{detailCustomer?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailCustomer?.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="State">{detailCustomer?.state || '-'}</Descriptions.Item>
              <Descriptions.Item label="State Code">{detailCustomer?.stateCode || '-'}</Descriptions.Item>
              <Descriptions.Item label="Billing">{detailCustomer?.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="Shipping">{detailCustomer?.shippingAddress || '-'}</Descriptions.Item>
            </Descriptions>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={8}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(99,102,241,0.08)' }}>
                  <RiseOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1', marginTop: 4 }}>
                    ₹{detailData.summary.totalBilled.toFixed(2)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Total Billed</Text>
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(82,196,26,0.08)' }}>
                  <FallOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
                    ₹{detailData.summary.totalPaid.toFixed(2)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Total Paid</Text>
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" style={{ textAlign: 'center', background: detailData.summary.pending > 0 ? 'rgba(255,77,79,0.08)' : 'rgba(82,196,26,0.08)' }}>
                  <DollarOutlined style={{ color: detailData.summary.pending > 0 ? '#ff4d4f' : '#52c41a', fontSize: 18 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: detailData.summary.pending > 0 ? '#ff4d4f' : '#52c41a', marginTop: 4 }}>
                    ₹{detailData.summary.pending.toFixed(2)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{detailData.summary.pending > 0 ? 'Pending' : 'Settled'}</Text>
                </Card>
              </Col>
            </Row>

            <Tabs items={detailTabs} />
          </div>
        )}
      </Modal>
    </div>
  );
}
