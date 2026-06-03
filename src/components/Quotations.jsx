import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Button, Input, Select, Space, Tag, Modal, Typography, Row, Col,
  Statistic, Popconfirm, message, Tooltip, Descriptions, Divider
} from 'antd';
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined,
  SearchOutlined, SwapOutlined
} from '@ant-design/icons';
import db, { logActivity, convertQuotationToInvoice } from '../db';
import { generateQuotationPDF } from '../utils/pdfExport';

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
    message.success(`Quotation ${no} deleted`);
    load();
  }

  async function handlePdf(q, template) {
    await generateQuotationPDF(q, template);
    message.success('PDF generated');
  }

  async function handleConvert(q) {
    try {
      const result = await convertQuotationToInvoice(q.id);
      message.success(`Quotation converted to invoice ${result.invoiceNo}!`);
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
      title: 'Quotation', dataIndex: 'quotationNo', key: 'quotationNo', width: 140,
      render: (t) => <Text strong style={{ color: '#6366f1' }}>{t}</Text>,
      sorter: (a, b) => a.quotationNo.localeCompare(b.quotationNo),
    },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, sorter: (a, b) => a.date?.localeCompare(b.date) },
    {
      title: 'Customer', dataIndex: 'customerName', key: 'customerName',
      render: (t) => t || <Text type="secondary">Walk-in</Text>,
    },
    {
      title: 'Valid Till', dataIndex: 'validUntil', key: 'validUntil', width: 110,
      render: (t) => t || '-',
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (s) => <Tag color={statusColors[s] || 'default'}>{s || 'draft'}</Tag>,
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Sent', value: 'sent' },
        { text: 'Accepted', value: 'accepted' },
        { text: 'Rejected', value: 'rejected' },
        { text: 'Expired', value: 'expired' },
        { text: 'Converted', value: 'converted' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Amount', dataIndex: 'grandTotal', key: 'grandTotal', width: 130, align: 'right',
      render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.grandTotal) - Number(b.grandTotal),
    },
    {
      title: '', key: 'actions', width: 240, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} /></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />}
            onClick={() => navigate(`/quotation/edit/${r.id}`)} /></Tooltip>
          <Tooltip title="PDF">
            <Select size="small" style={{ width: 85 }} value="professional" onChange={(val) => handlePdf(r, val)}
              onClick={(e) => e.stopPropagation()}>
              <Select.Option value="professional">Indigo</Select.Option>
              <Select.Option value="classic">Classic</Select.Option>
              <Select.Option value="minimal">Minimal</Select.Option>
            </Select>
          </Tooltip>
          {r.status !== 'converted' && (
            <Tooltip title="Convert to Invoice">
              <Button size="small" icon={<SwapOutlined />} style={{ color: '#52c41a' }}
                onClick={() => handleConvert(r)} />
            </Tooltip>
          )}
          <Popconfirm title="Delete this quotation?" onConfirm={() => handleDelete(r.id, r.quotationNo)}>
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
          <Title level={3} style={{ margin: 0 }}>Quotations</Title>
          <Text type="secondary">{quotations.length} total</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/quotation/new')}>
            New Quotation
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
            <Statistic title="Total Value" value={totalValue} precision={2} prefix="₹" valueStyle={{ color: '#6366f1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #52c41a' } }}>
            <Statistic title="Accepted Value" value={acceptedValue} precision={2} prefix="₹" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}>
            <Statistic title="Pending (Draft/Sent)" value={pendingCount} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder="Search by quotation or customer..."
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select value={statusFilter} onChange={setStatusFilter} placeholder="Filter by status" allowClear style={{ width: '100%' }}>
                <Select.Option value="draft">Draft</Select.Option>
                <Select.Option value="sent">Sent</Select.Option>
                <Select.Option value="accepted">Accepted</Select.Option>
                <Select.Option value="rejected">Rejected</Select.Option>
                <Select.Option value="expired">Expired</Select.Option>
                <Select.Option value="converted">Converted</Select.Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} quotations` }}
          scroll={{ x: 1000 }} locale={{ emptyText: 'No quotations yet' }} />
      </Card>

      <Modal
        title={<Space><Text strong>{view?.quotationNo}</Text><Tag color={statusColors[view?.status]}>{view?.status}</Tag></Space>}
        open={!!view}
        onCancel={() => setView(null)}
        width={700}
        footer={
          <Space>
            <Select defaultValue="professional" size="small" style={{ width: 120 }}
              onChange={(val) => { handlePdf(view, val); setView(null); }}>
              <Select.Option value="professional">PDF (Indigo)</Select.Option>
              <Select.Option value="classic">PDF (Classic)</Select.Option>
              <Select.Option value="minimal">PDF (Minimal)</Select.Option>
            </Select>
            {view?.status !== 'converted' && (
              <Button icon={<SwapOutlined />} style={{ color: '#52c41a' }}
                onClick={() => { handleConvert(view); setView(null); }}>
                Convert to Invoice
              </Button>
            )}
            <Button type="primary" icon={<EditOutlined />}
              onClick={() => { navigate(`/quotation/edit/${view.id}`); setView(null); }}>Edit</Button>
          </Space>
        }
      >
        {view && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Date">{view.date}</Descriptions.Item>
              <Descriptions.Item label="Valid Until">{view.validUntil || '-'}</Descriptions.Item>
              <Descriptions.Item label="Customer">{view.customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Company">{view.customerCompany || '-'}</Descriptions.Item>
              <Descriptions.Item label="GSTIN">{view.customerGstin || '-'}</Descriptions.Item>
              <Descriptions.Item label="State">{view.customerState || '-'}</Descriptions.Item>
            </Descriptions>

            <Table dataSource={view.items || []} rowKey={(_, i) => i} pagination={false} size="small"
              columns={[
                { title: 'Item', dataIndex: 'name', key: 'name' },
                { title: 'HSN', dataIndex: 'hsn', key: 'hsn', render: (t) => t || '-' },
                { title: 'Qty', dataIndex: 'qty', key: 'qty', align: 'center' },
                { title: 'Rate', dataIndex: 'rate', key: 'rate', align: 'right', render: (v) => `₹${Number(v).toFixed(2)}` },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => `₹${Number(v).toFixed(2)}` },
              ]} />

            <Row justify="end" style={{ marginTop: 12 }}>
              <Col span={10}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Row justify="space-between"><Text type="secondary">Subtotal</Text><Text>₹{Number(view.subtotal).toFixed(2)}</Text></Row>
                  <Row justify="space-between"><Text type="secondary">CGST</Text><Text>₹{Number(view.cgst).toFixed(2)}</Text></Row>
                  <Row justify="space-between"><Text type="secondary">SGST</Text><Text>₹{Number(view.sgst).toFixed(2)}</Text></Row>
                  {Number(view.discount) > 0 && (
                    <Row justify="space-between"><Text type="secondary">Discount</Text><Text type="danger">-₹{Number(view.discount).toFixed(2)}</Text></Row>
                  )}
                  <Divider style={{ margin: '2px 0' }} />
                  <Row justify="space-between"><Text strong style={{ fontSize: 16 }}>Grand Total</Text><Text strong style={{ fontSize: 16, color: '#6366f1' }}>₹{Number(view.grandTotal).toFixed(2)}</Text></Row>
                </div>
              </Col>
            </Row>

            {view.notes && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Notes: </Text>
                <Text>{view.notes}</Text>
              </div>
            )}

            {view.status === 'converted' && view.convertedToInvoiceId && (
              <div style={{ marginTop: 12 }}>
                <Tag color="purple">Converted to Invoice</Tag>
                <Button type="link" size="small" onClick={() => navigate(`/invoice/edit/${view.convertedToInvoiceId}`)}>
                  View Invoice
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}