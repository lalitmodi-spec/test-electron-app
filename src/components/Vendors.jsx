import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, InputNumber, Select, Space, Modal, Form, Typography,
  Row, Col, Popconfirm, message, Tag, Tooltip, Statistic, Descriptions
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  UserOutlined, ShoppingCartOutlined, BankOutlined, PhoneOutlined,
  MailOutlined, EnvironmentOutlined, IdcardOutlined, TeamOutlined
} from '@ant-design/icons';
import { getVendors, addVendor, updateVendor, deleteVendor, getVendorPurchaseSummary } from '../db';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;

const stateList = [
  { key: 'andhraPradesh', label: 'Andhra Pradesh' },
  { key: 'arunachalPradesh', label: 'Arunachal Pradesh' },
  { key: 'assam', label: 'Assam' },
  { key: 'bihar', label: 'Bihar' },
  { key: 'chhattisgarh', label: 'Chhattisgarh' },
  { key: 'goa', label: 'Goa' },
  { key: 'gujarat', label: 'Gujarat' },
  { key: 'haryana', label: 'Haryana' },
  { key: 'himachalPradesh', label: 'Himachal Pradesh' },
  { key: 'jharkhand', label: 'Jharkhand' },
  { key: 'karnataka', label: 'Karnataka' },
  { key: 'kerala', label: 'Kerala' },
  { key: 'madhyaPradesh', label: 'Madhya Pradesh' },
  { key: 'maharashtra', label: 'Maharashtra' },
  { key: 'manipur', label: 'Manipur' },
  { key: 'meghalaya', label: 'Meghalaya' },
  { key: 'mizoram', label: 'Mizoram' },
  { key: 'nagaland', label: 'Nagaland' },
  { key: 'odisha', label: 'Odisha' },
  { key: 'punjab', label: 'Punjab' },
  { key: 'rajasthan', label: 'Rajasthan' },
  { key: 'sikkim', label: 'Sikkim' },
  { key: 'tamilNadu', label: 'Tamil Nadu' },
  { key: 'telangana', label: 'Telangana' },
  { key: 'tripura', label: 'Tripura' },
  { key: 'uttarPradesh', label: 'Uttar Pradesh' },
  { key: 'uttarakhand', label: 'Uttarakhand' },
  { key: 'westBengal', label: 'West Bengal' },
  { key: 'delhi', label: 'Delhi' },
  { key: 'puducherry', label: 'Puducherry' },
  { key: 'chandigarh', label: 'Chandigarh' },
  { key: 'andamanNicobar', label: 'Andaman and Nicobar' },
  { key: 'dadraNagarHaveli', label: 'Dadra and Nagar Haveli' },
  { key: 'damanDiu', label: 'Daman and Diu' },
  { key: 'lakshadweep', label: 'Lakshadweep' },
  { key: 'ladakh', label: 'Ladakh' },
  { key: 'jammuKashmir', label: 'Jammu and Kashmir' },
];

export default function Vendors() {
  const { t } = useLanguage();
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailVendor, setDetailVendor] = useState(null);
  const [detailData, setDetailData] = useState(null);

  async function load() {
    setLoading(true);
    setVendors(await getVendors());
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
      await updateVendor(edit.id, values);
      message.success(t('msg.updated'));
    } else {
      await addVendor(values);
      message.success(t('msg.saved'));
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, name) {
    await deleteVendor(id, name);
    message.success(`${t('msg.deleted')} ${name}`);
    load();
  }

  async function openDetail(vendor) {
    setDetailVendor(vendor);
    setDetailData(null);
    const summary = await getVendorPurchaseSummary(vendor.id);
    setDetailData(summary);
  }

  const filtered = vendors.filter(v =>
    !search || v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.company?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.includes(search)
  );

  const columns = [
    {
      title: t('common.name'), dataIndex: 'name', key: 'name',
      render: (val, r) => (
        <Space>
          <Text strong>{val}</Text>
          {r.company && <Text type="secondary" style={{ fontSize: 12 }}>({r.company})</Text>}
        </Space>
      ),
    },
    { title: t('common.phone'), dataIndex: 'phone', key: 'phone', render: (val) => val || '-', responsive: ['md'] },
    { title: t('common.emailLabel'), dataIndex: 'email', key: 'email', render: (val) => val || '-', responsive: ['lg'] },
    {
      title: t('vendor.gstin'), dataIndex: 'gstin', key: 'gstin',
      render: (val) => val ? <Tag color="purple">{val}</Tag> : '-',
    },
    {
      title: t('vendor.totalPurchases'), key: 'purchases', align: 'center', width: 100,
      render: (_, r) => {
        return (
          <Button type="link" size="small" icon={<ShoppingCartOutlined />}
            onClick={() => openDetail(r)}>
            {t('common.view')}
          </Button>
        );
      },
    },
    {
      title: '', key: 'actions', width: 100, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('common.edit')}><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Popconfirm title={`${t('common.delete')} ${r.name}?`} onConfirm={() => handleDelete(r.id, r.name)}>
            <Tooltip title={t('common.delete')}><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>{t('vendor.title')}</Title>
          <Text type="secondary">{vendors.length} {t('vendor.title').toLowerCase()}</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('vendor.addTitle')}</Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic
              title={<Space size={4}><UserOutlined style={{ color: '#6366f1' }} />{t('vendor.totalVendors')}</Space>}
              value={vendors.length}
              valueStyle={{ color: '#6366f1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><BankOutlined style={{ color: '#52c41a' }} />{t('vendor.withGstin')}</Space>}
              value={vendors.filter(v => v.gstin).length}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #13c2c2' } }}>
            <Statistic
              title={<Space size={4}><PhoneOutlined style={{ color: '#13c2c2' }} />{t('vendor.withPhone')}</Space>}
              value={vendors.filter(v => v.phone).length}
              valueStyle={{ color: '#13c2c2', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder={t('placeholder.search')}
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
          </Row>
        </div>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} ${t('vendor.title').toLowerCase()}` }}
          scroll={{ x: 700 }} locale={{ emptyText: t('msg.noData') }} />
      </Card>

      <Modal
        title={edit ? t('vendor.editTitle') : t('vendor.addTitle')}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={edit ? t('common.update') : t('common.save')}
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label={`${t('vendor.vendorName')} *`} rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder={t('vendor.vendorName')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="company" label={t('vendor.companyName')}>
                <Input placeholder={t('vendor.companyName')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactPerson" label={t('vendor.contactPerson')}>
                <Input prefix={<TeamOutlined />} placeholder={t('vendor.contactPerson')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label={t('vendor.phone')}>
                <Input prefix={<PhoneOutlined />} placeholder={t('placeholder.phone')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label={t('vendor.email')}>
                <Input prefix={<MailOutlined />} placeholder={t('placeholder.email')} type="email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gstin" label={t('vendor.gstin')}>
                <Input placeholder={t('vendor.gstin')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="pan" label={t('vendor.pan')}>
                <Input prefix={<IdcardOutlined />} placeholder={t('vendor.pan')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="alternatePhone" label={t('vendor.altPhone')}>
                <Input prefix={<PhoneOutlined />} placeholder={t('vendor.altPhone')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="state" label={t('vendor.state')}>
                <Select showSearch placeholder={t('vendor.state')} allowClear>
                  {stateList.map(s => (
                    <Select.Option key={s.key} value={s.label}>{t('states.' + s.key)}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="stateCode" label={t('vendor.stateCode')}>
                <Input placeholder={t('vendor.stateCode')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label={t('vendor.address')}>
                <Input prefix={<EnvironmentOutlined />} placeholder={t('placeholder.address')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="creditLimit" label={`${t('vendor.creditLimit')} (₹)`}>
                <InputNumber min={0} step={1000} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="openingBalance" label={`${t('vendor.openingBalance')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: 8, padding: 12, margin: '8px 0' }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('common.notes')}</Text>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="bankName" label={t('vendor.bankName')}>
                  <Input placeholder={t('vendor.bankName')} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bankAccount" label={t('vendor.bankAccount')}>
                  <Input placeholder={t('vendor.bankAccount')} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bankIfsc" label={t('vendor.bankIfsc')}>
                  <Input placeholder={t('vendor.bankIfsc')} />
                </Form.Item>
              </Col>
            </Row>
          </div>
          <Form.Item name="notes" label={t('vendor.notes')}>
            <Input.TextArea rows={2} placeholder={t('placeholder.notes')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<Space><UserOutlined style={{ color: '#6366f1' }} />{detailVendor?.name}</Space>}
        open={!!detailVendor}
        onCancel={() => { setDetailVendor(null); setDetailData(null); }}
        width={600}
        footer={null}
      >
        {detailVendor && (
          <div>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('vendor.companyName')}>{detailVendor.company || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.contactPerson')}>{detailVendor.contactPerson || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.phone')}>{detailVendor.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.altPhone')}>{detailVendor.alternatePhone || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.email')}>{detailVendor.email || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.pan')}>{detailVendor.pan || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.gstin')}>{detailVendor.gstin ? <Tag color="purple">{detailVendor.gstin}</Tag> : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.state')}>{detailVendor.state || '-'}{detailVendor.stateCode ? ` (${detailVendor.stateCode})` : ''}</Descriptions.Item>
              <Descriptions.Item label={t('vendor.address')} span={2}>{detailVendor.address || '-'}</Descriptions.Item>
              {(detailVendor.bankName || detailVendor.bankAccount) && (
                <Descriptions.Item label={t('vendor.bankName')} span={2}>
                  {detailVendor.bankName || ''}{detailVendor.bankAccount ? ` | A/c: ${detailVendor.bankAccount}` : ''}{detailVendor.bankIfsc ? ` | IFSC: ${detailVendor.bankIfsc}` : ''}
                </Descriptions.Item>
              )}
              {detailVendor.notes && <Descriptions.Item label={t('vendor.notes')} span={2}>{detailVendor.notes}</Descriptions.Item>}
            </Descriptions>

            {detailData && (
              <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: 10, padding: 16 }}>
                <Title level={5} style={{ margin: '0 0 12px' }}>{t('vendor.purchaseSummary')}</Title>
                <Row gutter={16}>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#6366f1' }}>₹{detailData.totalCost.toFixed(2)}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{t('vendor.totalPurchases')}</Text>
                  </Col>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>{detailData.totalQty}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{t('vendor.totalQty')}</Text>
                  </Col>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#faad14' }}>{detailData.count}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>{t('vendor.transactions')}</Text>
                  </Col>
                </Row>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
