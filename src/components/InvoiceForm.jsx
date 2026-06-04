import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Form, Input, Select, DatePicker, InputNumber, Button, Table, Card, Typography, Space,
  message, Divider, Row, Col, Popconfirm, Drawer, Tag, Collapse
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, FilePdfOutlined, ArrowLeftOutlined,
  DollarOutlined, TruckOutlined, BellOutlined, SwapOutlined, FileTextOutlined, ShoppingOutlined
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
  const [showReminder, setShowReminder] = useState(false);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const { t } = useLanguage();

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
              customerEmail: inv.customerEmail || '',
              customerPhone: inv.customerPhone || '',
              paymentMethod: inv.paymentMethod || '',
              paymentTerms: inv.paymentTerms || '',
              poNumber: inv.poNumber || '',
              reverseCharge: inv.reverseCharge || false,
              notes: inv.notes || '',
              transporterName: inv.transporterName || '',
              vehicleNumber: inv.vehicleNumber || '',
              dateOfSupply: inv.dateOfSupply ? dayjs(inv.dateOfSupply) : null,
              placeOfSupply: inv.placeOfSupply || '',
              modeOfTransport: inv.modeOfTransport || '',
              lrNumber: inv.lrNumber || '',
              reminderDate: inv.reminderDate ? dayjs(inv.reminderDate) : null,
              reminderSent: inv.reminderSent || false,
              reminderNote: inv.reminderNote || '',
            });
            setShowTransport(Boolean(inv.transporterName || inv.vehicleNumber));
            setShowReminder(Boolean(inv.reminderDate || inv.reminderNote));
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
      customerEmail: cust ? cust.email : '',
      customerPhone: cust ? cust.phone : '',
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
        customerEmail: values.customerEmail || '',
        customerPhone: values.customerPhone || '',
        poNumber: values.poNumber || '',
        paymentTerms: values.paymentTerms || '',
        reverseCharge: values.reverseCharge || false,
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
        reminderDate: showReminder && values.reminderDate ? values.reminderDate.format('YYYY-MM-DD') : '',
        reminderSent: showReminder ? (values.reminderSent || false) : false,
        reminderNote: showReminder ? (values.reminderNote || '') : '',
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

      message.success(t('msg.saved'));
      navigate('/invoices');
    } catch (err) {
      if (err.errorFields) {
        message.error(t('msg.requiredFields'));
      } else {
        message.error(t('msg.errorSaving'));
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
    message.success(t('msg.saved'));
    setShowPayment(false);
    paymentForm.resetFields();
    getPaymentsForInvoice(Number(id)).then(setPayments);
  }

  const itemColumns = [
    {
      title: t('invoice.items'), dataIndex: 'name', key: 'name', width: '26%',
      render: (_, record) => (
        <Space.Compact style={{ width: '100%' }}>
          {products.length > 0 && (
            <Select showSearch placeholder={t('placeholder.search')} style={{ width: 85 }}
              onChange={(val) => selectProduct(record.key, val)}
              filterOption={(input, option) => option.children?.toLowerCase().includes(input.toLowerCase())}>
              {products.map(p => <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>)}
            </Select>
          )}
          <Input value={record.name} onChange={e => updateItem(record.key, 'name', e.target.value)}
            placeholder={t('placeholder.itemName')} style={{ flex: 1 }} />
        </Space.Compact>
      )
    },
    {
      title: 'HSN', dataIndex: 'hsn', key: 'hsn', width: 80,
      render: (_, record) => <Input value={record.hsn} onChange={e => updateItem(record.key, 'hsn', e.target.value)} placeholder={t('placeholder.hsn')} />
    },
    {
      title: t('invoice.qty'), dataIndex: 'qty', key: 'qty', width: 70,
      render: (_, record) => <InputNumber min={1} value={record.qty} onChange={v => updateItem(record.key, 'qty', v)} style={{ width: '100%' }} />
    },
    {
      title: t('invoice.rate'), dataIndex: 'rate', key: 'rate', width: 100,
      render: (_, record) => <InputNumber min={0} step={0.01} prefix="₹" value={record.rate} onChange={v => updateItem(record.key, 'rate', v)} style={{ width: '100%' }} />
    },
    {
      title: t('invoice.taxRate'), dataIndex: 'taxRate', key: 'taxRate', width: 75,
      render: (_, record) => (
        <Select value={record.taxRate} onChange={v => updateItem(record.key, 'taxRate', v)} style={{ width: '100%' }}>
          {[0, 5, 12, 18, 28].map(t => <Select.Option key={t} value={t}>{t}%</Select.Option>)}
        </Select>
      )
    },
    {
      title: t('common.amount'), dataIndex: 'amount', key: 'amount', width: 100, align: 'right',
      render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>
    },
    {
      title: '', key: 'action', width: 45,
      render: (_, record) => (
        <Popconfirm title={t('common.remove')} onConfirm={() => removeItem(record.key)}>
          <Button type="text" danger icon={<DeleteOutlined />} disabled={items.length <= 1} size="small" />
        </Popconfirm>
      )
    },
  ];

  const paymentColumns = [
    { title: t('common.date'), dataIndex: 'date', key: 'date', width: 100 },
    { title: t('invoice.paymentMethod'), dataIndex: 'method', key: 'method', width: 100, render: (t) => <Tag>{t}</Tag> },
    { title: t('common.amount'), dataIndex: 'amount', key: 'amount', align: 'right', render: (v) => <Text strong style={{ color: '#52c41a' }}>₹{Number(v).toFixed(2)}</Text> },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (t) => t || '-' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col>
            <Space align="center" size={14}>
              <div className="gradient-icon">
                <FileTextOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t(isEdit ? 'invoice.editTitle' : 'invoice.newTitle')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{isEdit ? 'Edit existing invoice' : 'Create a new invoice'}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<FilePdfOutlined />} onClick={() => setTemplatePreviewOpen(true)}>
                {t('invoice.template')}: {selectedTemplate.charAt(0).toUpperCase() + selectedTemplate.slice(1)}
              </Button>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>{t('common.back')}</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Card>
        <Form form={form} layout="vertical" initialValues={{
          date: dayjs(), status: 'unpaid', invoiceNo: 'Loading...',
        }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={t('invoice.invoiceNo')} name="invoiceNo" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Item label={t('common.date')} name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Item label={t('invoice.dueDate')} name="dueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Item label={t('invoice.poNumber')} name="poNumber">
                <Input placeholder={t('placeholder.search')} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Item label={t('common.status')} name="status">
                <Select>
                  <Select.Option value="unpaid">{t('common.unpaid')}</Select.Option>
                  <Select.Option value="paid">{t('common.paid')}</Select.Option>
                  <Select.Option value="partial">{t('common.partial')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={3}>
              <Form.Item label={t('invoice.paymentTerms')} name="paymentTerms">
                <Select allowClear>
                  <Select.Option value="due_on_receipt">{t('settingsPaymentTerms.dueOnReceipt')}</Select.Option>
                  <Select.Option value="net_7">{t('settingsPaymentTerms.net7')}</Select.Option>
                  <Select.Option value="net_15">{t('settingsPaymentTerms.net15')}</Select.Option>
                  <Select.Option value="net_30">{t('settingsPaymentTerms.net30')}</Select.Option>
                  <Select.Option value="net_45">{t('settingsPaymentTerms.net45')}</Select.Option>
                  <Select.Option value="net_60">{t('settingsPaymentTerms.net60')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('invoice.customer')} name="customerId">
                <Select showSearch placeholder={t('placeholder.selectCustomer')} onChange={selectCustomer}
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
              <Form.Item label={t('invoice.contactName')} name="customerName">
                <Input placeholder={t('placeholder.search')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('invoice.companyName')} name="customerCompany">
                <Input placeholder={t('placeholder.search')} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item label={t('invoice.gstin')} name="customerGstin">
                <Input placeholder="GSTIN" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item label={t('invoice.state')} name="customerState">
                <Select showSearch placeholder={t('placeholder.search')} allowClear>
                  {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Puducherry','Chandigarh','Andaman and Nicobar','Dadra and Nagar Haveli','Daman and Diu','Lakshadweep','Ladakh','Jammu and Kashmir'].map(s => (
                    <Select.Option key={s} value={s}>{s}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item label={t('invoice.stateCode')} name="customerStateCode">
                <Input placeholder="e.g. 27" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label={t('invoice.billingAddress')} name="customerAddress">
                <Input.TextArea rows={2} placeholder={t('placeholder.address')} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label={t('invoice.shippingAddress')} name="customerShippingAddress">
                <Input.TextArea rows={2} placeholder="Shipping address (if different)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('invoice.customerEmail')} name="customerEmail">
                <Input placeholder={t('placeholder.email')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('invoice.customerPhone')} name="customerPhone">
                <Input placeholder={t('placeholder.phone')} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('invoice.reverseCharge')} name="reverseCharge" valuePropName="checked">
                <Select>
                  <Select.Option value={false}>{t('common.no')}</Select.Option>
                  <Select.Option value={true}>{t('common.yes')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Col>
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #eb2f96, #f06292)', width: 28, height: 28, borderRadius: 6 }}>
                  <ShoppingOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <Text strong style={{ fontSize: 15 }}>{t('invoice.items')}</Text>
              </Space>
            </Col>
            <Col><Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>{t('invoice.addItem')}</Button></Col>
          </Row>

          <Table dataSource={items} columns={itemColumns} rowKey="key" pagination={false}
            size="small" scroll={{ x: 700 }} />

          <Divider style={{ margin: '16px 0' }} />

          <Row justify="end">
            <Col xs={24} sm={14} md={8}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 18px', background: 'rgba(var(--accent-rgb), 0.03)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <Row justify="space-between"><Text type="secondary">{t('invoice.subtotal')}</Text><Text>₹{totals.subtotal.toFixed(2)}</Text></Row>
                <Row justify="space-between"><Text type="secondary">{t('invoice.cgst')} ({(totals.subtotal > 0 ? (totals.cgst / totals.subtotal * 100).toFixed(1) : 0)}%)</Text><Text>₹{totals.cgst.toFixed(2)}</Text></Row>
                <Row justify="space-between"><Text type="secondary">{t('invoice.sgst')} ({(totals.subtotal > 0 ? (totals.sgst / totals.subtotal * 100).toFixed(1) : 0)}%)</Text><Text>₹{totals.sgst.toFixed(2)}</Text></Row>
                <Row justify="space-between" align="middle">
                  <Text type="secondary">{t('invoice.discount')}</Text>
                  <InputNumber prefix="₹" min={0} step={0.01} value={discount}
                    onChange={v => setDiscount(v || 0)} style={{ width: 120 }} />
                </Row>
                <Divider style={{ margin: '4px 0' }} />
                <Row justify="space-between">
                  <Text strong style={{ fontSize: 16 }}>{t('invoice.grandTotal')}</Text>
                  <Text strong style={{ fontSize: 16, color: 'var(--accent)' }}>₹{totals.grandTotal.toFixed(2)}</Text>
                </Row>
              </div>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0' }} />

          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Col>
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #13c2c2, #36cfc9)', width: 28, height: 28, borderRadius: 6 }}>
                  <TruckOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <Text strong style={{ fontSize: 15 }}>{t('invoice.transportDetails')}</Text>
              </Space>
            </Col>
            <Col>
              <Button size="small" type={showTransport ? 'primary' : 'default'}
                onClick={() => setShowTransport(!showTransport)}>
                {showTransport ? t('invoice.removeTransport') : t('invoice.addTransport')}
              </Button>
            </Col>
          </Row>

          {showTransport && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label={t('invoice.transporterName')} name="transporterName">
                  <Input placeholder="Transporter / Courier" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label={t('invoice.vehicleNumber')} name="vehicleNumber">
                  <Input placeholder="Vehicle" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label={t('invoice.lrNumber')} name="lrNumber">
                  <Input placeholder="LR No" />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label={t('invoice.modeOfTransport')} name="modeOfTransport">
                  <Select allowClear>
                    <Select.Option value="Road">{t('transport.road')}</Select.Option>
                    <Select.Option value="Air">{t('transport.air')}</Select.Option>
                    <Select.Option value="Rail">{t('transport.rail')}</Select.Option>
                    <Select.Option value="Sea">{t('transport.sea')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <Form.Item label={t('invoice.dateOfSupply')} name="dateOfSupply">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('invoice.placeOfSupply')} name="placeOfSupply">
                  <Input placeholder="Place of supply" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Col>
              <Space>
                <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #faad14, #ffc53d)', width: 28, height: 28, borderRadius: 6 }}>
                  <BellOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <Text strong style={{ fontSize: 15 }}>{t('invoice.paymentReminder')}</Text>
              </Space>
            </Col>
            <Col>
              <Button size="small" type={showReminder ? 'primary' : 'default'}
                onClick={() => setShowReminder(!showReminder)}>
                {showReminder ? t('invoice.removeReminder') : t('invoice.setReminder')}
              </Button>
            </Col>
          </Row>

          {showReminder && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item label={t('invoice.reminderDate')} name="reminderDate">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item label={t('invoice.reminderSent')} name="reminderSent" valuePropName="checked">
                  <Select>
                    <Select.Option value={false}>{t('common.no')}</Select.Option>
                    <Select.Option value={true}>{t('common.yes')}</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={10}>
                <Form.Item label={t('invoice.reminderNote')} name="reminderNote">
                  <Input placeholder={t('placeholder.notes')} />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('invoice.paymentMethod')} name="paymentMethod">
                <Select allowClear>
                  <Select.Option value="Cash">{t('paymentMethods.cash')}</Select.Option>
                  <Select.Option value="UPI">{t('paymentMethods.upi')}</Select.Option>
                  <Select.Option value="Bank Transfer">{t('paymentMethods.bankTransfer')}</Select.Option>
                  <Select.Option value="Card">{t('paymentMethods.card')}</Select.Option>
                  <Select.Option value="Cheque">{t('paymentMethods.cheque')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('common.notes')} name="notes">
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
                  <Text>{t('invoice.paymentHistory')} ({payments.length})</Text>
                  <Tag color="green">₹{totalPaid.toFixed(2)} {t('common.paid')}</Tag>
                  {balance > 0 && <Tag color="red">₹{balance.toFixed(2)} {t('invoice.balance')}</Tag>}
                </Space>
              ),
              children: <Table dataSource={payments} columns={paymentColumns} rowKey="id" pagination={false} size="small" />,
            }]} />
          </div>
        )}

        <Row justify="space-between" align="middle">
          <Col>
            {isEdit && (
              <Button icon={<DollarOutlined />} onClick={() => {
                paymentForm.resetFields();
                paymentForm.setFieldsValue({ date: dayjs(), method: 'Cash', amount: balance > 0 ? balance : '' });
                setShowPayment(true);
              }}>
                {t('invoice.recordPayment')}
              </Button>
            )}
          </Col>
          <Col>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>{t('common.cancel')}</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={saving}>{t('common.save')}</Button>
              <Button icon={<FilePdfOutlined />} onClick={() => handleSave(true, selectedTemplate)} loading={saving}
                style={{ background: '#52c41a', borderColor: '#52c41a', color: 'white' }}>
                {t('common.save')} &amp; PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Drawer title={t('invoice.recordPayment')} open={showPayment} onClose={() => setShowPayment(false)}
        placement="right" width={400}
        extra={
          <Space>
            <Button onClick={() => setShowPayment(false)}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleRecordPayment}>{t('common.save')}</Button>
          </Space>
        }>
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="amount" label={t('common.amount')} rules={[{ required: true }]}>
            <InputNumber min={1} max={totals.grandTotal} step={0.01} prefix="₹" style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="method" label={t('invoice.paymentMethod')}>
                <Select>
                  <Select.Option value="Cash">{t('paymentMethods.cash')}</Select.Option>
                  <Select.Option value="UPI">{t('paymentMethods.upi')}</Select.Option>
                  <Select.Option value="Bank Transfer">{t('paymentMethods.bankTransfer')}</Select.Option>
                  <Select.Option value="Card">{t('paymentMethods.card')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label={t('common.date')}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reference" label="Reference">
            <Input placeholder="Cheque/UTR no." />
          </Form.Item>
          <Form.Item name="note" label={t('common.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      <TemplatePreview
        selected={selectedTemplate}
        visible={templatePreviewOpen}
        onClose={() => setTemplatePreviewOpen(false)}
        onSelect={(key) => { setSelectedTemplate(key); setTemplatePreviewOpen(false); }}
      />
    </div>
  );
}
