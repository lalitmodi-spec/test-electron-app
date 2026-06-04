import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Table, Card, Button, Input, Select, Space, Drawer, Form, Typography,
  Row, Col, Popconfirm, message, Tag, DatePicker, InputNumber, Tooltip, Statistic
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SearchOutlined, ShoppingCartOutlined,
  ImportOutlined, DollarOutlined, UserOutlined, EyeOutlined, ReloadOutlined,
  FileTextOutlined, PercentageOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { recordPurchase, logActivity } from '../db';

const { Title, Text } = Typography;

export default function Purchases() {
  const { t } = useLanguage();
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
      gstAmount: Number(values.gstAmount) || 0,
      discount: Number(values.discount) || 0,
      additionalCharges: Number(values.additionalCharges) || 0,
      invoiceRef: values.invoiceRef || '',
      paymentStatus: values.paymentStatus || 'unpaid',
      paymentMethod: values.paymentMethod || '',
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : '',
      vendorId: values.vendorId || null,
      supplier: values.vendorId ? vendors.find(v => v.id === values.vendorId)?.name || '' : values.supplier || '',
      date: values.date.format('YYYY-MM-DD'),
      note: values.note || '',
    });
    message.success(t('msg.purchaseRecorded'));
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
    message.success(t('msg.deleted'));
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
      title: t('purchase.date'), dataIndex: 'date', key: 'date', width: 100,
      sorter: (a, b) => a.date?.localeCompare(b.date),
      defaultSortOrder: 'descend',
    },
    {
      title: t('purchase.product'), dataIndex: 'productName', key: 'productName',
      render: (t) => <Text strong>{t}</Text>,
    },
    {
      title: t('purchase.qty'), dataIndex: 'quantity', key: 'quantity', align: 'center', width: 70,
      render: (v, r) => <Text>{v} <Text type="secondary" style={{ fontSize: 11 }}>{r.unit || 'pcs'}</Text></Text>,
    },
    {
      title: t('purchase.totalCost'), dataIndex: 'totalCost', key: 'totalCost', align: 'right', width: 110,
      render: (v) => <Text strong style={{ color: '#faad14' }}>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.totalCost) - Number(b.totalCost),
    },
    {
      title: t('purchase.paymentStatus'), dataIndex: 'paymentStatus', key: 'paymentStatus', width: 90,
      render: (s) => {
        const map = { paid: 'success', partial: 'warning', unpaid: 'error' };
        const status = s || 'unpaid';
        return <Tag color={map[status] || 'default'}>{t('common.' + status)}</Tag>;
      },
      responsive: ['md'],
    },
    {
      title: t('purchase.billNo'), dataIndex: 'invoiceRef', key: 'invoiceRef', width: 100,
      render: (t) => t || '-',
      responsive: ['lg'],
    },
    {
      title: t('purchase.vendor'), dataIndex: 'vendorId', key: 'vendor', width: 140,
      render: (vid) => {
        if (!vid) return <Text type="secondary">-</Text>;
        const v = vendorMap[vid];
        return v
          ? <Tag icon={<UserOutlined />} color="blue">{v.name}</Tag>
          : <Text type="secondary">-</Text>;
      },
    },
    {
      title: t('purchase.supplierName'), dataIndex: 'supplier', key: 'supplier',
      render: (t) => t || '-',
      responsive: ['md'],
    },
    {
      title: '', key: 'actions', width: 80, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('common.view')}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => setShowView(r)} />
          </Tooltip>
          <Popconfirm title={t('msg.confirmDelete')} onConfirm={() => handleDelete(r.id)}>
            <Tooltip title={t('common.delete')}><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space align="center" size={14}>
              <div className="gradient-icon">
                <ShoppingCartOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('purchase.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Stock inward management</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={load}>{t('common.refresh')}</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {t('purchase.recordPurchase')}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid var(--accent)' } }}>
            <Statistic
              title={<Space size={4}><ShoppingCartOutlined style={{ color: 'var(--accent)' }} />{t('purchase.totalCostLabel')}</Space>}
              value={totalPurchases} precision={2} prefix="₹"
              valueStyle={{ color: 'var(--accent)', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><ImportOutlined style={{ color: '#52c41a' }} />{t('purchase.totalQty')}</Space>}
              value={totalQty} suffix="units"
              valueStyle={{ color: '#52c41a', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #13c2c2' } }}>
            <Statistic
              title={<Space size={4}><UserOutlined style={{ color: '#13c2c2' }} />{t('purchase.transactions')}</Space>}
              value={filtered.length}
              valueStyle={{ color: '#13c2c2', fontSize: 20 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #fa8c16' } }}>
            <Statistic
              title={<Space size={4}><DollarOutlined style={{ color: '#fa8c16' }} />{t('purchase.avgPerTransaction')}</Space>}
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
              <Input prefix={<SearchOutlined />} placeholder={t('purchase.search')}
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
          </Row>
        </div>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} ${t('purchase.title')}` }}
          scroll={{ x: 800 }} locale={{ emptyText: <Space direction="vertical" style={{ padding: 20, textAlign: 'center' }}>
            <ShoppingCartOutlined style={{ fontSize: 40, color: 'var(--text-secondary)' }} />
            <Text type="secondary">{t('msg.noData')}</Text>
            <Button type="primary" onClick={openCreate}>{t('purchase.recordPurchase')}</Button>
          </Space>}} />
      </Card>

      <Drawer
        title={<Space><ShoppingCartOutlined style={{ color: 'var(--accent)' }} />{t('purchase.recordPurchase')}</Space>}
        open={showForm}
        onClose={() => setShowForm(false)}
        placement="right"
        width={520}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleSave}>{t('purchase.recordPurchase')}</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="productId" label={t('purchase.product')} rules={[{ required: true, message: t('placeholder.selectProduct') }]}>
                <Select showSearch placeholder={t('placeholder.selectProduct')}
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
              <Form.Item name="quantity" label={t('purchase.qty')} rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label={t('purchase.unit')}>
                <Input placeholder="pcs, kg..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="costPerUnit" label={`${t('purchase.costPerUnit')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="totalCost" label={`${t('purchase.totalCost')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gstAmount" label={`${t('purchase.gstAmount')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="discount" label={`${t('purchase.discount')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="additionalCharges" label={`${t('purchase.additionalCharges')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="date" label={t('purchase.date')} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="dueDate" label={t('purchase.dueDate')}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="paymentStatus" label={t('purchase.paymentStatus')}>
                <Select>
                  <Select.Option value="unpaid">{t('common.unpaid')}</Select.Option>
                  <Select.Option value="paid">{t('common.paid')}</Select.Option>
                  <Select.Option value="partial">{t('common.partial')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentMethod" label={t('purchase.paymentMethod')}>
                <Select allowClear>
                  <Select.Option value="Cash">{t('paymentMethods.cash')}</Select.Option>
                  <Select.Option value="UPI">{t('paymentMethods.upi')}</Select.Option>
                  <Select.Option value="Bank Transfer">{t('paymentMethods.bankTransfer')}</Select.Option>
                  <Select.Option value="Card">{t('paymentMethods.card')}</Select.Option>
                  <Select.Option value="Cheque">{t('paymentMethods.cheque')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invoiceRef" label={t('purchase.vendorBillNo')}>
                <Input prefix={<FileTextOutlined />} placeholder={t('placeholder.billNo')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vendorId" label={t('purchase.vendor')}>
                <Select showSearch placeholder={t('placeholder.selectVendor')} allowClear
                  filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
                  {vendors.map(v => (
                    <Select.Option key={v.id} value={v.id}>{v.name}{v.company ? ` - ${v.company}` : ''}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="supplier" label={t('purchase.supplierName')}>
                <Input placeholder={t('placeholder.supplier')} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label={t('purchase.note')}>
            <Input.TextArea rows={2} placeholder={t('placeholder.notes')} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={<Space><EyeOutlined style={{ color: 'var(--accent)' }} />{t('purchase.details')}</Space>}
        open={!!showView}
        onClose={() => setShowView(null)}
        placement="right"
        width={520}
      >
        {showView && (
          <div>
            <Row gutter={[16, 12]}>
              <Col span={12}><Text type="secondary">{t('purchase.product')}:</Text><br /><Text strong>{showView.productName}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.date')}:</Text><br /><Text>{showView.date}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.qty')}:</Text><br /><Text strong>{showView.quantity} {showView.unit || 'pcs'}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.costPerUnit')}:</Text><br /><Text>₹{Number(showView.costPerUnit || 0).toFixed(2)}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.totalCost')}:</Text><br /><Text strong style={{ color: '#faad14', fontSize: 18 }}>₹{Number(showView.totalCost).toFixed(2)}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.gstAmount')}:</Text><br /><Text>₹{Number(showView.gstAmount || 0).toFixed(2)}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.discount')}:</Text><br /><Text>{showView.discount ? `₹${Number(showView.discount).toFixed(2)}` : '-'}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.additionalCharges')}:</Text><br /><Text>{showView.additionalCharges ? `₹${Number(showView.additionalCharges).toFixed(2)}` : '-'}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.billNo')}:</Text><br /><Text>{showView.invoiceRef || '-'}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.paymentStatus')}:</Text><br /><Text>{t('common.' + (showView.paymentStatus || 'unpaid'))}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.dueDate')}:</Text><br /><Text>{showView.dueDate || '-'}</Text></Col>
              <Col span={12}><Text type="secondary">{t('purchase.supplierName')}:</Text><br /><Text>{showView.supplier || '-'}</Text></Col>
              {showView.note && (
                <Col span={24}><Text type="secondary">{t('purchase.note')}:</Text><br /><Text>{showView.note}</Text></Col>
              )}
              <Col span={24}><Text type="secondary">Recorded:</Text><br /><Text style={{ fontSize: 12 }}>{new Date(showView.createdAt).toLocaleString()}</Text></Col>
            </Row>
          </div>
        )}
      </Drawer>
    </div>
  );
}
