import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, InputNumber, Space, Drawer, Form, Typography,
  Row, Col, Popconfirm, message, Tag, Tooltip, Tabs, Statistic, Descriptions
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  EyeOutlined, TeamOutlined, DollarOutlined, WalletOutlined, RiseOutlined, FallOutlined,
  PhoneOutlined, MailOutlined, GlobalOutlined, BankOutlined, UploadOutlined
} from '@ant-design/icons';
import { useRef } from 'react';
import db, { logActivity, getCustomerPaymentSummary, getInvoicesForCustomer, getPaymentsForCustomer } from '../db';
import { useLanguage } from '../i18n/LanguageContext';
import { readCSVFile, mapFields } from '../utils/csvImport';

const { Title, Text } = Typography;

export default function Customers() {
  const { t } = useLanguage();
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
  const csvInputRef = useRef(null);

  async function handleCSVImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { rows } = await readCSVFile(file);
      let imported = 0;
      for (const row of rows) {
        const mapped = mapFields(row);
        if (mapped.name) {
          await db.customers.add({
            name: mapped.name,
            phone: mapped.phone || '',
            email: mapped.email || '',
            gstin: mapped.gstin || '',
            address: mapped.address || '',
            city: mapped.city || '',
            state: mapped.state || '',
            pincode: mapped.pincode || '',
            companyName: mapped.companyName || '',
            createdAt: new Date().toISOString(),
          });
          imported++;
        }
      }
      message.success(`${imported} ${t('customer.title')} ${t('msg.imported')}`);
      await logActivity('import', `Imported ${imported} customers from CSV`);
      load();
    } catch (err) { message.error(t('msg.error') + ': ' + err.message); }
    e.target.value = '';
  }

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
      message.success(t('msg.updated'));
    } else {
      await db.customers.add({ ...values, createdAt: new Date().toISOString() });
      await logActivity('create', `Added customer: ${values.name}`);
      message.success(t('msg.saved'));
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, name) {
    await db.customers.delete(id);
    await logActivity('delete', `Deleted customer: ${name}`);
    message.success(`${t('msg.deleted')} ${name}`);
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
      title: t('common.name'), dataIndex: 'name', key: 'name',
      render: (val, r) => (
        <Space>
          <Text strong>{val}</Text>
          {r.companyName && <Text type="secondary" style={{ fontSize: 12 }}>({r.companyName})</Text>}
        </Space>
      ),
    },
    { title: t('common.phone'), dataIndex: 'phone', key: 'phone', render: (val) => val || '-' },
    {
      title: t('customer.gstin'), dataIndex: 'gstin', key: 'gstin',
      render: (val) => val ? <Tag color="blue">{val}</Tag> : '-'
    },
    {
      title: t('customer.outstanding'), key: 'outstanding', width: 140, align: 'right',
      render: (_, r) => {
        const s = summaryMap[r.id];
        if (!s || s.invoiceCount === 0) return <Text type="secondary">-</Text>;
        return (
          <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
            {s.pending > 0 ? (
              <Text strong style={{ color: '#ff4d4f' }}>₹{s.pending.toFixed(2)}</Text>
            ) : (
              <Text strong style={{ color: '#52c41a' }}>{t('msg.settled')}</Text>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>{s.invoiceCount} {t('common.amount').toLowerCase()}{s.invoiceCount > 1 ? 's' : ''}</Text>
          </Space>
        );
      },
    },
    {
      title: '', key: 'actions', width: 140, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('common.view')}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
          </Tooltip>
          <Tooltip title={t('common.edit')}><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title={`${t('common.delete')} ${r.name}?`} onConfirm={() => handleDelete(r.id, r.name)}>
            <Tooltip title={t('common.delete')}><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    },
  ];

  const formFields = (
    <Form form={form} layout="vertical">
      <Tabs items={[
        {
          key: 'basic', label: t('customer.basicInfo'),
          children: (
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="name" label={`${t('customer.contactPerson')} *`} rules={[{ required: true }]}>
                  <Input placeholder={t('customer.contactPerson')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="companyName" label={t('customer.companyName')}>
                  <Input placeholder={t('customer.companyName')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label={t('customer.phone')}><Input placeholder={t('placeholder.phone')} /></Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="email" label={t('customer.email')}><Input placeholder={t('placeholder.email')} type="email" /></Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="gstin" label={t('customer.gstin')}><Input placeholder={t('customer.gstin')} /></Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="stateCode" label={t('customer.stateCode')}><Input placeholder={t('customer.stateCode')} /></Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item name="pincode" label={t('customer.pincode')}><Input placeholder={t('customer.pincode')} /></Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="pan" label={t('customer.pan')}><Input placeholder={t('customer.pan')} /></Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="alternatePhone" label={t('customer.altPhone')}>
                  <Input prefix={<PhoneOutlined />} placeholder={t('customer.altPhone')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="creditLimit" label={`${t('customer.creditLimit')} (₹)`}>
                  <InputNumber min={0} step={1000} prefix="₹" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="openingBalance" label={`${t('customer.openingBalance')} (₹)`}>
                  <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )
        },
        {
          key: 'address', label: t('customer.addresses'),
          children: (
            <>
              <Form.Item name="address" label={t('customer.billingAddress')}>
                <Input.TextArea rows={2} placeholder={t('customer.billingAddress')} />
              </Form.Item>
              <Form.Item name="shippingAddress" label={t('customer.shippingAddress')}>
                <Input.TextArea rows={2} placeholder={t('customer.shippingAddress')} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="state" label={t('customer.state')}><Input placeholder={t('customer.state')} /></Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="city" label={t('customer.city')}><Input placeholder={t('customer.city')} /></Form.Item>
                </Col>
              </Row>
              <Form.Item name="notes" label={t('customer.notes')}>
                <Input.TextArea rows={2} placeholder={t('placeholder.notes')} />
              </Form.Item>
            </>
          )
        },
      ]} />
    </Form>
  );

  const detailTabs = detailData ? [
    {
      key: 'invoices',
      label: `${t('customer.invoices')} (${detailData.invoices.length})`,
      children: (
        <Table dataSource={detailData.invoices} rowKey="id" pagination={false} size="small"
          columns={[
            { title: t('customer.invoices'), dataIndex: 'invoiceNo', key: 'invoiceNo', render: (val) => <Text strong style={{ color: 'var(--accent)' }}>{val}</Text> },
            { title: t('common.date'), dataIndex: 'date', key: 'date', width: 100 },
            {
              title: t('common.amount'), dataIndex: 'grandTotal', key: 'grandTotal', align: 'right', width: 110,
              render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>,
            },
            {
              title: t('common.paid'), dataIndex: 'paidAmount', key: 'paidAmount', align: 'right', width: 110,
              render: (v) => <Text style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text>,
            },
            {
              title: t('common.amount'), dataIndex: 'balance', key: 'balance', align: 'right', width: 110,
              render: (v) => v > 0
                ? <Text style={{ color: '#ff4d4f' }}>₹{Number(v).toFixed(2)}</Text>
                : <Tag color="success" style={{ margin: 0 }}>{t('common.paid')}</Tag>,
            },
            {
              title: t('common.status'), dataIndex: 'status', key: 'status', width: 90,
              render: (s) => {
                const map = { paid: 'success', partial: 'warning', unpaid: 'error' };
                const statusKey = s || 'unpaid';
                return <Tag color={map[statusKey] || 'default'}>{t(`common.${statusKey}`)}</Tag>;
              },
            },
          ]}
        />
      ),
    },
    {
      key: 'payments',
      label: `${t('customer.payments')} (${detailData.payments.length})`,
      children: (
        <Table dataSource={detailData.payments} rowKey="id" pagination={false} size="small"
          columns={[
            { title: t('common.date'), dataIndex: 'date', key: 'date', width: 100 },
            { title: t('customer.invoices'), dataIndex: 'invoiceNo', key: 'invoiceNo', render: (val) => <Text strong style={{ color: 'var(--accent)' }}>{val}</Text> },
            {
              title: t('common.amount'), dataIndex: 'amount', key: 'amount', align: 'right', width: 110,
              render: (v) => <Text strong style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text>,
            },
            { title: t('common.actions'), dataIndex: 'method', key: 'method', width: 100, render: (val) => <Tag>{val}</Tag> },
            { title: t('common.notes'), dataIndex: 'reference', key: 'reference', render: (val) => val || '-' },
          ]}
          locale={{ emptyText: t('msg.noData') }}
        />
      ),
    },
  ] : [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space align="center" size={14}>
              <div className="gradient-icon">
                <TeamOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('customer.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{customers.length} {t('customer.title').toLowerCase()}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <input type="file" accept=".csv" ref={csvInputRef} style={{ display: 'none' }} onChange={handleCSVImport} />
              <Button icon={<UploadOutlined />} onClick={() => csvInputRef.current?.click()}>
                {t('common.import')} CSV
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {t('customer.addTitle')}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid var(--accent)' } }}>
            <Statistic title={t('customer.totalCustomers')} value={customers.length} prefix={<WalletOutlined />} valueStyle={{ color: 'var(--accent)' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic title={t('customer.totalBilled')} value={totalBilled} precision={2} prefix="₹" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #ff4d4f' } }}>
            <Statistic title={t('customer.outstanding')} value={totalOutstanding} precision={2} prefix="₹"
              valueStyle={{ color: totalOutstanding > 0 ? '#ff4d4f' : '#52c41a' }} />
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
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} ${t('customer.title').toLowerCase()}` }}
          scroll={{ x: 800 }} locale={{ emptyText: <div style={{ textAlign: 'center', padding: '40px 20px' }}><TeamOutlined style={{ fontSize: 48, color: 'var(--text-secondary)', marginBottom: 16, display: 'block' }} /><Text type="secondary">{t('msg.noData')}</Text></div> }}
          expandable={{
            expandedRowRender: (r) => (
              <div style={{ padding: 8 }}>
                <Row gutter={24}>
                  <Col span={12}>
                    <Text type="secondary">{t('customer.billingAddress')}:</Text>
                    <div style={{ fontSize: 13 }}>{r.address || '-'}</div>
                    {r.city && <div style={{ fontSize: 13 }}>{r.city}{r.state ? `, ${r.state}` : ''}{r.pincode ? ` - ${r.pincode}` : ''}</div>}
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">{t('customer.shippingAddress')}:</Text>
                    <div style={{ fontSize: 13 }}>{r.shippingAddress || r.address || '-'}</div>
                  </Col>
                </Row>
                <Row gutter={24} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Text type="secondary">{t('customer.stateCode')}:</Text>
                    <span style={{ marginLeft: 8 }}>{r.stateCode || '-'}</span>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">{t('customer.contactPerson')}:</Text>
                    <span style={{ marginLeft: 8 }}>{r.phone || '-'}{r.email ? ` | ${r.email}` : ''}</span>
                  </Col>
                </Row>
                {summaryMap[r.id]?.pending > 0 && (
                  <Row style={{ marginTop: 8 }}>
                    <Col>
                      <Tag color="red" style={{ fontSize: 12 }}>
                        {t('customer.outstanding')}: ₹{summaryMap[r.id].pending.toFixed(2)}
                      </Tag>
                    </Col>
                  </Row>
                )}
              </div>
            ),
          }}
        />
      </Card>

      <Drawer
        title={edit ? t('customer.editTitle') : t('customer.addTitle')}
        open={showForm}
        onClose={() => setShowForm(false)}
        placement="right"
        width={520}
        extra={
          <Space>
            <Button onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleSave}>{edit ? t('common.update') : t('common.save')}</Button>
          </Space>
        }
      >
        {formFields}
      </Drawer>

      <Drawer
        title={
          <Space>
            <Text strong>{detailCustomer?.name}</Text>
            {detailCustomer?.companyName && <Text type="secondary">({detailCustomer.companyName})</Text>}
            {detailCustomer?.gstin && <Tag color="blue">{detailCustomer.gstin}</Tag>}
          </Space>
        }
        open={!!detailCustomer}
        onClose={() => { setDetailCustomer(null); setDetailData(null); }}
        placement="right"
        width={520}
        loading={detailLoading}
      >
        {detailData && (
          <div>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('common.phone')}>{detailCustomer?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.email')}>{detailCustomer?.email || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.pan')}>{detailCustomer?.pan || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.altPhone')}>{detailCustomer?.alternatePhone || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.state')}>{detailCustomer?.state || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.stateCode')}>{detailCustomer?.stateCode || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.creditLimit')}>{detailCustomer?.creditLimit ? `₹${Number(detailCustomer.creditLimit).toFixed(2)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.openingBalance')}>{detailCustomer?.openingBalance ? `₹${Number(detailCustomer.openingBalance).toFixed(2)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.billingAddress')}>{detailCustomer?.address || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.shippingAddress')}>{detailCustomer?.shippingAddress || '-'}</Descriptions.Item>
              {detailCustomer?.notes && <Descriptions.Item label={t('customer.notes')} span={2}>{detailCustomer.notes}</Descriptions.Item>}
            </Descriptions>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
              <Col xs={8}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(var(--accent-rgb), 0.08)' }}>
                  <RiseOutlined style={{ color: 'var(--accent)', fontSize: 18 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                    ₹{detailData.summary.totalBilled.toFixed(2)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{t('customer.totalBilled')}</Text>
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(82,196,26,0.08)' }}>
                  <FallOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
                    ₹{detailData.summary.totalPaid.toFixed(2)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{t('customer.totalPaid')}</Text>
                </Card>
              </Col>
              <Col xs={8}>
                <Card size="small" style={{ textAlign: 'center', background: detailData.summary.pending > 0 ? 'rgba(255,77,79,0.08)' : 'rgba(82,196,26,0.08)' }}>
                  <DollarOutlined style={{ color: detailData.summary.pending > 0 ? '#ff4d4f' : '#52c41a', fontSize: 18 }} />
                  <div style={{ fontSize: 20, fontWeight: 700, color: detailData.summary.pending > 0 ? '#ff4d4f' : '#52c41a', marginTop: 4 }}>
                    ₹{detailData.summary.pending.toFixed(2)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{detailData.summary.pending > 0 ? t('common.unpaid') : t('msg.settled')}</Text>
                </Card>
              </Col>
            </Row>

            <Tabs items={detailTabs} />
          </div>
        )}
      </Drawer>
    </div>
  );
}
