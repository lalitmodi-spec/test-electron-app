import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Button, Input, Select, Space, Tag, Drawer, Typography, Row, Col,
  Statistic, Popconfirm, message, Tooltip, Descriptions, Divider, Dropdown
} from 'antd';
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined,
  SearchOutlined, DollarOutlined, MailOutlined, BellOutlined, SwapOutlined, DownOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import db, { logActivity, getPaymentSummary, getSettings } from '../db';
import { generateInvoicePDF } from '../utils/pdfExport';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;

const PDF_TEMPLATES = ['professional', 'classic', 'minimal'];

export default function Invoices() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [view, setView] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({});

  async function load() {
    setLoading(true);
    const data = await db.invoices.reverse().toArray();
    setInvoices(data);
    const summary = {};
    for (const inv of data) {
      summary[inv.id] = await getPaymentSummary(inv.id);
    }
    setPaymentSummary(summary);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, no) {
    await db.invoices.delete(id);
    await logActivity('delete', `Deleted invoice: ${no}`);
    message.success(`${t('invoice.title')} ${no} ${t('msg.deleted')}`);
    load();
  }

  async function handlePdf(inv, template) {
    await generateInvoicePDF(inv, template);
    message.success(t('msg.pdfGenerated'));
  }

  function getPdfMenuItems(inv, onDone) {
    return PDF_TEMPLATES.map(key => ({
      key,
      label: t(`pdfTemplates.${key}`),
      onClick: () => {
        handlePdf(inv, key);
        if (onDone) onDone();
      },
    }));
  }

  async function handleReminder(inv) {
    const settings = await getSettings();
    const template = settings.reminderNote || 'Dear {{customer}},\n\nReminder: Invoice {{invoiceNo}} of ₹{{amount}} is due on {{dueDate}}.\n\n{{businessName}}';
    const msg = template
      .replace(/\{\{customer\}\}/g, inv.customerName || 'Customer')
      .replace(/\{\{invoiceNo\}\}/g, inv.invoiceNo)
      .replace(/\{\{amount\}\}/g, `₹${Number(inv.grandTotal).toFixed(2)}`)
      .replace(/\{\{dueDate\}\}/g, inv.dueDate || '-')
      .replace(/\{\{businessName\}\}/g, settings.businessName || 'Business');

    if (inv.customerEmail && window.electronAPI) {
      await window.electronAPI.sendEmail({
        to: inv.customerEmail,
        subject: `Payment Reminder: ${inv.invoiceNo}`,
        body: msg,
      });
    } else {
      await navigator.clipboard.writeText(msg);
      message.success(t('invoice.reminderTextCopied'));
    }
    await db.invoices.update(inv.id, { reminderSent: true, reminderDate: new Date().toISOString().split('T')[0] });
    await logActivity('reminder', `Reminder sent for invoice ${inv.invoiceNo}`);
    load();
  }

  async function handleEmail(inv) {
    if (window.electronAPI) {
      const customerEmail = inv.customerEmail || '';
      if (!customerEmail) {
        message.warning(t('msg.noEmail'));
        return;
      }
      await window.electronAPI.sendEmail({
        to: customerEmail,
        subject: `Invoice ${inv.invoiceNo} from ${inv.businessName || 'Business'}`,
        body: `Dear ${inv.customerName},\n\nPlease find attached invoice ${inv.invoiceNo} for ₹${Number(inv.grandTotal).toFixed(2)}.\n\nThank you for your business!`,
      });
      message.success(t('msg.emailOpened'));
    } else {
      message.info(t('msg.emailAvailable'));
    }
  }

  async function openView(inv) {
    const paid = await getPaymentSummary(inv.id);
    setView({ ...inv, _paid: paid });
  }

  const filtered = invoices.filter(inv =>
    (!search || inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || inv.status === statusFilter)
  );

  const totalAmount = filtered.reduce((s, i) => s + (Number(i.grandTotal) || 0), 0);
  const paidAmount = filtered.reduce((s, i) => s + (Number(paymentSummary[i.id]) || 0), 0);

  const columns = [
    {
      title: t('invoice.title'), dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140,
      render: (tVal, r) => (
        <Space>
          <Text strong style={{ color: '#6366f1' }}>{tVal}</Text>
          {r.poNumber && <Text type="secondary" style={{ fontSize: 10 }}>(PO: {r.poNumber})</Text>}
        </Space>
      ),
      sorter: (a, b) => a.invoiceNo.localeCompare(b.invoiceNo),
    },
    { title: t('common.date'), dataIndex: 'date', key: 'date', width: 110, sorter: (a, b) => a.date?.localeCompare(b.date) },
    {
      title: t('invoice.customer'), dataIndex: 'customerName', key: 'customerName',
      render: (tVal) => tVal || <Text type="secondary">{t('msg.walkIn')}</Text>,
    },
    {
      title: t('common.status'), dataIndex: 'status', key: 'status', width: 100,
      render: (s, r) => {
        const map = { paid: 'success', partial: 'warning', unpaid: 'error' };
        const isOverdue = s === 'unpaid' && r.dueDate && r.dueDate < new Date().toISOString().split('T')[0];
        return (
          <Space>
            <Tag color={map[s] || 'default'}>{s || t('common.unpaid')}</Tag>
            {isOverdue && <Tooltip title={t('common.overdue')}><Tag color="red" style={{ margin: 0 }}>OVERDUE</Tag></Tooltip>}
            {r.reminderDate && !r.reminderSent && <Tooltip title={`${t('reminder.date')}: ${r.reminderDate}`}><BellOutlined style={{ color: '#faad14' }} /></Tooltip>}
          </Space>
        );
      },
      filters: [{ text: t('common.paid'), value: 'paid' }, { text: t('common.unpaid'), value: 'unpaid' }, { text: t('common.partial'), value: 'partial' }],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: t('common.amount'), dataIndex: 'grandTotal', key: 'grandTotal', width: 130, align: 'right',
      render: (v, r) => (
        <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
          <Text strong>₹{Number(v).toFixed(2)}</Text>
          {Number(paymentSummary[r.id]) > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>{t('common.paid')}: ₹{Number(paymentSummary[r.id]).toFixed(2)}</Text>
          )}
        </Space>
      ),
      sorter: (a, b) => Number(a.grandTotal) - Number(b.grandTotal),
    },
    {
      title: '', key: 'actions', width: 240, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title={t('common.view')}><Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} /></Tooltip>
          <Tooltip title={t('common.edit')}><Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/invoice/edit/${r.id}`)} /></Tooltip>
          <Dropdown menu={{ items: getPdfMenuItems(r) }} trigger={['click']}>
            <Button size="small" icon={<FilePdfOutlined />}>
              PDF <DownOutlined />
            </Button>
          </Dropdown>
          {r.status !== 'paid' && (
            <Tooltip title={t('invoice.sendReminder')}>
              <Button size="small" icon={<BellOutlined />}
                style={{ color: '#faad14' }}
                onClick={() => handleReminder(r)} />
            </Tooltip>
          )}
          <Popconfirm title={t('msg.confirmDelete')} onConfirm={() => handleDelete(r.id, r.invoiceNo)}>
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
              <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
                <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('invoice.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{invoices.length} {t('common.total')}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoice/new')}>
              {t('invoice.newTitle')}
            </Button>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #6366f1', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><DollarOutlined style={{ color: '#6366f1', marginRight: 4 }} />{t('invoice.totalValue')}</div>
            <div className="stat-value" style={{ color: '#6366f1' }}>₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #52c41a', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><DollarOutlined style={{ color: '#52c41a', marginRight: 4 }} />{t('invoice.collected')}</div>
            <div className="stat-value" style={{ color: '#52c41a' }}>₹{paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card" size="small" styles={{ body: { padding: '18px 20px' } }} style={{ borderLeft: '4px solid #ff4d4f', borderRadius: 12, height: '100%' }}>
            <div className="stat-label"><DollarOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />{t('invoice.outstanding')}</div>
            <div className="stat-value" style={{ color: '#ff4d4f' }}>₹{(totalAmount - paidAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </Card>
        </Col>
      </Row>

      <Card className="chart-card" styles={{ body: { padding: 0 }, boxShadow: 'none' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder={t('placeholder.search')}
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select value={statusFilter} onChange={setStatusFilter} placeholder={t('common.status')} allowClear style={{ width: '100%' }}>
                <Select.Option value="paid">{t('common.paid')}</Select.Option>
                <Select.Option value="unpaid">{t('common.unpaid')}</Select.Option>
                <Select.Option value="partial">{t('common.partial')}</Select.Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `${total} ${t('invoice.title').toLowerCase()}` }}
          scroll={{ x: 960 }} locale={{ emptyText: t('msg.noData') }} />
      </Card>

      <Drawer
        title={
          <Row justify="space-between" align="middle" style={{ width: '100%', paddingRight: 24 }}>
            <Space>
              <FilePdfOutlined style={{ color: '#6366f1' }} />
              <Text strong style={{ fontSize: 16 }}>{view?.invoiceNo}</Text>
            </Space>
            <Tag color={view?.status === 'paid' ? 'success' : view?.status === 'partial' ? 'warning' : 'error'} style={{ borderRadius: 6, fontSize: 12, padding: '2px 10px' }}>
              {view?.status}
            </Tag>
          </Row>
        }
        open={!!view}
        onClose={() => setView(null)}
        width={640}
        placement="right"
        extra={
          <Space>
            <Dropdown menu={{ items: getPdfMenuItems(view, () => setView(null)) }} trigger={['click']}>
              <Button size="small" icon={<FilePdfOutlined />}>
                PDF <DownOutlined />
              </Button>
            </Dropdown>
            <Button size="small" icon={<MailOutlined />} onClick={() => { handleEmail(view); setView(null); }} />
            <Button size="small" type="primary" icon={<EditOutlined />}
              onClick={() => { navigate(`/invoice/edit/${view.id}`); setView(null); }}>
              {t('common.edit')}
            </Button>
          </Space>
        }
      >
        {view && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('invoice.customer')}>{view.customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('common.date')}>{view.date}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.companyName')}>{view.customerCompany || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.dueDate')}>{view.dueDate || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.gstin')}>{view.customerGstin || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.state')}>{view.customerState || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.poNumber')}>{view.poNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.paymentTerms')}>{view.paymentTerms ? view.paymentTerms.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.paymentMethod')}>{view.paymentMethod || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('invoice.reverseCharge')}>{view.reverseCharge ? <Tag color="red">{t('common.yes')}</Tag> : t('common.no')}</Descriptions.Item>
            </Descriptions>

            {(view.transporterName || view.vehicleNumber) && (
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label={t('transport.transporterName')}>{view.transporterName || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('transport.vehicleNumber')}>{view.vehicleNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('transport.modeOfTransport')}>{view.modeOfTransport || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('transport.lrNumber')}>{view.lrNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('transport.placeOfSupply')}>{view.placeOfSupply || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('transport.dateOfSupply')}>{view.dateOfSupply || '-'}</Descriptions.Item>
              </Descriptions>
            )}

            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>{t('invoice.items')}</Text>
            <Table dataSource={view.items || []} rowKey={(_, i) => i} pagination={false} size="small"
              columns={[
                { title: t('invoice.items'), dataIndex: 'name', key: 'name' },
                { title: 'HSN', dataIndex: 'hsn', key: 'hsn', render: (v) => v || '-' },
                { title: t('invoice.qty'), dataIndex: 'qty', key: 'qty', align: 'center' },
                { title: t('invoice.rate'), dataIndex: 'rate', key: 'rate', align: 'right', render: (v) => `₹${Number(v).toFixed(2)}` },
                { title: t('invoice.taxRate'), dataIndex: 'taxRate', key: 'taxRate', align: 'center', render: (v) => v ? `${v}%` : '-' },
                { title: t('common.amount'), dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => `₹${Number(v).toFixed(2)}` },
              ]}
              style={{ marginBottom: 16 }} />

            <Row justify="end" style={{ marginTop: 8 }}>
              <Col xs={24} sm={18}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 16px', background: 'rgba(99,102,241,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <Row justify="space-between"><Text type="secondary">{t('invoice.subtotal')}</Text><Text>₹{Number(view.subtotal).toFixed(2)}</Text></Row>
                  <Row justify="space-between"><Text type="secondary">{t('invoice.cgst')} ({(Number(view.cgst) && Number(view.subtotal) ? (Number(view.cgst) / Number(view.subtotal) * 100).toFixed(1) : 0)}%)</Text><Text>₹{Number(view.cgst).toFixed(2)}</Text></Row>
                  <Row justify="space-between"><Text type="secondary">{t('invoice.sgst')} ({(Number(view.sgst) && Number(view.subtotal) ? (Number(view.sgst) / Number(view.subtotal) * 100).toFixed(1) : 0)}%)</Text><Text>₹{Number(view.sgst).toFixed(2)}</Text></Row>
                  {Number(view.discount) > 0 && (
                    <Row justify="space-between"><Text type="secondary">{t('invoice.discount')}</Text><Text type="danger">-₹{Number(view.discount).toFixed(2)}</Text></Row>
                  )}
                  <Divider style={{ margin: '4px 0' }} />
                  <Row justify="space-between"><Text strong style={{ fontSize: 16 }}>{t('invoice.grandTotal')}</Text><Text strong style={{ fontSize: 16, color: '#6366f1' }}>₹{Number(view.grandTotal).toFixed(2)}</Text></Row>
                  <Divider style={{ margin: '4px 0' }} />
                  <Row justify="space-between"><Text type="secondary">{t('common.paid')}</Text><Text style={{ color: '#52c41a', fontWeight: 600 }}>₹{Number(view._paid).toFixed(2)}</Text></Row>
                  {view._paid < view.grandTotal && (
                    <Row justify="space-between"><Text type="secondary">{t('invoice.balance')}</Text><Text style={{ color: '#ff4d4f', fontWeight: 600 }}>₹{Number(view.grandTotal - view._paid).toFixed(2)}</Text></Row>
                  )}
                </div>
              </Col>
            </Row>

            {(view.reminderDate || view.reminderNote) && (
              <Descriptions column={2} size="small" bordered style={{ marginTop: 16 }}>
                <Descriptions.Item label={t('reminder.date')}>{view.reminderDate || '-'}</Descriptions.Item>
                <Descriptions.Item label={t('reminder.sent')}>{view.reminderSent ? <Tag color="success">{t('common.yes')}</Tag> : <Tag color="warning">{t('common.no')}</Tag>}</Descriptions.Item>
                <Descriptions.Item label={t('reminder.note')} span={2}>{view.reminderNote || '-'}</Descriptions.Item>
              </Descriptions>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
