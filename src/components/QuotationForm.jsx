import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Select, DatePicker, InputNumber, Button, Table, Card, Typography, Space,
  message, Divider, Row, Col, Popconfirm, Modal
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, FilePdfOutlined, ArrowLeftOutlined,
  SwapOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { getSettings, logActivity, addQuotation, updateQuotation, convertQuotationToInvoice, getNextQuotationNo } from '../db';
import { generateQuotationPDF } from '../utils/pdfExport';

const { Title, Text } = Typography;

export default function QuotationForm() {
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
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [quotationNo, setQuotationNo] = useState('');
  const [convertedInfo, setConvertedInfo] = useState(null);

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
        getNextQuotationNo().then(nextNo => {
          setQuotationNo(nextNo);
          form.setFieldsValue({ quotationNo: nextNo });
        });
      }
      if (isEdit) {
        db.quotations.get(Number(id)).then(q => {
          if (q) {
            form.setFieldsValue({
              quotationNo: q.quotationNo,
              date: q.date ? dayjs(q.date) : dayjs(),
              validUntil: q.validUntil ? dayjs(q.validUntil) : null,
              status: q.status || 'draft',
              customerId: q.customerId,
              customerName: q.customerName,
              customerCompany: q.customerCompany || '',
              customerGstin: q.customerGstin || '',
              customerState: q.customerState || '',
              customerAddress: q.customerAddress || '',
              customerShippingAddress: q.customerShippingAddress || '',
              customerStateCode: q.customerStateCode || '',
              notes: q.notes || '',
            });
            setDiscount(Number(q.discount) || 0);
            if (q.items?.length > 0) {
              setItems(q.items.map((item, i) => ({ ...item, key: i + 1 })));
            }
            if (q.status === 'converted' && q.convertedToInvoiceId) {
              setConvertedInfo({ invoiceId: q.convertedToInvoiceId });
            }
          }
        });
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

  async function handleSave(withPdf = false, templateOverride) {
    try {
      setSaving(true);
      const values = await form.validateFields();
      const data = {
        quotationNo: values.quotationNo,
        date: values.date.format('YYYY-MM-DD'),
        validUntil: values.validUntil ? values.validUntil.format('YYYY-MM-DD') : '',
        customerId: values.customerId || '',
        customerName: values.customerName || '',
        customerCompany: values.customerCompany || '',
        customerGstin: values.customerGstin || '',
        customerState: values.customerState || '',
        customerAddress: values.customerAddress || '',
        customerShippingAddress: values.customerShippingAddress || '',
        customerStateCode: values.customerStateCode || '',
        status: values.status || 'draft',
        notes: values.notes || '',
        items: items.map(({ key, ...rest }) => rest),
        discount: Number(discount) || 0,
        ...totals,
      };

      if (isEdit) {
        await updateQuotation(id, data);
      } else {
        await addQuotation(data);
      }

      if (withPdf) {
        const qData = { ...data };
        if (isEdit) {
          const existing = await db.quotations.get(Number(id));
          qData.quotationNo = existing.quotationNo;
        }
        await generateQuotationPDF(qData, templateOverride);
      }

      message.success(withPdf ? 'Quotation saved & PDF downloaded!' : 'Quotation saved!');
      navigate('/quotations');
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        message.error('Error saving quotation');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConvertToInvoice() {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      const data = {
        date: values.date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        validUntil: values.validUntil?.format('YYYY-MM-DD') || '',
        customerId: values.customerId || '',
        customerName: values.customerName || '',
        customerCompany: values.customerCompany || '',
        customerGstin: values.customerGstin || '',
        customerState: values.customerState || '',
        customerAddress: values.customerAddress || '',
        customerShippingAddress: values.customerShippingAddress || '',
        customerStateCode: values.customerStateCode || '',
        notes: values.notes || '',
        items: items.map(({ key, ...rest }) => rest),
        discount: Number(discount) || 0,
        ...totals,
      };

      let qId = id;
      if (!isEdit) {
        const saved = await addQuotation({ ...data, status: 'draft' });
        qId = saved.id;
      } else {
        await updateQuotation(id, { ...data, status: 'draft' });
      }

      const result = await convertQuotationToInvoice(qId);
      message.success(`Quotation converted to invoice ${result.invoiceNo}!`);
      navigate(`/invoice/edit/${result.invoiceId}`);
    } catch (err) {
      if (err.message?.includes('already converted')) {
        message.warning(err.message);
      } else if (err.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        message.error('Error converting quotation');
      }
    }
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

  return (
    <div>
      <Row align="middle" style={{ marginBottom: 20 }}>
        <Col flex="auto">
          <Title level={3} style={{ margin: 0 }}>{isEdit ? 'Edit Quotation' : 'New Quotation'}</Title>
          <Text type="secondary">Create a price estimate for your customer</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/quotations')}>Back</Button>
          </Space>
        </Col>
      </Row>

      {convertedInfo && (
        <Card size="small" style={{ marginBottom: 16, borderLeft: '3px solid #52c41a' }}>
          <Text style={{ color: '#52c41a' }}>
            This quotation has been converted to an invoice.{' '}
            <Button type="link" size="small" onClick={() => navigate(`/invoice/edit/${convertedInfo.invoiceId}`)}>
              View Invoice
            </Button>
          </Text>
        </Card>
      )}

      <Card>
        <Form form={form} layout="vertical" initialValues={{
          date: dayjs(), status: 'draft', quotationNo: 'Loading...',
        }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="Quotation No" name="quotationNo" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Item label="Date" name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Item label="Valid Until" name="validUntil">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label="Status" name="status">
                <Select>
                  <Select.Option value="draft">Draft</Select.Option>
                  <Select.Option value="sent">Sent</Select.Option>
                  <Select.Option value="accepted">Accepted</Select.Option>
                  <Select.Option value="rejected">Rejected</Select.Option>
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
            <Col><Text strong>Quotation Items</Text></Col>
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

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={2} placeholder="Terms, conditions, delivery info..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Row justify="end" gutter={12} align="middle">
          <Col>
            <Button onClick={() => navigate('/quotations')}>Cancel</Button>
          </Col>
          <Col>
            <Button icon={<SwapOutlined />} onClick={handleConvertToInvoice}
              disabled={convertedInfo}>
              Convert to Invoice
            </Button>
          </Col>
          <Col>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={saving}>
              Save
            </Button>
          </Col>
          <Col>
            <Button icon={<FilePdfOutlined />} onClick={() => handleSave(true, selectedTemplate)} loading={saving}
              style={{ background: '#52c41a', borderColor: '#52c41a', color: 'white' }}>
              PDF
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
}