import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Modal, Form, Typography,
  Row, Col, Popconfirm, message, Tag, DatePicker, InputNumber, Tooltip, Statistic
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SearchOutlined, ShoppingCartOutlined,
  ImportOutlined, DollarOutlined, UserOutlined, EyeOutlined, ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { recordPurchase, logActivity } from '../db';

const { Title, Text } = Typography;

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [p, prod, v] = await Promise.all([
      db.purchases.reverse().toArray(),
      db.products.toArray(),
      db.vendors.toArray(),
    ]);
    setPurchases(p);
    setProducts(prod);
    setVendors(v);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), unit: 'pcs' });
    setShowForm(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    const qty = Number(values.quantity) || 0;
    const costPerUnit = Number(values.costPerUnit) || 0;
    const totalCost = values.totalCost != null ? Number(values.totalCost) : qty * costPerUnit;

    await recordPurchase({
      productId: values.productId,
      productName: values.productName,
      quantity: qty,
      unit: values.unit || 'pcs',
      costPerUnit,
      totalCost,
      vendorId: values.vendorId || null,
      supplier: values.vendorId ? vendors.find(v => v.id === values.vendorId)?.name || '' : values.supplier || '',
      date: values.date.format('YYYY-MM-DD'),
      note: values.note || '',
    });
    message.success('Purchase recorded & stock updated');
    setShowForm(false);
    load();
  }

  function handleProductChange(productId) {
    const prod = products.find(p => p.id === Number(productId));
    if (prod) {
      form.setFieldsValue({
        productName: prod.name,
        unit: prod.unit || 'pcs',
      });
    }
  }

  async function handleDelete(id) {
    await db.purchases.delete(id);
    await logActivity('delete', `Deleted purchase record #${id}`);
    message.success('Purchase deleted');
    load();
  }

  const prodMap = {};
  products.forEach(p => { prodMap[p.id] = p; });

  const vendorMap = {};
  vendors.forEach(v => { vendorMap[v.id] = v; });

  const filtered = purchases.filter(p =>
    !search || p.productName?.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPurchases = filtered.reduce((s, p) => s + (Number(p.totalCost) || 0), 0);
  const totalQty = filtered.reduce((s, p) => s + (Number(p.quantity) || 0), 0);

  const columns = [
    {
      title: 'Date', dataIndex: 'date', key: 'date', width: 100,
      sorter: (a, b) => a.date?.localeCompare(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Product', dataIndex: 'productName', key: 'productName',
      render: (t) => <Text strong>{t}</Text>,
    },
    {
      title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'center', width: 70,
      render: (v, r) => <Text>{v} <Text type="secondary" style={{ fontSize: 11 }}>{r.unit || 'pcs'}</Text></Text>,
    },
    {
      title: 'Total Cost', dataIndex: 'totalCost', key: 'totalCost', align: 'right', width: 110,
      render: (v) => <Text strong style={{ color: '#faad14' }}>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.totalCost) - Number(b.totalCost),
    },
    {
      title: 'Vendor', dataIndex: 'vendorId', key: 'vendor', width: 140,
      render: (vid) => {
        if (!vid) return <Text type="secondary">-</Text>;
        const v = vendorMap[vid];
        return v
          ? <Tag icon={<UserOutlined />} color="blue">{v.name}</Tag>
          : <Text type="secondary">-</Text>;
      },
    },
    {
      title: 'Supplier', dataIndex: 'supplier', key: 'supplier',
      render: (t) => t || '-',
      responsive: ['md'],
    },
    {
      title: '', key: 'actions', width: 80, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="View Details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setShowView(r)} />
          </Tooltip>
          <Popconfirm title="Delete this purchase?" onConfirm={() => handleDelete(r.id)}>
            <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Purchases</Title>
          <Text type="secondary">Stock inward management</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Record Purchase
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic
              title={<Space size={4}><ShoppingCartOutlined style={{ color: '#6366f1' }} />Total Cost</Space>}
              value={totalPurchases} precision={2} prefix="₹"
              valueStyle={{ color: '#6366f1', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><ImportOutlined style={{ color: '#52c41a' }} />Total Qty</Space>}
              value={totalQty} suffix="units"
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #13c2c2' } }}>
            <Statistic
              title={<Space size={4}><UserOutlined style={{ color: '#13c2c2' }} />Transactions</Space>}
              value={filtered.length}
              valueStyle={{ color: '#13c2c2', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #fa8c16' } }}>
            <Statistic
              title={<Space size={4}><DollarOutlined style={{ color: '#fa8c16' }} />Avg/Transaction</Space>}
              value={filtered.length > 0 ? totalPurchases / filtered.length : 0} precision={2} prefix="₹"
              valueStyle={{ color: '#fa8c16', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder="Search by product or supplier..."
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
          </Row>
        </div>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} purchases` }}
          scroll={{ x: 800 }} locale={{ emptyText: <Space direction="vertical" style={{ padding: 20, textAlign: 'center' }}>
            <ShoppingCartOutlined style={{ fontSize: 40, color: 'var(--text-secondary)' }} />
            <Text type="secondary">No purchases recorded yet</Text>
            <Button type="primary" onClick={openCreate}>Record First Purchase</Button>
          </Space>}} />
      </Card>

      <Modal
        title={<Space><ShoppingCartOutlined style={{ color: '#6366f1' }} />Record Purchase</Space>}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText="Record Purchase"
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="productId" label="Product" rules={[{ required: true, message: 'Select a product' }]}>
                <Select showSearch placeholder="Search & select product..."
                  onChange={handleProductChange}
                  filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {products.map(p => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.name} <Text type="secondary">(Stock: {Number(p.stock) || 0} {p.unit || 'pcs'})</Text>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="productName" hidden><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Unit">
                <Input placeholder="pcs, kg..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="costPerUnit" label="Cost/Unit (₹)">
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="totalCost" label="Total Cost (₹)">
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vendorId" label="Vendor (select or type below)">
                <Select showSearch placeholder="Select vendor..." allowClear
                  filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {vendors.map(v => (
                    <Select.Option key={v.id} value={v.id}>{v.name}{v.company ? ` - ${v.company}` : ''}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="supplier" label="Or type supplier name">
                <Input placeholder="Supplier name" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} placeholder="Invoice number or notes..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<Space><EyeOutlined style={{ color: '#6366f1' }} />Purchase Details</Space>}
        open={!!showView}
        onCancel={() => setShowView(null)}
        footer={null}
        width={500}
      >
        {showView && (
          <div>
            <Row gutter={[16, 12]}>
              <Col span={12}><Text type="secondary">Product:</Text><br /><Text strong>{showView.productName}</Text></Col>
              <Col span={12}><Text type="secondary">Date:</Text><br /><Text>{showView.date}</Text></Col>
              <Col span={12}><Text type="secondary">Quantity:</Text><br /><Text strong>{showView.quantity} {showView.unit || 'pcs'}</Text></Col>
              <Col span={12}><Text type="secondary">Cost/Unit:</Text><br /><Text>₹{Number(showView.costPerUnit || 0).toFixed(2)}</Text></Col>
              <Col span={12}><Text type="secondary">Total Cost:</Text><br /><Text strong style={{ color: '#faad14', fontSize: 18 }}>₹{Number(showView.totalCost).toFixed(2)}</Text></Col>
              <Col span={12}><Text type="secondary">Supplier:</Text><br /><Text>{showView.supplier || '-'}</Text></Col>
              {showView.note && (
                <Col span={24}><Text type="secondary">Note:</Text><br /><Text>{showView.note}</Text></Col>
              )}
              <Col span={24}><Text type="secondary">Recorded:</Text><br /><Text style={{ fontSize: 12 }}>{new Date(showView.createdAt).toLocaleString()}</Text></Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
