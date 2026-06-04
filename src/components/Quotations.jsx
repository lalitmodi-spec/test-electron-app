import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Button, Input, Select, Space, Tag, Drawer, Typography, Row, Col,
  Statistic, Popconfirm, message, Tooltip, Descriptions, Divider
} from 'antd';
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined,
  SearchOutlined, SwapOutlined, FileTextOutlined
} from '@ant-design/icons';
import db, { logActivity, convertQuotationToInvoice } from '../db';
import { generateQuotationPDF } from '../utils/pdfExport';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;

const statusColors = {
  draft: 'default',
  sent: 'processing',
  accepted: 'success',
  rejected: 'error',
  expired: 'warning',
  converted: 'purple',
};

export default function Quotations() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [quotations, setQuotations] = useState([]);
  const [view, setView] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const data = await db.quotations.reverse().toArray();
    setQuotations(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, no) {
    await db.quotations.delete(id);
    await logActivity('quotation', `Deleted quotation: ${no}`);
    message.success(`${t('msg.deleted')} ${no}`);
    load();
  }

  async function handlePdf(q, template) {
    await generateQuotationPDF(q, template);
    message.success(t('msg.saved'));
  }

  async function handleConvert(q) {
    try {
      const result = await convertQuotationToInvoice(q.id);
      message.success(t('msg.invoiceConverted'));
      load();
    } catch (err) {
      message.error(err.message);
    }
  }

  function openView(q) {
    setView(q);
  }

  const filtered = quotations.filter(q =>
    (!search || q.quotationNo?.toLowerCase().includes(search.toLowerCase()) ||
      q.customerName?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || q.status === statusFilter)
  );

  const totalValue = filtered.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  const acceptedValue = filtered.filter(i => i.status === 'accepted').reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  const pendingCount = filtered.filter(i => ['draft', 'sent'].includes(i.status)).length;

  const columns = [
    {
      title: t('quotation.quotationNo'), dataIndex: 'quotationNo', key: 'quotationNo', width: 140,
      render: (val) => <Text strong style={{ color: 'var(--accent)' }}>{val}</Text>,
      sorter: (a, b) => a.quotationNo.localeCompare(b.quotationNo),
    },
    { title: t('common.date'), dataIndex: 'date', key: 'date', width: 110, sorter: (a, b) => a.date?.localeCompare(b.date) },
    {
      title: t('activity.customer'), dataIndex: 'customerName', key: 'customerName',
      render: (val) => val || <Text type="secondary">{t('msg.walkIn')}</Text>,
    },
    {
      title: t('quotation.validUntil'), dataIndex: 'validUntil', key: 'validUntil', width: 110,
      render: (val) => val || '-',
    },
    {
      title: t('quotation.status'), dataIndex: 'status', key: 'status', width: 110,
      render: (s) => <Tag color={statusColors[s] || 'default'}>{t(`quotation.${s}`) || t('quotation.draft')}</Tag>,
      filters: [
        { text: t('quotation.draft'), value: 'draft' },
        { text: t('quotation.sent'), value: 'sent' },
        { text: t('quotation.accepted'), value: 'accepted' },
        { text: t('quotation.rejected'), value: 'rejected' },
        { text: t('quotation.expired'), value: 'expired' },
        { text: t('quotation.converted'), value: 'converted' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: t('common.amount'), dataIndex: 'grandTotal', key: 'grandTotal', width: 130, align: 'right',
      render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.grandTotal) - Number(b.grandTotal),
    },
    {
      title: '', key: 'actions', width: 240, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('common.view')}><Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} /></Tooltip>
          <Tooltip title={t('common.edit')}><Button size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/quotation/edit/${r.id}`)} /></Tooltip>
          <Tooltip title={t('common.pdf')}>
            <Select size="small" style={{ width: 85 }} value="professional" onChange={(val) => handlePdf(r, val)}
              onClick={(e) => e.stopPropagation()}>
              <Select.Option value="professional">{t('pdfTemplates.professional')}</Select.Option>
              <Select.Option value="classic">{t('pdfTemplates.classic')}</Select.Option>
              <Select.Option value="minimal">{t('pdfTemplates.minimal')}</Select.Option>
            </Select>
          </Tooltip>
          {r.status !== 'converted' && (
            <Tooltip title={t('quotation.convertToInvoice')}>
              <Button size="small" icon={<SwapOutlined />} style={{ color: '#52c41a' }}
                onClick={() => handleConvert(r)} />
            </Tooltip>
          )}
          <Popconfirm title={t('msg.confirmDelete')} onConfirm={() => handleDelete(r.id, r.quotationNo)}>
            <Tooltip title={t('common.delete')}><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space align="center" size={14}>
              <div className="gradient-icon">
                <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('quotation.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{`${quotations.length} ${t('common.total').toLowerCase()}`}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/quotation/new')}>
              {t('quotation.newTitle')}
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid var(--accent)' } }}>
            <Statistic title={t('quotation.totalValue')} value={totalValue} precision={2} prefix="₹" valueStyle={{ color: 'var(--accent)' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic title={t('quotation.acceptedValue')} value={acceptedValue} precision={2} prefix="₹" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}>
            <Statistic title={t('quotation.pendingCount')} value={pendingCount} valueStyle={{ color: '#faad14' }} />
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
              <Select value={statusFilter} onChange={setStatusFilter} placeholder={t('quotation.status')} allowClear style={{ width: '100%' }}>
                <Select.Option value="draft">{t('quotation.draft')}</Select.Option>
                <Select.Option value="sent">{t('quotation.sent')}</Select.Option>
                <Select.Option value="accepted">{t('quotation.accepted')}</Select.Option>
                <Select.Option value="rejected">{t('quotation.rejected')}</Select.Option>
                <Select.Option value="expired">{t('quotation.expired')}</Select.Option>
                <Select.Option value="converted">{t('quotation.converted')}</Select.Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `${total} ${t('quotation.title').toLowerCase()}` }}
          scroll={{ x: 1000 }} locale={{ emptyText: <div style={{ textAlign: 'center', padding: '40px 20px' }}><FileTextOutlined style={{ fontSize: 48, color: 'var(--text-secondary)', marginBottom: 16, display: 'block' }} /><Text type="secondary">{t('msg.noData')}</Text></div> }} />
      </Card>

      <Drawer
        title={<Space><Text strong>{view?.quotationNo}</Text><Tag color={statusColors[view?.status]}>{view?.status ? t(`quotation.${view.status}`) : ''}</Tag></Space>}
        open={!!view}
        onClose={() => setView(null)}
        placement="right"
        width={520}
        extra={
          <Space>
            <Select defaultValue="professional" size="small" style={{ width: 120 }}
              onChange={(val) => { handlePdf(view, val); setView(null); }}>
              <Select.Option value="professional">{`${t('common.pdf')} (${t('pdfTemplates.professional')})`}</Select.Option>
              <Select.Option value="classic">{`${t('common.pdf')} (${t('pdfTemplates.classic')})`}</Select.Option>
              <Select.Option value="minimal">{`${t('common.pdf')} (${t('pdfTemplates.minimal')})`}</Select.Option>
            </Select>
            {view?.status !== 'converted' && (
              <Button icon={<SwapOutlined />} style={{ color: '#52c41a' }}
                onClick={() => { handleConvert(view); setView(null); }}>
                {t('quotation.convertToInvoice')}
              </Button>
            )}
            <Button type="primary" icon={<EditOutlined />}
              onClick={() => { navigate(`/quotation/edit/${view.id}`); setView(null); }}>{t('common.edit')}</Button>
          </Space>
        }
      >
        {view && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('common.date')}>{view.date}</Descriptions.Item>
              <Descriptions.Item label={t('quotation.validUntil')}>{view.validUntil || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('activity.customer')}>{view.customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('customer.companyName')}>{view.customerCompany || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('settings.gstin')}>{view.customerGstin || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.state')}>{view.customerState || '-'}</Descriptions.Item>
            </Descriptions>

            <Table dataSource={view.items || []} rowKey={(_, i) => i} pagination={false} size="small"
              columns={[
                { title: t('invoice.itemName'), dataIndex: 'name', key: 'name' },
                { title: t('invoice.hsn'), dataIndex: 'hsn', key: 'hsn', render: (val) => val || '-' },
                { title: t('invoice.qty'), dataIndex: 'qty', key: 'qty', align: 'center' },
                { title: t('invoice.rate'), dataIndex: 'rate', key: 'rate', align: 'right', render: (v) => `₹${Number(v).toFixed(2)}` },
                { title: t('invoice.amount'), dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => `₹${Number(v).toFixed(2)}` },
              ]} />

            <Row justify="end" style={{ marginTop: 12 }}>
              <Col span={10}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Row justify="space-between"><Text type="secondary">{t('invoice.subtotal')}</Text><Text>₹{Number(view.subtotal).toFixed(2)}</Text></Row>
                  <Row justify="space-between"><Text type="secondary">{t('invoice.cgst')}</Text><Text>₹{Number(view.cgst).toFixed(2)}</Text></Row>
                  <Row justify="space-between"><Text type="secondary">{t('invoice.sgst')}</Text><Text>₹{Number(view.sgst).toFixed(2)}</Text></Row>
                  {Number(view.discount) > 0 && (
                    <Row justify="space-between"><Text type="secondary">{t('invoice.discount')}</Text><Text type="danger">-₹{Number(view.discount).toFixed(2)}</Text></Row>
                  )}
                  <Divider style={{ margin: '2px 0' }} />
                  <Row justify="space-between"><Text strong style={{ fontSize: 16 }}>{t('invoice.grandTotal')}</Text><Text strong style={{ fontSize: 16, color: 'var(--accent)' }}>₹{Number(view.grandTotal).toFixed(2)}</Text></Row>
                </div>
              </Col>
            </Row>

            {view.notes && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">{`${t('common.notes')}: `}</Text>
                <Text>{view.notes}</Text>
              </div>
            )}

            {view.status === 'converted' && view.convertedToInvoiceId && (
              <div style={{ marginTop: 12 }}>
                <Tag color="purple">{t('quotation.converted')}</Tag>
                <Button type="link" size="small" onClick={() => navigate(`/invoice/edit/${view.convertedToInvoiceId}`)}>
                  {t('quotation.viewConverted')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
