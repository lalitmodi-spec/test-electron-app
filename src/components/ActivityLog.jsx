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
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;

const TYPE_CONFIG = {
  create: { color: '#52c41a', icon: <FileTextOutlined /> },
  update: { color: '#6366f1', icon: <SettingOutlined /> },
  delete: { color: '#ff4d4f', icon: <DeleteFilled /> },
  payment: { color: '#52c41a', icon: <DollarOutlined /> },
  purchase: { color: '#13c2c2', icon: <ShoppingCartOutlined /> },
  invoice: { color: '#6366f1', icon: <FileTextOutlined /> },
  credit_note: { color: '#722ed1', icon: <AuditOutlined /> },
  expense: { color: '#faad14', icon: <WalletOutlined /> },
  vendor: { color: '#eb2f96', icon: <UserOutlined /> },
  customer: { color: '#52c41a', icon: <UserOutlined /> },
  settings: { color: '#6366f1', icon: <SettingOutlined /> },
  export: { color: '#6366f1', icon: <FileTextOutlined /> },
  import: { color: '#fa8c16', icon: <FileTextOutlined /> },
  system: { color: '#ff4d4f', icon: <WarningOutlined /> },
};

const TYPE_TRANSLATION_KEY = {
  credit_note: 'creditNote',
};

export default function ActivityLog() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  function getTypeTag(type) {
    const cfg = TYPE_CONFIG[type] || { color: '#6366f1', icon: <ClockCircleOutlined /> };
    const key = TYPE_TRANSLATION_KEY[type] || type;
    return (
      <Tag color={cfg.color} style={{ margin: 0 }}>
        {cfg.icon} {t(`activity.${key}`)}
      </Tag>
    );
  }

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
    message.success(t('activity.clearLog'));
    load();
  }

  const typeOptions = Object.keys(TYPE_CONFIG);

  const columns = [
    {
      title: t('activity.timestamp'), dataIndex: 'timestamp', key: 'timestamp', width: 170,
      render: (ts) => {
        const d = new Date(ts);
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
      title: t('activity.type'), dataIndex: 'type', key: 'type', width: 120,
      render: (type) => getTypeTag(type),
    },
    {
      title: t('activity.message'), dataIndex: 'message', key: 'message',
      render: (msg) => <Text>{msg}</Text>,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>{t('activity.title')}</Title>
          <Text type="secondary">{t('activity.title')}</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>{t('common.refresh')}</Button>
            <Popconfirm title={t('activity.clearLog')} description={t('msg.noUndo')}
              onConfirm={handleClear}>
              <Button danger icon={<DeleteOutlined />}>{t('activity.clearLog')}</Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic
              title={<Space size={4}><ClockCircleOutlined style={{ color: '#6366f1' }} />{t('activity.total')}</Space>}
              value={total}
              valueStyle={{ color: '#6366f1', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic
              title={<Space size={4}><DollarOutlined style={{ color: '#52c41a' }} />{t('activity.payment')}</Space>}
              value={items.filter(i => i.type === 'payment').length}
              suffix={`${t('common.total')} ${total}`}
              valueStyle={{ color: '#52c41a', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}>
            <Statistic
              title={<Space size={4}><ShoppingCartOutlined style={{ color: '#faad14' }} />{t('activity.purchase')}</Space>}
              value={items.filter(i => i.type === 'purchase').length}
              suffix={`${t('common.total')} ${total}`}
              valueStyle={{ color: '#faad14', fontSize: 22 }}
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
            <Col xs={24} sm={12} md={6}>
              <Select value={typeFilter} onChange={setTypeFilter} placeholder={t('activity.type')} allowClear style={{ width: '100%' }}>
                {typeOptions.map(typeVal => {
                  const key = TYPE_TRANSLATION_KEY[typeVal] || typeVal;
                  return (
                    <Select.Option key={typeVal} value={typeVal}>
                      {t(`activity.${key}`)}
                    </Select.Option>
                  );
                })}
              </Select>
            </Col>
          </Row>
        </div>
        <Table dataSource={items} columns={columns} rowKey="id" loading={loading}
          pagination={{
            current: page, pageSize, total,
            onChange: setPage,
            showTotal: (totalCount) => `${totalCount} ${t('activity.total').toLowerCase()}`,
            showSizeChanger: false,
          }}
          scroll={{ x: 600 }} locale={{ emptyText: t('msg.noData') }} />
      </Card>
    </div>
  );
}
