import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, Space, Modal, Form, Typography,
  Row, Col, Popconfirm, message, Tag, Tooltip, Statistic, Descriptions
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  UserOutlined, ShoppingCartOutlined, BankOutlined, PhoneOutlined,
  MailOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { getVendors, addVendor, updateVendor, deleteVendor, getVendorPurchaseSummary } from '../db';

const { Title, Text } = Typography;

export default function Vendors() {
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
      message.success('Vendor updated');
    } else {
      await addVendor(values);
      message.success('Vendor added');
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, name) {
    await deleteVendor(id, name);
    message.success(`Deleted ${name}`);
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
      title: 'Name', dataIndex: 'name', key: 'name',
      render: (t, r) => (
        <Space>
          <Text strong>{t}</Text>
          {r.company && <Text type="secondary" style={{ fontSize: 12 }}>({r.company})</Text>}
        </Space>
      ),
    },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (t) => t || '-', responsive: ['md'] },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (t) => t || '-', responsive: ['lg'] },
    {
      title: 'GSTIN', dataIndex: 'gstin', key: 'gstin',
      render: (t) => t ? <Tag color="purple">{t}</Tag> : '-',
    },
    {
      title: 'Purchases', key: 'purchases', align: 'center', width: 100,
      render: (_, r) => {
        return (
          <Button type="link" size="small" icon={<ShoppingCartOutlined />}
            onClick={() => openDetail(r)}>
            View
          </Button>
        );
      },
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
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Vendors & Suppliers</Title>
          <Text type="secondary">{vendors.length} vendors</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Vendor</Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic
              title={<Space size={4}><UserOutlined style={{ color: '#6366f1' }} />Total Vendors</Space>}
              value={vendors.length}
              valueStyle={{ color: '#6366f1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><BankOutlined style={{ color: '#52c41a' }} />With GSTIN</Space>}
              value={vendors.filter(v => v.gstin).length}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #13c2c2' } }}>
            <Statistic
              title={<Space size={4}><PhoneOutlined style={{ color: '#13c2c2' }} />With Phone</Space>}
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
              <Input prefix={<SearchOutlined />} placeholder="Search by name, company or phone..."
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
          </Row>
        </div>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} vendors` }}
          scroll={{ x: 700 }} locale={{ emptyText: 'No vendors yet' }} />
      </Card>

      <Modal
        title={edit ? 'Edit Vendor' : 'Add Vendor'}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={edit ? 'Update' : 'Save'}
        width={550}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Vendor Name *" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined />} placeholder="Vendor name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="company" label="Company Name">
                <Input placeholder="Company name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input prefix={<PhoneOutlined />} placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input prefix={<MailOutlined />} placeholder="Email address" type="email" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gstin" label="GSTIN">
                <Input placeholder="GSTIN" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="Address">
                <Input prefix={<EnvironmentOutlined />} placeholder="Address" />
              </Form.Item>
            </Col>
          </Row>
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
              <Descriptions.Item label="Company">{detailVendor.company || '-'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{detailVendor.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailVendor.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="GSTIN">{detailVendor.gstin ? <Tag color="purple">{detailVendor.gstin}</Tag> : '-'}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{detailVendor.address || '-'}</Descriptions.Item>
            </Descriptions>

            {detailData && (
              <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: 10, padding: 16 }}>
                <Title level={5} style={{ margin: '0 0 12px' }}>Purchase Summary</Title>
                <Row gutter={16}>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#6366f1' }}>₹{detailData.totalCost.toFixed(2)}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Total Purchases</Text>
                  </Col>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>{detailData.totalQty}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Total Quantity</Text>
                  </Col>
                  <Col span={8} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#faad14' }}>{detailData.count}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Transactions</Text>
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
