import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Button, Input, Select, Space, Tag, Modal, Typography, Row, Col,
  Statistic, Popconfirm, message, Tooltip, Descriptions, Divider
} from 'antd';
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined,
  SearchOutlined, FilterOutlined, DollarOutlined
} from '@ant-design/icons';
import db, { logActivity, getPaymentSummary } from '../db';
import { generateInvoicePDF } from '../utils/pdfExport';

const { Title, Text } = Typography;

export default function Invoices() {
  const navigate = useNavigate();
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
    message.success(`Invoice ${no} deleted`);
    load();
  }

  async function handlePdf(inv, template) {
    await generateInvoicePDF(inv, template);
    message.success('PDF generated');
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
      title: 'Invoice', dataIndex: 'invoiceNo', key: 'invoiceNo', width: 140,
      render: (t) => <Text strong style={{ color: '#6366f1' }}>{t}</Text>,
      sorter: (a, b) => a.invoiceNo.localeCompare(b.invoiceNo),
    },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, sorter: (a, b) => a.date?.localeCompare(b.date) },
    {
      title: 'Customer', dataIndex: 'customerName', key: 'customerName',
      render: (t) => t || <Text type="secondary">Walk-in</Text>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (s) => {
        const map = { paid: 'success', partial: 'warning', unpaid: 'error' };
        return <Tag color={map[s] || 'default'}>{s || 'unpaid'}</Tag>;
      },
      filters: [{ text: 'Paid', value: 'paid' }, { text: 'Unpaid', value: 'unpaid' }, { text: 'Partial', value: 'partial' }],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Amount', dataIndex: 'grandTotal', key: 'grandTotal', width: 130, align: 'right',
      render: (v, r) => (
        <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
          <Text strong>₹{Number(v).toFixed(2)}</Text>
          {Number(paymentSummary[r.id]) > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>Paid: ₹{Number(paymentSummary[r.id]).toFixed(2)}</Text>
          )}
        </Space>
      ),
      sorter: (a, b) => Number(a.grandTotal) - Number(b.grandTotal),
    },
    {
      title: '', key: 'actions', width: 200, align: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined />} onClick={() => openView(r)} /></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/invoice/edit/${r.id}`)} /></Tooltip>
          <Tooltip title="PDF">
            <Select size="small" style={{ width: 90 }} value="professional" onChange={(val) => handlePdf(r, val)}
              onClick={(e) => e.stopPropagation()}>
              <Select.Option value="professional">Indigo</Select.Option>
              <Select.Option value="classic">Classic</Select.Option>
              <Select.Option value="minimal">Minimal</Select.Option>
            </Select>
          </Tooltip>
          <Popconfirm title="Delete this invoice?" onConfirm={() => handleDelete(r.id, r.invoiceNo)}>
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
          <Title level={3} style={{ margin: 0 }}>Invoices</Title>
          <Text type="secondary">{invoices.length} total</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoice/new')}>
            New Invoice
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Total Value" value={totalAmount} precision={2} prefix="₹" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Collected" value={paidAmount} precision={2} prefix="₹" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small">
            <Statistic title="Outstanding" value={totalAmount - paidAmount} precision={2} prefix="₹" valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input prefix={<SearchOutlined />} placeholder="Search by invoice or customer..."
              value={search} onChange={e => setSearch(e.target.value)} allowClear />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select value={statusFilter} onChange={setStatusFilter} placeholder="Filter by status" allowClear style={{ width: '100%' }}>
              <Select.Option value="paid">Paid</Select.Option>
              <Select.Option value="unpaid">Unpaid</Select.Option>
              <Select.Option value="partial">Partial</Select.Option>
            </Select>
          </Col>
        </Row>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} invoices` }}
          scroll={{ x: 900 }} locale={{ emptyText: 'No invoices yet' }} />
      </Card>

      <Modal
        title={<Space><Text strong>{view?.invoiceNo}</Text><Tag color={view?.status === 'paid' ? 'success' : view?.status === 'partial' ? 'warning' : 'error'}>{view?.status}</Tag></Space>}
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
            <Button type="primary" icon={<EditOutlined />}
              onClick={() => { navigate(`/invoice/edit/${view.id}`); setView(null); }}>Edit</Button>
          </Space>
        }
      >
        {view && (
          <div>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Date">{view.date}</Descriptions.Item>
              <Descriptions.Item label="Customer">{view.customerName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Company">{view.customerCompany || '-'}</Descriptions.Item>
              <Descriptions.Item label="GSTIN">{view.customerGstin || '-'}</Descriptions.Item>
              <Descriptions.Item label="State">{view.customerState || '-'}</Descriptions.Item>
              <Descriptions.Item label="Payment">{view.paymentMethod || '-'}</Descriptions.Item>
              <Descriptions.Item label="Paid Amount">
                <Text style={{ color: '#52c41a' }}>₹{Number(view._paid).toFixed(2)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Balance">
                {view._paid < view.grandTotal ? (
                  <Text type="danger">₹{Number(view.grandTotal - view._paid).toFixed(2)}</Text>
                ) : <Tag color="success">Settled</Tag>}
              </Descriptions.Item>
            </Descriptions>

            {(view.transporterName || view.vehicleNumber) && (
              <Descriptions column={3} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Transporter">{view.transporterName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Vehicle">{view.vehicleNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Mode">{view.modeOfTransport || '-'}</Descriptions.Item>
                <Descriptions.Item label="LR No">{view.lrNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Place of Supply">{view.placeOfSupply || '-'}</Descriptions.Item>
                <Descriptions.Item label="Supply Date">{view.dateOfSupply || '-'}</Descriptions.Item>
              </Descriptions>
            )}

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
                  <Row justify="space-between"><Text type="secondary">Paid</Text><Text style={{ color: '#52c41a' }}>₹{Number(view._paid).toFixed(2)}</Text></Row>
                  {view._paid < view.grandTotal && (
                    <Row justify="space-between"><Text type="secondary">Balance Due</Text><Text type="danger">₹{Number(view.grandTotal - view._paid).toFixed(2)}</Text></Row>
                  )}
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}


