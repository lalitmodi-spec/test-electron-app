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
import db, { getSettings, logActivity, getPurchaseSummary, adjustProductStock } from '../db';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;

export default function Products() {
  const { t } = useLanguage();
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
  const [productCategories, setProductCategories] = useState([]);

  async function load() {
    setLoading(true);
    const [data, settings] = await Promise.all([
      db.products.reverse().toArray(),
      getSettings(),
    ]);
    setProducts(data);
    if (settings.productCategories) {
      try { setProductCategories(JSON.parse(settings.productCategories)); }
      catch { setProductCategories([]); }
    }
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
    form.setFieldsValue({ taxRate: 18, unit: 'pcs', stock: 0, minStock: 0, taxPreference: 'taxable' });
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
      message.success(t('msg.updated'));
    } else {
      await db.products.add({ ...data, createdAt: new Date().toISOString() });
      await logActivity('create', `Added product: ${data.name}`);
      message.success(t('msg.saved'));
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, name) {
    await db.products.delete(id);
    await logActivity('delete', `Deleted product: ${name}`);
    message.success(`${t('msg.deleted')} ${name}`);
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
    message.success(`${t('msg.stockAdjusted')}: ${newStock}`);
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
      title: t('product.productName'), dataIndex: 'name', key: 'name',
      render: (val) => <Text strong>{val}</Text>,
    },
    { title: t('product.sku'), dataIndex: 'sku', key: 'sku', render: (val) => val ? <Text code style={{ fontSize: 11 }}>{val}</Text> : '-', responsive: ['md'] },
    { title: t('product.category'), dataIndex: 'category', key: 'category', render: (val) => val ? <Tag>{val}</Tag> : '-', responsive: ['lg'] },
    { title: t('product.hsn'), dataIndex: 'hsn', key: 'hsn', render: (val) => val || '-', responsive: ['md'] },
    { title: t('product.unit'), dataIndex: 'unit', key: 'unit', render: (val) => val || 'pcs', width: 60 },
    {
      title: t('product.sellingPrice'), dataIndex: 'price', key: 'price', align: 'right',
      render: (v, r) => (
        <Space size={2} direction="vertical" style={{ textAlign: 'right', lineHeight: 1.2 }}>
          <Text>₹{Number(v).toFixed(2)}</Text>
          <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>{r.taxRate || 0}%</Tag>
        </Space>
      ),
      sorter: (a, b) => Number(a.price) - Number(b.price),
    },
    {
      title: t('product.stock'), dataIndex: 'stock', key: 'stock', align: 'center',
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
                {isOut ? t('product.outOfStock') : isLow ? t('product.lowStock') : `${stock}`}
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
              <Text type="secondary" style={{ fontSize: 10 }}>{t('product.minStock')}: {min}</Text>
            )}
          </div>
        );
      },
      sorter: (a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0),
    },
    {
      title: t('product.purchased'), key: 'purchased', align: 'center', width: 100,
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
          <Tooltip title={t('product.adjustStock')}>
            <Button size="small" icon={<PlusCircleOutlined />}
              style={{ color: '#13c2c2' }}
              onClick={() => openStockAdjust(r)} />
          </Tooltip>
          <Tooltip title={t('product.recordPurchase')}>
            <Button size="small" icon={<ShoppingCartOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => navigate('/purchases')} />
          </Tooltip>
          <Tooltip title={t('common.edit')}><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title={`${t('common.delete')} ${r.name}?`} onConfirm={() => handleDelete(r.id, r.name)}>
            <Tooltip title={t('common.delete')}><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>{t('product.title')}</Title>
          <Text type="secondary">
            {products.length} {t('product.products').toLowerCase()}
            {lowStockCount > 0 && <Text type="danger"> • {lowStockCount} {t('product.lowStock').toLowerCase()}</Text>}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ShoppingCartOutlined />} onClick={() => navigate('/purchases')}>
              {t('product.purchased')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('product.addTitle')}
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<Space size={4}><ShoppingOutlined style={{ color: '#6366f1' }} />{t('product.products')}</Space>}
              value={products.length}
              valueStyle={{ color: '#6366f1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<Space size={4}><BarChartOutlined style={{ color: '#52c41a' }} />{t('product.inventoryValue')}</Space>}
              value={totalValue} precision={2} prefix="₹"
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={<Space size={4}><WarningOutlined style={{ color: lowStockCount > 0 ? '#faad14' : '#52c41a' }} />{t('product.lowStockItems')}</Space>}
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
              <Input prefix={<SearchOutlined />} placeholder={t('placeholder.search')} value={search}
                onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select value={stockFilter} onChange={setStockFilter} placeholder={t('product.stock')} allowClear style={{ width: '100%' }}>
                <Select.Option value="in">{t('product.inStock')}</Select.Option>
                <Select.Option value="low">{t('product.lowStock')}</Select.Option>
                <Select.Option value="out">{t('product.outOfStock')}</Select.Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} ${t('product.products').toLowerCase()}` }}
          scroll={{ x: 900 }} locale={{ emptyText: t('msg.noData') }} />
      </Card>

      <Modal
        title={edit ? t('product.editTitle') : t('product.addTitle')}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={edit ? t('common.update') : t('common.save')}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={`${t('product.productName')} *`} rules={[{ required: true }]}>
            <Input placeholder={t('product.productName')} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sku" label={t('product.sku')}><Input placeholder={t('product.sku')} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="barcode" label={t('product.barcode')}><Input placeholder={t('product.barcode')} /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hsn" label={t('product.hsn')}><Input placeholder={t('placeholder.hsn')} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label={t('product.unit')}><Input placeholder={t('product.unit')} /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label={t('product.category')}>
                <Select allowClear>
                  {productCategories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="brand" label={t('product.brand')}><Input placeholder={t('product.brand')} /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label={`${t('product.sellingPrice')} (₹)`} rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purchasePrice" label={`${t('product.purchasePrice')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="taxRate" label={t('product.taxRate')}>
                <Select>
                  {[0, 5, 12, 18, 28].map(rate => <Select.Option key={rate} value={rate}>{t('taxRates.' + rate)}%</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="taxPreference" label={t('product.taxPreference')}>
                <Select>
                  <Select.Option value="taxable">{t('product.taxable')}</Select.Option>
                  <Select.Option value="exempt">{t('product.exempt')}</Select.Option>
                  <Select.Option value="nil_rated">{t('product.nilRated')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stock" label={t('product.currentStock')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="minStock" label={t('product.minStock')}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label={t('product.description')}>
            <Input.TextArea rows={2} placeholder={t('placeholder.description')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<Space><PlusCircleOutlined style={{ color: '#13c2c2' }} />{t('product.adjustStock')}: {showStockAdjust?.name}</Space>}
        open={!!showStockAdjust}
        onCancel={() => setShowStockAdjust(null)}
        onOk={handleStockAdjust}
        okText={t('product.adjustStock')}
        width={420}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, padding: 12, background: 'rgba(99,102,241,0.06)', borderRadius: 8 }}>
          <Text type="secondary">{t('product.currentStock')}:</Text>
          <Text strong style={{ fontSize: 18, marginLeft: 8 }}>
            {Number(showStockAdjust?.stock) || 0} {showStockAdjust?.unit || 'pcs'}
          </Text>
          {Number(showStockAdjust?.minStock) > 0 && (
            <Text type="secondary" style={{ marginLeft: 16 }}>
              {t('product.minStock')}: {showStockAdjust?.minStock}
            </Text>
          )}
        </div>
        <Form form={adjustForm} layout="vertical">
          <Form.Item name="adjustment" label={t('product.adjustment')} rules={[{ required: true }]}>
            <InputNumber
              style={{ width: '100%' }}
              placeholder={t('product.adjustment')}
              onChange={(val) => {
                const newVal = (Number(showStockAdjust?.stock) || 0) + (Number(val) || 0);
                adjustForm.setFieldsValue({ newStock: Math.max(0, newVal) });
              }}
            />
          </Form.Item>
          <Form.Item name="newStock" label={t('product.newStock')}>
            <InputNumber disabled style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label={t('product.reason')}>
            <Input placeholder={t('placeholder.reason')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
