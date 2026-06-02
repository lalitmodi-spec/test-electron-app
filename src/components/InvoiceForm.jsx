import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Select, DatePicker, InputNumber, Button, Table, Card, Typography, Space,
  message, Divider, Row, Col, Popconfirm, Modal, Tag, Collapse
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, FilePdfOutlined, ArrowLeftOutlined,
  DollarOutlined, TruckOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { getSettings, logActivity, recordPayment, getPaymentsForInvoice, getNextInvoiceNo } from '../db';
import { generateInvoicePDF } from '../utils/pdfExport';
import TemplatePreview from '../pdf/TemplatePreview';

const { Title, Text } = Typography;

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [items, setItems] = useState([{ key: 1, name: '', hsn: '', qty: 1, rate: 0, taxRate: 18, amount: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm] = Form.useForm();
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [showTransport, setShowTransport] = useState(false);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');

  useEffect(() => {
    Promise.all([
      db.customers.toArray(),
      db.products.toArray(),
      getSettings(),
    ]).then(([custs, prods, s]) => {
      setCustomers(custs);
      setProducts(prods);
      setSettings(s);
      setSelectedTemplate(s.invoiceTemplate || 'professional');
      if (!isEdit) {
        getNextInvoiceNo().then(nextNo => {
          setInvoiceNo(nextNo);
          form.setFieldsValue({ invoiceNo: nextNo });
        });
      }
      if (isEdit) {
        db.invoices.get(Number(id)).then(inv => {
          if (inv) {
            form.setFieldsValue({
              invoiceNo: inv.invoiceNo,
              date: inv.date ? dayjs(inv.date) : dayjs(),
              dueDate: inv.dueDate ? dayjs(inv.dueDate) : null,
              status: inv.status || 'unpaid',
              customerId: inv.customerId,
              customerName: inv.customerName,
              customerCompany: inv.customerCompany || '',
              customerGstin: inv.customerGstin || '',
              customerState: inv.customerState || '',
              customerAddress: inv.customerAddress || '',
              customerShippingAddress: inv.customerShippingAddress || '',
              customerStateCode: inv.customerStateCode || '',
              paymentMethod: inv.paymentMethod || '',
              notes: inv.notes || '',
              transporterName: inv.transporterName || '',
              vehicleNumber: inv.vehicleNumber || '',
              dateOfSupply: inv.dateOfSupply ? dayjs(inv.dateOfSupply) : null,
              placeOfSupply: inv.placeOfSupply || '',
              modeOfTransport: inv.modeOfTransport || '',
              lrNumber: inv.lrNumber || '',
            });
            setShowTransport(Boolean(inv.transporterName || inv.vehicleNumber));
            setDiscount(Number(inv.discount) || 0);
            if (inv.items?.length > 0) {
              setItems(inv.items.map((item, i) => ({ ...item, key: i + 1 })));
            }
          }
        });
        getPaymentsForInvoice(Number(id)).then(setPayments);
      }
    });
  }, [id, isEdit, form]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const taxAmount = items.reduce((s, i) => s + ((Number(i.amount) || 0) * (Number(i.taxRate) || 0) / 100), 0);
    const cgst = taxAmount / 2;
    const sgst = taxAmount / 2;
    const d = Number(discount) || 0;
    const grandTotal = subtotal + taxAmount - d;
    return { subtotal, cgst, sgst, grandTotal, discount: d };
  }, [items, discount]);

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = totals.grandTotal - totalPaid;

  const updateItem = (key, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === 'qty' || field === 'rate') {
        updated.amount = (Number(updated.qty) || 0) * (Number(updated.rate) || 0);
      }
      return updated;
    }));
  };

  const addItem = () => {
    const newKey = items.length > 0 ? Math.max(...items.map(i => i.key)) + 1 : 1;
    setItems([...items, { key: newKey, name: '', hsn: '', qty: 1, rate: 0, taxRate: 18, amount: 0 }]);
  };

  const removeItem = (key) => {
    if (items.length <= 1) return;
    setItems(items.filter(i => i.key !== key));
  };

  const selectProduct = (key, productId) => {
    const prod = products.find(p => p.id === Number(productId));
    if (prod) {
      setItems(prev => prev.map(item => {
        if (item.key !== key) return item;
        return {
          ...item, name: prod.name, hsn: prod.hsn || '',
          rate: prod.price || 0, taxRate: prod.taxRate || 18,
          amount: (Number(item.qty) || 1) * (Number(prod.price) || 0)
        };
      }));
    }
  };

  const selectCustomer = (custId) => {
    const cust = customers.find(c => c.id === Number(custId));
    form.setFieldsValue({
      customerId: custId,
      customerName: cust ? cust.name : '',
      customerCompany: cust ? cust.companyName : '',
      customerGstin: cust ? cust.gstin : '',
      customerState: cust ? cust.state : '',
      customerAddress: cust ? cust.address : '',
      customerShippingAddress: cust ? (cust.shippingAddress || cust.address) : '',
      customerStateCode: cust ? cust.stateCode : '',
    });
  };

  async function updateStock(itemsArr) {
    for (const item of itemsArr) {
      if (!item.name) continue;
      const prod = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
      if (prod && (Number(prod.stock) || 0) > 0) {
        const newStock = Math.max(0, (Number(prod.stock) || 0) - (Number(item.qty) || 0));
        await db.products.update(prod.id, { stock: newStock });
      }
    }
  }

  async function handleSave(withPdf = false, templateOverride) {
    try {
      setSaving(true);
      const values = await form.validateFields();
      const data = {
        invoiceNo: values.invoiceNo,
        date: values.date.format('YYYY-MM-DD'),
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : '',
        customerId: values.customerId || '',
        customerName: values.customerName || '',
        customerCompany: values.customerCompany || '',
        customerGstin: values.customerGstin || '',
        customerState: values.customerState || '',
        customerAddress: values.customerAddress || '',
        customerShippingAddress: values.customerShippingAddress || '',
        customerStateCode: values.customerStateCode || '',
        status: values.status || 'unpaid',
        paymentMethod: values.paymentMethod || '',
        notes: values.notes || '',
        items: items.map(({ key, ...rest }) => rest),
        discount: Number(discount) || 0,
        transporterName: showTransport ? (values.transporterName || '') : '',
        vehicleNumber: showTransport ? (values.vehicleNumber || '') : '',
        dateOfSupply: showTransport && values.dateOfSupply ? values.dateOfSupply.format('YYYY-MM-DD') : '',
        placeOfSupply: showTransport ? (values.placeOfSupply || '') : '',
        modeOfTransport: showTransport ? (values.modeOfTransport || '') : '',
        lrNumber: showTransport ? (values.lrNumber || '') : '',
        ...totals,
      };

      let savedId = id;
      if (isEdit) {
        await db.invoices.update(Number(id), data);
        await logActivity('update', `Updated invoice: ${data.invoiceNo}`);
      } else {
        savedId = await db.invoices.add(data);
        await updateStock(data.items);
        await logActivity('create', `Created invoice: ${data.invoiceNo} - ₹${data.grandTotal}`);
      }

      if (withPdf) {
        await generateInvoicePDF(data, templateOverride);
        await logActivity('pdf', `Exported PDF: ${data.invoiceNo}`);
      }

      message.success(withPdf ? 'Invoice saved & PDF downloaded!' : 'Invoice saved!');
      navigate('/invoices');
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        message.error('Error saving invoice');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordPayment() {
    const values = await paymentForm.validateFields();
    await recordPayment({
      invoiceId: Number(id),
      amount: values.amount,
      method: values.method || 'Cash',
      date: values.date ? values.date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      reference: values.reference || '',
      note: values.note || '',
    });
    message.success('Payment recorded');
    setShowPayment(false);
    paymentForm.resetFields();
    getPaymentsForInvoice(Number(id)).then(setPayments);
  }

  const itemColumns = [
    {
      title: 'Item', dataIndex: 'name', key: 'name', width: '26%',
      render: (_, record) => (
        <Space.Compact style={{ width: '100%' }}>
          {products.length > 0 && (
            <Select showSearch placeholder="Prod" style={{ width: 85 }}
              onChange={(val) => selectProduct(record.key, val)}
              filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
              {products.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          )}
          <Input value={record.name} onChange={e => updateItem(record.key, 'name', e.target.value)}
            placeholder="Item name" style={{ flex: 1 }} />
        </Space.Compact>
      )
    },
    {
      title: 'HSN', dataIndex: 'hsn', key: 'hsn', width: 80,
      render: (_, record) => <Input value={record.hsn} onChange={e => updateItem(record.key, 'hsn', e.target.value)} placeholder="HSN" />
    },
    {
      title: 'Qty', dataIndex: 'qty', key: 'qty', width: 70,
      render: (_, record) => <InputNumber min={1} value={record.qty} onChange={v => updateItem(record.key, 'qty', v)} style={{ width: '100%' }} />
    },
    {
      title: 'Rate', dataIndex: 'rate', key: 'rate', width: 100,
      render: (_, record) => <InputNumber min={0} step={0.01} prefix="₹" value={record.rate} onChange={v => updateItem(record.key, 'rate', v)} style={{ width: '100%' }} />
    },
    {
      title: 'Tax%', dataIndex: 'taxRate', key: 'taxRate', width: 75,
      render: (_, record) => (
        <Select value={record.taxRate} onChange={v => updateItem(record.key, 'taxRate', v)} style={{ width: '100%' }}>
          {[0, 5, 12, 18, 28].map(t => <Select.Option key={t} value={t}>{t}%</Select.Option>)}
        </Select>
      )
    },
    {
      title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, align: 'right',
      render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>
    },
    {
      title: '', key: 'action', width: 45,
      render: (_, record) => (
        <Popconfirm title="Remove item?" onConfirm={() => removeItem(record.key)}>
          <Button type="text" danger icon={<DeleteOutlined />} disabled={items.length <= 1} size="small" />
        </Popconfirm>
      )
    },
  ];

  const paymentColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 100 },
    { title: 'Method', dataIndex: 'method', key: 'method', width: 100, render: (t) => <Tag>{t}</Tag> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => <Text strong style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text> },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (t) => t || '-' },
  ];

  return (
    <div>
      <Row align="middle" style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={3} style={{ margin: 0 }}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</Title>
          <Text type="secondary">Create a GST-compliant invoice</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<FilePdfOutlined />} size="small" onClick={() => setTemplatePreviewOpen(true)}>
              Template: {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
            </Button>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>Back</Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Form form={form} layout="vertical" initialValues={{
          date: dayjs(), status: 'unpaid', invoiceNo: 'Loading...',
        }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Invoice No" name="invoiceNo" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Item label="Date" name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Item label="Due Date" name="dueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Status" name="status">
                <Select>
                  <Select.Option value="unpaid">Unpaid</Select.Option>
                  <Select.Option value="paid">Paid</Select.Option>
                  <Select.Option value="partial">Partial</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Customer" name="customerId">
                <Select showSearch placeholder="Select customer" onChange={selectCustomer}
                  filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())} allowClear>
                  {customers.map(c => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}{c.companyName ? ` (${c.companyName})` : ''}{c.gstin ? ` - ${c.gstin}` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Contact Name" name="customerName">
                <Input placeholder="Customer name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Company Name" name="customerCompany">
                <Input placeholder="Company name" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item label="GSTIN" name="customerGstin">
                <Input placeholder="GSTIN" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item label="State" name="customerState">
                <Select showSearch placeholder="Select state" allowClear>
                  {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Puducherry','Chandigarh','Andaman and Nicobar','Dadra and Nagar Haveli','Daman and Diu','Lakshadweep','Ladakh','Jammu and Kashmir'].map(s => (
                    <Select.Option key={s} value={s}>{s}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item label="State Code" name="customerStateCode">
                <Input placeholder="e.g. 27" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Billing Address" name="customerAddress">
                <Input.TextArea rows={2} placeholder="Billing address" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label="Shipping Address" name="customerShippingAddress">
                <Input.TextArea rows={2} placeholder="Shipping address (if different)" />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Col><Text strong>Invoice Items</Text></Col>
            <Col><Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>Add Item</Button></Col>
          </Row>

          <Table dataSource={items} columns={itemColumns} rowKey="key" pagination={false}
            size="small" scroll={{ x: 700 }} />

          <Divider style={{ margin: '16px 0' }} />

          <Row justify="end">
            <Col xs={24} sm={12} md={8}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Row justify="space-between"><Text type="secondary">Subtotal</Text><Text>₹{totals.subtotal.toFixed(2)}</Text></Row>
                <Row justify="space-between"><Text type="secondary">CGST</Text><Text>₹{totals.cgst.toFixed(2)}</Text></Row>
                <Row justify="space-between"><Text type="secondary">SGST</Text><Text>₹{totals.sgst.toFixed(2)}</Text></Row>
                <Row justify="space-between" align="middle">
                  <Text type="secondary">Discount</Text>
                  <InputNumber prefix="₹" min={0} step={0.01} value={discount}
                    onChange={v => setDiscount(v || 0)} style={{ width: 120 }} />
                </Row>
                <Divider style={{ margin: '4px 0' }} />
                <Row justify="space-between">
                  <Text strong style={{ fontSize: 16 }}>Grand Total</Text>
                  <Text strong style={{ fontSize: 16, color: '#6366f1' }}>₹{totals.grandTotal.toFixed(2)}</Text>
                </Row>
              </div>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Col>
              <Space>
                <TruckOutlined />
                <Text strong>Transport Details</Text>
              </Space>
            </Col>
            <Col>
              <Button size="small" type={showTransport ? 'primary' : 'default'}
                onClick={() => setShowTransport(!showTransport)}>
                {showTransport ? 'Remove Transport' : 'Add Transport'}
              </Button>
            </Col>
          </Row>

          {showTransport && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label="Transporter Name" name="transporterName">
                  <Input placeholder="Transporter / Courier" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label="Vehicle No" name="vehicleNumber">
                  <Input placeholder="Vehicle" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label="LR/Bill No" name="lrNumber">
                  <Input placeholder="LR No" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label="Mode" name="modeOfTransport">
                  <Select allowClear>
                    <Select.Option value="Road">Road</Select.Option>
                    <Select.Option value="Air">Air</Select.Option>
                    <Select.Option value="Rail">Rail</Select.Option>
                    <Select.Option value="Sea">Sea</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label="Date of Supply" name="dateOfSupply">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label="Place of Supply" name="placeOfSupply">
                  <Input placeholder="Place of supply" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Payment Method" name="paymentMethod">
                <Select allowClear>
                  <Select.Option value="Cash">Cash</Select.Option>
                  <Select.Option value="UPI">UPI</Select.Option>
                  <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                  <Select.Option value="Card">Card</Select.Option>
                  <Select.Option value="Cheque">Cheque</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {isEdit && payments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Collapse size="small" items={[{
              key: 'payments',
              label: (
                <Space>
                  <DollarOutlined style={{ color: '#52c41a' }} />
                  <Text>Payment History ({payments.length})</Text>
                  <Tag color="green">₹{totalPaid.toFixed(2)} paid</Tag>
                  {balance > 0 && <Tag color="red">₹{balance.toFixed(2)} due</Tag>}
                </Space>
              ),
              children: <Table dataSource={payments} columns={paymentColumns} rowKey="id" pagination={false} size="small" />,
            }]} />
          </div>
        )}

        <Row justify="end" gutter={12} align="middle">
          {isEdit && (
            <Col>
              <Button icon={<DollarOutlined />} onClick={() => {
                paymentForm.resetFields();
                paymentForm.setFieldsValue({ date: dayjs(), method: 'Cash', amount: balance > 0 ? balance : '' });
                setShowPayment(true);
              }}>
                Add Payment
              </Button>
            </Col>
          )}
          <Col><Button onClick={() => navigate('/invoices')}>Cancel</Button></Col>
          <Col><Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={saving}>Save</Button></Col>
          <Col>
            <Button icon={<FilePdfOutlined />} onClick={() => handleSave(true, selectedTemplate)} loading={saving}
              style={{ background: '#52c41a', borderColor: '#52c41a', color: 'white' }}>
              PDF ({selectedTemplate})
            </Button>
          </Col>
        </Row>
      </Card>

      <Modal title="Record Payment" open={showPayment} onCancel={() => setShowPayment(false)}
        onOk={handleRecordPayment} okText="Record" width={450}>
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={1} max={totals.grandTotal} step={0.01} prefix="₹" style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="method" label="Method">
                <Select>
                  <Select.Option value="Cash">Cash</Select.Option>
                  <Select.Option value="UPI">UPI</Select.Option>
                  <Select.Option value="Bank Transfer">Bank Transfer</Select.Option>
                  <Select.Option value="Card">Card</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reference" label="Reference">
            <Input placeholder="Cheque/UTR no." />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <TemplatePreview
        selected={selectedTemplate}
        visible={templatePreviewOpen}
        onClose={() => setTemplatePreviewOpen(false)}
        onSelect={(key) => { setSelectedTemplate(key); setTemplatePreviewOpen(false); }}
      />
    </div>
  );
}
