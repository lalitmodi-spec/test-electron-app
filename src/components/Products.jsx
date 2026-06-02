import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Modal, Form, InputNumber, Typography,
  Row, Col, Popconfirm, message, Tag, Tooltip
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ShoppingOutlined } from '@ant-design/icons';
import db, { logActivity } from '../db';

const { Title, Text } = Typography;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setProducts(await db.products.reverse().toArray());
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

  const filtered = products.filter(p => {
    const match = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.hsn?.includes(search);
    if (!stockFilter) return match;
    const stock = Number(p.stock) || 0;
    if (stockFilter === 'low') return match && stock <= (Number(p.minStock) || 0) && stock > 0;
    if (stockFilter === 'out') return match && stock === 0;
    if (stockFilter === 'in') return match && stock > 0;
    return match;
  });

  const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 0)).length;

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t}</Text> },
    { title: 'HSN', dataIndex: 'hsn', key: 'hsn', render: (t) => t || '-' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit', render: (t) => t || 'pcs' },
    {
      title: 'Price', dataIndex: 'price', key: 'price', align: 'right',
      render: (v, r) => <><Text>₹{Number(v).toFixed(2)}</Text> <Text type="secondary">({r.taxRate || 0}%)</Text></>,
      sorter: (a, b) => Number(a.price) - Number(b.price),
    },
    {
      title: 'Stock', dataIndex: 'stock', key: 'stock', align: 'center',
      render: (v, r) => {
        const stock = Number(v) || 0;
        const min = Number(r.minStock) || 0;
        const isLow = stock <= min && stock > 0;
        const isOut = stock === 0;
        return (
          <div>
            <Tag color={isOut ? 'error' : isLow ? 'warning' : 'success'}>
              {isOut ? 'Out' : isLow ? 'Low' : stock} {r.unit || 'pcs'}
            </Tag>
            {min > 0 && <div><Text type="secondary" style={{ fontSize: 11 }}>min: {min}</Text></div>}
          </div>
        );
      },
      sorter: (a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0),
    },
    {
      title: '', key: 'actions', width: 100, align: 'right',
      render: (_, r) => (
        <Space>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Product</Button>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
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

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} products` }}
          scroll={{ x: 700 }} locale={{ emptyText: 'No products yet' }} />
      </Card>

      <Modal
        title={edit ? 'Edit Product' : 'Add Product'}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={edit ? 'Update' : 'Save'}
        width={500}
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
              <Form.Item name="price" label="Price (₹)" rules={[{ required: true }]}>
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
    </div>
  );
}
