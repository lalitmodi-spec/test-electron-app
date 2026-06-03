import { useEffect, useState, useRef } from 'react';
import { Card, Form, Input, Select, Button, Typography, Row, Col, message, Tabs, Space, Popconfirm, Alert, Upload, Image, Divider, InputNumber } from 'antd';
import { SaveOutlined, DownloadOutlined, UploadOutlined, DeleteOutlined, PlusOutlined, EyeOutlined, FilePdfOutlined } from '@ant-design/icons';
import db, { getSettings, updateSetting, logActivity } from '../db';
import TemplatePreview from '../pdf/TemplatePreview';

const { Title, Text } = Typography;

export default function Settings() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const fileInputRef = useRef(null);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [templatePreviewSelected, setTemplatePreviewSelected] = useState('professional');

  useEffect(() => {
    getSettings().then(s => {
      form.setFieldsValue(s);
      if (s.businessLogo) {
        setLogoPreview(s.businessLogo);
      } else if (window.electronAPI) {
        window.electronAPI.readLogo().then(r => {
          if (r.success && r.data) {
            setLogoPreview(r.data);
            form.setFieldsValue({ businessLogo: r.data });
          }
        });
      }
    });
  }, [form]);

  async function handleLogoUpload(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      if (window.electronAPI) {
        const result = await window.electronAPI.saveLogo({ base64Data: base64, filename: file.name });
        if (result.success) {
          setLogoPreview(base64);
          form.setFieldsValue({ businessLogo: base64 });
          await updateSetting('businessLogo', base64);
          message.success('Logo saved to local storage');
        }
      } else {
        setLogoPreview(base64);
        form.setFieldsValue({ businessLogo: base64 });
      }
    };
    reader.readAsDataURL(file);
    return false;
  }

  async function handleRemoveLogo() {
    setLogoPreview('');
    form.setFieldsValue({ businessLogo: '' });
    if (window.electronAPI) {
      await window.electronAPI.deleteLogo();
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const values = await form.validateFields();
      for (const [key, value] of Object.entries(values)) {
        await updateSetting(key, value);
      }
      document.documentElement.classList.toggle('dark', values.theme === 'dark');
      await logActivity('settings', 'Updated business settings');
      message.success('Settings saved');
    } catch {
      message.error('Error saving settings');
    }
    setSaving(false);
  }

  async function handleExport() {
    if (window.electronAPI) {
      const result = await window.electronAPI.exportData();
      if (!result.success) return;
      const data = {
        customers: await db.customers.toArray(),
        products: await db.products.toArray(),
        invoices: await db.invoices.toArray(),
        expenses: await db.expenses.toArray(),
        payments: await db.payments?.toArray(),
        settings: await db.settings.toArray(),
      };
      await window.electronAPI.saveExport({ filePath: result.filePath, data });
      await logActivity('export', 'Exported all data');
      message.success('Data exported successfully!');
    } else {
      message.info('Export available in Electron app');
    }
  }

  async function handleImport() {
    if (!window.electronAPI) return message.info('Import available in Electron app');
    setImporting(true);
    try {
      const result = await window.electronAPI.importData();
      if (!result.success) return;
      const data = result.data;
      if (data.customers) await db.customers.bulkAdd(data.customers);
      if (data.products) await db.products.bulkAdd(data.products);
      if (data.invoices) await db.invoices.bulkAdd(data.invoices);
      if (data.expenses) await db.expenses.bulkAdd(data.expenses);
      if (data.payments && db.payments) await db.payments.bulkAdd(data.payments);
      if (data.settings) await db.settings.bulkAdd(data.settings);
      await logActivity('import', 'Imported data from backup');
      message.success('Data imported! Reload to see changes.');
    } finally {
      setImporting(false);
    }
  }

  async function handleClearData() {
    await db.customers.clear();
    await db.products.clear();
    await db.invoices.clear();
    await db.expenses.clear();
    await db.activity.clear();
    if (db.payments) await db.payments.clear();
    message.success('All data cleared');
  }

  const tabItems = [
    {
      key: 'business',
      label: 'Business Info',
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Business Logo">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {logoPreview && (
                  <div style={{ position: 'relative' }}>
                    <Image src={logoPreview} alt="Logo" width={80} style={{ borderRadius: 8, objectFit: 'contain', maxHeight: 80 }} />
                    <Button size="small" danger shape="circle" icon={<DeleteOutlined />}
                      onClick={handleRemoveLogo}
                      style={{ position: 'absolute', top: -8, right: -8 }} />
                  </div>
                )}
                <input type="file" accept="image/*" ref={fileInputRef}
                  onChange={(e) => e.target.files[0] && handleLogoUpload(e.target.files[0])}
                  style={{ display: 'none' }} />
                <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>PNG or JPG, will appear on PDF invoices</Text>
              </div>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="businessName" label="Business Name" rules={[{ required: true }]}>
              <Input placeholder="Your business name" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="businessAddress" label="Address">
              <Input.TextArea rows={2} placeholder="Full address" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessPhone" label="Phone">
              <Input placeholder="Phone number" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessEmail" label="Email">
              <Input placeholder="Email address" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessGstin" label="GSTIN">
              <Input placeholder="GSTIN" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="defaultTaxRate" label="Default Tax Rate">
              <Select>
                {[0, 5, 12, 18, 28].map(t => <Select.Option key={t} value={t}>{t}%</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessUpiId" label="UPI ID (for QR on invoice)">
              <Input placeholder="example@upi" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'bank',
      label: 'Bank Details',
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              Bank details will appear on PDF invoices for payment reference.
            </Text>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessBankName" label="Bank Name">
              <Input placeholder="e.g. State Bank of India" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessBankAccount" label="Account Number">
              <Input placeholder="Account number" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessBankIfsc" label="IFSC Code">
              <Input placeholder="IFSC code" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'invoice',
      label: 'Invoice Defaults',
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="taxLabel" label="Tax Label">
              <Input placeholder="GST / VAT / Sales Tax" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="currency" label="Currency">
              <Select>
                <Select.Option value="INR">INR (₹)</Select.Option>
                <Select.Option value="USD">USD ($)</Select.Option>
                <Select.Option value="EUR">EUR (€)</Select.Option>
                <Select.Option value="GBP">GBP (£)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="invoiceTemplate" label="Default PDF Template">
              <Select>
                <Select.Option value="professional">Professional (Indigo)</Select.Option>
                <Select.Option value="classic">Classic (Blue)</Select.Option>
                <Select.Option value="minimal">Minimal (Clean)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Divider style={{ margin: '8px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 12 }}>Invoice Numbering</Text>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoicePrefix" label="Prefix">
              <Input placeholder="INV" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceSeparator" label="Separator">
              <Input placeholder="-" maxLength={2} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceZeroPad" label="Zero Padding">
              <Select>
                {[3, 4, 5, 6].map(n => <Select.Option key={n} value={n}>{n} digits (e.g. 00{Array(n-2).fill(0).join('')}1)</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceNextNumber" label="Next Number">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>  
          <Col span={24}>
            <Form.Item name="termsConditions" label="Terms & Conditions (for PDF)">
              <Input.TextArea rows={3} placeholder="Terms and conditions..." />
            </Form.Item>
          </Col>

          <Col span={24}>
            <div style={{
              background: '#1a2332', borderRadius: 12, padding: 20, marginTop: 8,
              border: '1px solid #2a3444'
            }}>
              <Space style={{ marginBottom: 16 }}>
                <FilePdfOutlined style={{ color: '#6366f1', fontSize: 18 }} />
                <Text strong style={{ fontSize: 15 }}>Template Preview Gallery</Text>
              </Space>
              <Row gutter={12}>
                {[
                  { key: 'professional', label: 'Professional', desc: 'Indigo header, clean layout', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                  { key: 'classic', label: 'Classic', desc: 'Blue header, bordered sections', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
                  { key: 'minimal', label: 'Minimal', desc: 'Dark sleek, compact', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
                ].map(t => (
                  <Col xs={24} sm={8} key={t.key}>
                    <div style={{
                      background: t.bg, borderRadius: 10, padding: 16, textAlign: 'center',
                      border: `1px solid ${t.color}33`, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                      onClick={() => {
                        setTemplatePreviewSelected(t.key);
                        setTemplatePreviewOpen(true);
                      }}>
                      <FilePdfOutlined style={{ fontSize: 32, color: t.color, marginBottom: 8 }} />
                      <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>{t.label}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>{t.desc}</div>
                      <Button size="small" icon={<EyeOutlined />}>Preview</Button>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          </Col>
        </Row>
      ),
    },
    {
      key: 'appearance',
      label: 'Appearance',
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="theme" label="Theme">
              <Select>
                <Select.Option value="dark">Dark Mode</Select.Option>
                <Select.Option value="light">Light Mode</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'data',
      label: 'Data Management',
      children: (
        <div>
          <Alert message="Data Management"
            description="Export your data as JSON backup, or import previously exported data. Clearing data is irreversible."
            type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }} />
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export Data</Button>
            <Button icon={<UploadOutlined />} onClick={handleImport} disabled={importing}>Import Data</Button>
            <Popconfirm title="Delete ALL data?" description="This cannot be undone!" onConfirm={handleClearData}>
              <Button danger icon={<DeleteOutlined />}>Clear All Data</Button>
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      <Row align="middle" style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Title level={3} style={{ margin: 0 }}>Settings</Title>
          <Text type="secondary">Manage your business profile</Text>
        </Col>
        <Col>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>Save Settings</Button>
        </Col>
      </Row>

      <Card styles={{ body: { padding: '16px 20px' } }}>
        <Form form={form} layout="vertical">
          <Tabs items={tabItems} />
        </Form>
      </Card>

      <TemplatePreview
        selected={templatePreviewSelected}
        visible={templatePreviewOpen}
        onClose={() => setTemplatePreviewOpen(false)}
      />
    </div>
  );
}
