import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Typography,
  Row, Col, Tag, Tooltip, Popconfirm, message, Statistic
} from 'antd';
import {
  SearchOutlined, DeleteOutlined, ClockCircleOutlined,
  FileTextOutlined, ShoppingCartOutlined, UserOutlined, DollarOutlined,
  WalletOutlined, SettingOutlined, AuditOutlined, WarningOutlined,
  DeleteFilled, ReloadOutlined
} from '@ant-design/icons';
import { getActivityLog, clearActivityLog } from '../db';

const { Title, Text } = Typography;

const TYPE_CONFIG = {
  create: { color: '#52c41a', icon: <FileTextOutlined />, label: 'Created' },
  update: { color: '#6366f1', icon: <SettingOutlined />, label: 'Updated' },
  delete: { color: '#ff4d4f', icon: <DeleteFilled />, label: 'Deleted' },
  payment: { color: '#52c41a', icon: <DollarOutlined />, label: 'Payment' },
  purchase: { color: '#13c2c2', icon: <ShoppingCartOutlined />, label: 'Purchase' },
  invoice: { color: '#6366f1', icon: <FileTextOutlined />, label: 'Invoice' },
  credit_note: { color: '#722ed1', icon: <AuditOutlined />, label: 'Credit Note' },
  expense: { color: '#faad14', icon: <WalletOutlined />, label: 'Expense' },
  vendor: { color: '#eb2f96', icon: <UserOutlined />, label: 'Vendor' },
  customer: { color: '#52c41a', icon: <UserOutlined />, label: 'Customer' },
  settings: { color: '#6366f1', icon: <SettingOutlined />, label: 'Settings' },
  export: { color: '#6366f1', icon: <FileTextOutlined />, label: 'Export' },
  import: { color: '#fa8c16', icon: <FileTextOutlined />, label: 'Import' },
  system: { color: '#ff4d4f', icon: <WarningOutlined />, label: 'System' },
};

function getTypeTag(type) {
  const cfg = TYPE_CONFIG[type] || { color: '#6366f1', icon: <ClockCircleOutlined />, label: type };
  return (
    <Tag color={cfg.color} style={{ margin: 0 }}>
      {cfg.icon} {cfg.label}
    </Tag>
  );
}

export default function ActivityLog() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  async function load() {
    setLoading(true);
    const result = await getActivityLog({
      type: typeFilter || undefined,
      search: search || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    setItems(result.items);
    setTotal(result.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [typeFilter, page, search]);

  function handleRefresh() { load(); }

  async function handleClear() {
    await clearActivityLog();
    message.success('Activity log cleared');
    load();
  }

  const types = Object.keys(TYPE_CONFIG);

  const columns = [
    {
      title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', width: 170,
      render: (t) => {
        const d = new Date(t);
        const now = new Date();
        const diff = now - d;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        let rel;
        if (mins < 1) rel = 'Just now';
        else if (mins < 60) rel = `${mins}m ago`;
        else if (hours < 24) rel = `${hours}h ago`;
        else if (days < 7) rel = `${days}d ago`;
        else rel = d.toLocaleDateString();
        return (
          <Tooltip title={d.toLocaleString()}>
            <Text style={{ fontSize: 12 }}>{rel}</Text>
          </Tooltip>
        );
      },
      sorter: (a, b) => a.timestamp?.localeCompare(b.timestamp),
    },
    {
      title: 'Type', dataIndex: 'type', key: 'type', width: 120,
      render: (t) => getTypeTag(t),
    },
    {
      title: 'Action', dataIndex: 'message', key: 'message',
      render: (t) => <Text>{t}</Text>,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Activity Log</Title>
          <Text type="secondary">Track all actions across the system</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>Refresh</Button>
            <Popconfirm title="Clear all activity log?" description="This cannot be undone!"
              onConfirm={handleClear}>
              <Button danger icon={<DeleteOutlined />}>Clear Log</Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic
              title={<Space size={4}><ClockCircleOutlined style={{ color: '#6366f1' }} />Total Events</Space>}
              value={total}
              valueStyle={{ color: '#6366f1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><DollarOutlined style={{ color: '#52c41a' }} />Payments</Space>}
              value={items.filter(i => i.type === 'payment').length}
              suffix={`of ${total}`}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}>
            <Statistic
              title={<Space size={4}><ShoppingCartOutlined style={{ color: '#faad14' }} />Purchases</Space>}
              value={items.filter(i => i.type === 'purchase').length}
              suffix={`of ${total}`}
              valueStyle={{ color: '#faad14', fontSize: 22 }}
            />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder="Search actions..."
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select value={typeFilter} onChange={setTypeFilter} placeholder="All Types" allowClear style={{ width: '100%' }}>
                {types.map(t => (
                  <Select.Option key={t} value={t}>
                    {TYPE_CONFIG[t]?.label || t}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>
        <Table dataSource={items} columns={columns} rowKey="id" loading={loading}
          pagination={{
            current: page, pageSize, total,
            onChange: setPage,
            showTotal: (t) => `${t} events`,
            showSizeChanger: false,
          }}
          scroll={{ x: 600 }} locale={{ emptyText: 'No activity yet' }} />
      </Card>
    </div>
  );
}
