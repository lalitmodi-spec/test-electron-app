import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Modal, Form, InputNumber, Typography,
  Row, Col, Popconfirm, message, Tag, Tooltip, Statistic, Progress
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ShoppingOutlined, ShoppingCartOutlined, BarChartOutlined, WarningOutlined,
  PlusCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import db, { logActivity, getPurchaseSummary, adjustProductStock } from '../db';

const { Title, Text } = Typography;

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [purchaseSummary, setPurchaseSummary] = useState({});
  const [showStockAdjust, setShowStockAdjust] = useState(null);
  const [adjustForm] = Form.useForm();

  async function load() {
    setLoading(true);
    const data = await db.products.reverse().toArray();
    setProducts(data);
    const summary = {};
    for (const p of data) {
      summary[p.id] = await getPurchaseSummary(p.id);
    }
    setPurchaseSummary(summary);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEdit(null);
    form.resetFields();
    form.setFieldsValue({ taxRate: 18, unit: 'pcs', stock: 0, minStock: 0 });
    setShowForm(true);
  }

  function openEdit(record) {
    setEdit(record);
    form.setFieldsValue(record);
    setShowForm(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    const data = { ...values, stock: Number(values.stock), minStock: Number(values.minStock), price: Number(values.price) };
    if (edit) {
      await db.products.update(edit.id, data);
      await logActivity('update', `Updated product: ${data.name}`);
      message.success('Product updated');
    } else {
      await db.products.add({ ...data, createdAt: new Date().toISOString() });
      await logActivity('create', `Added product: ${data.name}`);
      message.success('Product added');
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, name) {
    await db.products.delete(id);
    await logActivity('delete', `Deleted product: ${name}`);
    message.success(`Deleted ${name}`);
    load();
  }

  function openStockAdjust(product) {
    setShowStockAdjust(product);
    adjustForm.resetFields();
    adjustForm.setFieldsValue({ adjustment: 0, reason: 'Manual adjustment' });
  }

  async function handleStockAdjust() {
    const values = await adjustForm.validateFields();
    const newStock = await adjustProductStock(showStockAdjust.id, Number(values.adjustment), values.reason);
    message.success(`Stock adjusted to ${newStock}`);
    setShowStockAdjust(null);
    load();
  }

  const filtered = products.filter(p => {
    const match = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.hsn?.includes(search);
    if (!stockFilter) return match;
    const stock = Number(p.stock) || 0;
    if (stockFilter === 'low') return match && stock <= (Number(p.minStock) || 0) && stock > 0;
    if (stockFilter === 'out') return match && stock === 0;
    if (stockFilter === 'in') return match && stock > 0;
    return match;
  });

  const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 0) && (Number(p.minStock) || 0) > 0).length;
  const totalValue = products.reduce((s, p) => s + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);

  const columns = [
    {
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (t) => <Text strong>{t}</Text>,
    },
    { title: 'HSN', dataIndex: 'hsn', key: 'hsn', render: (t) => t || '-', responsive: ['md'] },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', render: (t) => t || 'pcs', width: 60 },
    {
      title: 'Price', dataIndex: 'price', key: 'price', align: 'right',
      render: (v, r) => (
        <Space size={2} direction="vertical" style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <Text>₹{Number(v).toFixed(2)}</Text>
          <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>{r.taxRate || 0}%</Tag>
        </Space>
      ),
      sorter: (a, b) => Number(a.price) - Number(b.price),
    },
    {
      title: 'Stock', dataIndex: 'stock', key: 'stock', align: 'center',
      render: (v, r) => {
        const stock = Number(v) || 0;
        const min = Number(r.minStock) || 0;
        const isLow = stock <= min && stock > 0 && min > 0;
        const isOut = stock === 0;
        const maxForBar = Math.max(stock, min || 10);
        return (
          <div style={{ minWidth: 120 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Tag color={isOut ? 'error' : isLow ? 'warning' : 'success'} style={{ margin: 0 }}>
                {isOut ? 'Out of Stock' : isLow ? 'Low' : `${stock}`}
              </Tag>
              <Text type="secondary" style={{ fontSize: 11 }}>{r.unit || 'pcs'}</Text>
            </div>
            {min > 0 && stock > 0 && (
              <Progress
                percent={Math.min(100, (stock / maxForBar) * 100)}
                size="small"
                strokeColor={isLow ? '#faad14' : '#52c41a'}
                trailColor="rgba(255,255,255,0.08)"
                format={() => ''}
                style={{ margin: 0, lineHeight: 1 }}
              />
            )}
            {min > 0 && (
              <Text type="secondary" style={{ fontSize: 10 }}>min: {min}</Text>
            )}
          </div>
        );
      },
      sorter: (a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0),
    },
    {
      title: 'Purchased', key: 'purchased', align: 'center', width: 100,
      render: (_, r) => {
        const s = purchaseSummary[r.id];
        if (!s || s.count === 0) return <Text type="secondary">-</Text>;
        return (
          <Space size={2} direction="vertical" style={{ lineHeight: 1.2 }}>
            <Text style={{ fontSize: 12 }}>{s.totalQty} {r.unit || 'pcs'}</Text>
            <Text type="secondary" style={{ fontSize: 10 }}>₹{s.totalCost.toFixed(0)}</Text>
          </Space>
        );
      },
    },
    {
      title: '', key: 'actions', width: 170, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="Adjust Stock">
            <Button size="small" icon={<PlusCircleOutlined />}
              style={{ color: '#13c2c2' }}
              onClick={() => openStockAdjust(r)} />
          </Tooltip>
          <Tooltip title="Record Purchase">
            <Button size="small" icon={<ShoppingCartOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => navigate('/purchases')} />
          </Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title={`Delete ${r.name}?`} onConfirm={() => handleDelete(r.id, r.name)}>
            <Tooltip title="Delete"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Products & Inventory</Title>
          <Text type="secondary">
            {products.length} products
            {lowStockCount > 0 && <Text type="danger"> • {lowStockCount} low stock</Text>}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ShoppingCartOutlined />} onClick={() => navigate('/purchases')}>
              Purchases
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Product
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<Space size={4}><ShoppingOutlined style={{ color: '#6366f1' }} />Products</Space>}
              value={products.length}
              valueStyle={{ color: '#6366f1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<Space size={4}><BarChartOutlined style={{ color: '#52c41a' }} />Inventory Value</Space>}
              value={totalValue} precision={2} prefix="₹"
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<Space size={4}><WarningOutlined style={{ color: lowStockCount > 0 ? '#faad14' : '#52c41a' }} />Low Stock Items</Space>}
              value={lowStockCount}
              valueStyle={{ color: lowStockCount > 0 ? '#faad14' : '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder="Search products..." value={search}
                onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select value={stockFilter} onChange={setStockFilter} placeholder="Stock filter" allowClear style={{ width: '100%' }}>
                <Select.Option value="in">In Stock</Select.Option>
                <Select.Option value="low">Low Stock</Select.Option>
                <Select.Option value="out">Out of Stock</Select.Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} products` }}
          scroll={{ x: 900 }} locale={{ emptyText: 'No products yet' }} />
      </Card>

      <Modal
        title={edit ? 'Edit Product' : 'Add Product'}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={edit ? 'Update' : 'Save'}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
            <Input placeholder="Product name" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hsn" label="HSN Code"><Input placeholder="HSN" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Unit"><Input placeholder="pcs, kg..." /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="Selling Price (₹)" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="taxRate" label="Tax Rate">
                <Select>
                  {[0, 5, 12, 18, 28].map(t => <Select.Option key={t} value={t}>{t}%</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stock" label="Current Stock">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minStock" label="Min Stock Alert">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={<Space><PlusCircleOutlined style={{ color: '#13c2c2' }} />Adjust Stock: {showStockAdjust?.name}</Space>}
        open={!!showStockAdjust}
        onCancel={() => setShowStockAdjust(null)}
        onOk={handleStockAdjust}
        okText="Adjust"
        width={420}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(99,102,241,0.06)', borderRadius: 8 }}>
          <Text type="secondary">Current Stock:</Text>
          <Text strong style={{ fontSize: 18, marginLeft: 8 }}>
            {Number(showStockAdjust?.stock) || 0} {showStockAdjust?.unit || 'pcs'}
          </Text>
          {Number(showStockAdjust?.minStock) > 0 && (
            <Text type="secondary" style={{ marginLeft: 16 }}>
              Min: {showStockAdjust?.minStock}
            </Text>
          )}
        </div>
        <Form form={adjustForm} layout="vertical">
          <Form.Item name="adjustment" label="Adjustment (+ to add, - to remove)" rules={[{ required: true }]}>
            <InputNumber
              style={{ width: '100%' }}
              placeholder="e.g. 10 or -5"
              onChange={(val) => {
                const newVal = (Number(showStockAdjust?.stock) || 0) + (Number(val) || 0);
                adjustForm.setFieldsValue({ newStock: Math.max(0, newVal) });
              }}
            />
          </Form.Item>
          <Form.Item name="newStock" label="New Stock (preview)">
            <InputNumber disabled style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input placeholder="e.g. Damaged, Return, Manual count" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
