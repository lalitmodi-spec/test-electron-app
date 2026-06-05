import { useEffect, useState, useRef } from 'react';
import { Card, Form, Input, Select, Button, Typography, Row, Col, message, Tabs, Space, Popconfirm, Alert, Image, Divider, InputNumber, Modal, Table, Tooltip } from 'antd';
import { SaveOutlined, DownloadOutlined, UploadOutlined, DeleteOutlined, EyeOutlined, FilePdfOutlined, BellOutlined, LockOutlined, SafetyCertificateOutlined, SettingOutlined, CloudDownloadOutlined, CloudUploadOutlined, HistoryOutlined, MailOutlined } from '@ant-design/icons';
import db, { getSettings, updateSetting, logActivity, backupAllData, saveBackupRecord, restoreAllData, getBackupHistory, deleteBackupRecord } from '../db';
import TemplatePreview from '../pdf/TemplatePreview';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text } = Typography;

export default function Settings() {
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [logoPreview, setLogoPreview] = useState('');
  const fileInputRef = useRef(null);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [templatePreviewSelected, setTemplatePreviewSelected] = useState('professional');
  const [smtpTesting, setSmtpTesting] = useState(false);

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
      if (window.electronAPI) {
        window.electronAPI.getSmtpConfig().then(r => {
          if (r.success && r.config) {
            form.setFieldsValue({
              smtpHost: r.config.host,
              smtpPort: r.config.port,
              smtpUser: r.config.user,
              smtpPass: r.config.pass,
              smtpFromEmail: r.config.fromEmail,
              smtpSecure: r.config.secure,
            });
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
          message.success(t('msg.saved'));
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
      const smtpKeys = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFromEmail', 'smtpSecure'];
      for (const [key, value] of Object.entries(values)) {
        if (!smtpKeys.includes(key)) {
          await updateSetting(key, value);
        }
      }
      if (window.electronAPI) {
        await window.electronAPI.saveSmtpConfig({
          host: values.smtpHost,
          port: values.smtpPort,
          user: values.smtpUser,
          pass: values.smtpPass,
          fromEmail: values.smtpFromEmail,
          secure: values.smtpSecure,
        });
      }
      document.documentElement.classList.toggle('dark', values.theme === 'dark');
      await logActivity('settings', t('activity.settings'));
      message.success(t('msg.saved'));
    } catch {
      message.error(t('msg.errorSaving'));
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
      await logActivity('export', t('activity.export'));
      message.success(t('msg.dataExported'));
    } else {
      message.info(t('common.export'));
    }
  }

  async function handleImport() {
    if (!window.electronAPI) return message.info(t('common.import'));
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
      await logActivity('import', t('activity.import'));
      message.success(t('msg.dataImported'));
    } finally {
      setImporting(false);
    }
  }

  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinForm] = Form.useForm();
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupRestoring, setBackupRestoring] = useState(false);

  useEffect(() => {
    getBackupHistory().then(setBackupHistory);
  }, []);

  async function handleClearData() {
    if (clearConfirmText !== 'DELETE') {
      message.warning(t('common.clearDataType'));
      return;
    }
    await db.customers.clear();
    await db.products.clear();
    await db.invoices.clear();
    await db.expenses.clear();
    await db.activity.clear();
    if (db.payments) await db.payments.clear();
    message.success(t('msg.dataCleared'));
    setClearModalOpen(false);
    setClearConfirmText('');
  }

  async function handleCreateBackup() {
    if (!window.electronAPI) return message.info(t('common.export'));
    const result = await window.electronAPI.backupData();
    if (!result.success) return;
    const data = await backupAllData();
    const totalRecords = (data.customers?.length || 0) + (data.products?.length || 0) +
      (data.invoices?.length || 0) + (data.expenses?.length || 0) + (data.payments?.length || 0) +
      (data.creditNotes?.length || 0) + (data.purchases?.length || 0) + (data.vendors?.length || 0) +
      (data.quotations?.length || 0);
    await window.electronAPI.saveBackupFile({ filePath: result.filePath, data });
    const filename = result.filePath.split('/').pop().split('\\').pop();
    const recordId = await saveBackupRecord({ filename, totalRecords, filePath: result.filePath });
    await logActivity('backup', `Backup created: ${filename} (${totalRecords} records)`);
    setBackupHistory(prev => [{ id: recordId, filename, totalRecords, filePath: result.filePath, createdAt: new Date().toISOString() }, ...prev]);
    message.success(t('msg.backupCreated'));
  }

  async function handleRestoreBackup() {
    if (!window.electronAPI) return message.info(t('common.import'));
    setBackupRestoring(true);
    try {
      const result = await window.electronAPI.restoreBackup();
      if (!result.success) return;
      await restoreAllData(result.data);
      await logActivity('backup', 'Data restored from backup');
      message.success(t('msg.backupRestored'));
    } finally {
      setBackupRestoring(false);
    }
  }

  async function handleSavePin() {
    const values = await pinForm.validateFields();
    if (values.newPin !== values.confirmPin) {
      message.warning(t('common.pinMatch'));
      return;
    }
    await db.settings.put({ id: 'appPin', key: 'appPin', value: values.newPin });
    message.success(t('common.pinSaved'));
    setPinModalOpen(false);
    pinForm.resetFields();
  }

  async function handleRemovePin() {
    await db.settings.delete('appPin');
    message.success(t('common.pinRemoved'));
  }

  const businessTypeOptions = [
    { value: 'Proprietorship', translation: t('businessTypes.proprietorship') },
    { value: 'Partnership', translation: t('businessTypes.partnership') },
    { value: 'Private Limited', translation: t('businessTypes.privateLimited') },
    { value: 'LLP', translation: t('businessTypes.llp') },
    { value: 'Public Limited', translation: t('businessTypes.publicLimited') },
    { value: 'HUF', translation: t('businessTypes.huf') },
    { value: 'Other', translation: t('businessTypes.other') },
  ];

  const paymentTermOptions = [
    { value: 'due_on_receipt', translation: t('settingsPaymentTerms.dueOnReceipt') },
    { value: 'net_7', translation: t('settingsPaymentTerms.net7') },
    { value: 'net_15', translation: t('settingsPaymentTerms.net15') },
    { value: 'net_30', translation: t('settingsPaymentTerms.net30') },
    { value: 'net_45', translation: t('settingsPaymentTerms.net45') },
    { value: 'net_60', translation: t('settingsPaymentTerms.net60') },
  ];

  const templateCards = [
    { key: 'professional', desc: 'Indigo header, clean layout', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { key: 'classic', desc: 'Blue header, bordered sections', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { key: 'minimal', desc: 'Dark sleek, compact', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ];

  const tabItems = [
    {
      key: 'business',
      label: t('settings.businessInfo'),
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label={t('settings.businessLogo')}>
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
                  {t('common.upload')}
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('settings.logoHelp')}</Text>
              </div>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="businessName" label={t('settings.businessName')} rules={[{ required: true }]}>
              <Input placeholder={t('settings.businessName')} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="businessAddress" label={t('settings.address')}>
              <Input.TextArea rows={2} placeholder={t('settings.address')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessPhone" label={t('settings.phone')}>
              <Input placeholder={t('placeholder.phone')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessEmail" label={t('settings.email')}>
              <Input placeholder={t('placeholder.email')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessGstin" label={t('settings.gstin')}>
              <Input placeholder={t('settings.gstin')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="defaultTaxRate" label={t('settings.defaultTaxRate')}>
              <Select>
                {[0, 5, 12, 18, 28].map(rate => <Select.Option key={rate} value={rate}>{rate}%</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessUpiId" label={t('settings.upiId')}>
              <Input placeholder={t('settings.upiId')} />
            </Form.Item>
          </Col>
          <Col span={24}><Divider style={{ margin: '4px 0' }} /><Text strong>{t('settings.additionalInfo')}</Text></Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessPan" label={t('settings.pan')}>
              <Input placeholder={t('settings.pan')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessCin" label={t('settings.cin')}>
              <Input placeholder={t('settings.cin')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessFssai" label={t('settings.fssai')}>
              <Input placeholder={t('settings.fssai')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessMsme" label={t('settings.msme')}>
              <Input placeholder={t('settings.msme')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessType" label={t('settings.businessType')}>
              <Select>
                {businessTypeOptions.map(o => (
                  <Select.Option key={o.value} value={o.value}>{o.translation}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'bank',
      label: t('settings.bankDetails'),
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              {t('settings.bankDetails')}
            </Text>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessBankName" label={t('settings.bankName')}>
              <Input placeholder={t('settings.bankName')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessBankAccount" label={t('settings.bankAccount')}>
              <Input placeholder={t('settings.bankAccount')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="businessBankIfsc" label={t('settings.bankIfsc')}>
              <Input placeholder={t('settings.bankIfsc')} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'invoice',
      label: t('settings.invoiceDefaults'),
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="taxLabel" label={t('settings.taxLabel')}>
              <Input placeholder={t('settings.taxLabel')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="currency" label={t('settings.currency')}>
              <Select>
                <Select.Option value="INR">INR (₹)</Select.Option>
                <Select.Option value="USD">USD ($)</Select.Option>
                <Select.Option value="EUR">EUR (€)</Select.Option>
                <Select.Option value="GBP">GBP (£)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="invoiceTemplate" label={t('settings.defaultTemplate')}>
              <Select>
                <Select.Option value="professional">{t('pdfTemplates.professional')} (Indigo)</Select.Option>
                <Select.Option value="classic">{t('pdfTemplates.classic')} (Blue)</Select.Option>
                <Select.Option value="minimal">{t('pdfTemplates.minimal')} (Clean)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Divider style={{ margin: '8px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 12 }}>{t('settings.invoiceNumbering')}</Text>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoicePrefix" label={t('settings.prefix')}>
              <Input placeholder={t('settings.prefix')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceSeparator" label={t('settings.separator')}>
              <Input placeholder="-" maxLength={2} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceZeroPad" label={t('settings.zeroPadding')}>
              <Select>
                {[3, 4, 5, 6].map(n => <Select.Option key={n} value={n}>{`${n} ${t('settings.zeroPadding')}`}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="invoiceNextNumber" label={t('settings.nextNumber')}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>  
          <Col span={24}>
            <Form.Item name="termsConditions" label={t('settings.termsConditions')}>
              <Input.TextArea rows={3} placeholder={t('settings.termsConditions')} />
            </Form.Item>
          </Col>

          <Col span={24}>
            <div style={{
              background: '#1a2332', borderRadius: 12, padding: 20, marginTop: 8,
              border: '1px solid #2a3444'
            }}>
              <Space style={{ marginBottom: 16 }}>
                <FilePdfOutlined style={{ color: 'var(--accent)', fontSize: 18 }} />
                <Text strong style={{ fontSize: 15 }}>{t('settings.templatePreview')}</Text>
              </Space>
              <Row gutter={12}>
                {templateCards.map(card => (
                  <Col xs={24} sm={8} key={card.key}>
                    <div style={{
                      background: card.bg, borderRadius: 10, padding: 16, textAlign: 'center',
                      border: `1px solid ${card.color}33`, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                      onClick={() => {
                        setTemplatePreviewSelected(card.key);
                        setTemplatePreviewOpen(true);
                      }}>
                      <FilePdfOutlined style={{ fontSize: 32, color: card.color, marginBottom: 8 }} />
                      <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>{t(`pdfTemplates.${card.key}`)}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>{card.desc}</div>
                      <Button size="small" icon={<EyeOutlined />}>{t('common.preview')}</Button>
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
      key: 'reminders',
      label: <Space><BellOutlined />{t('settings.reminders')}</Space>,
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Alert message={t('settings.reminders')}
              description={t('settings.reminders')}
              type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }} />
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="reminderEnabled" label={t('settings.enableReminders')}>
              <Select>
                <Select.Option value={true}>{t('common.yes')}</Select.Option>
                <Select.Option value={false}>{t('common.no')}</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="reminderDaysBefore" label={t('settings.remindBeforeDue')}>
              <InputNumber min={0} max={60} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="reminderNote" label={t('settings.reminderTemplate')}>
              <Input.TextArea rows={5} placeholder={t('settings.reminderTemplate')} />
            </Form.Item>
            <Text type="secondary">
              {t('settings.reminders')}: {'{{customer}}'}, {'{{invoiceNo}}'}, {'{{amount}}'}, {'{{dueDate}}'}, {'{{businessName}}'}
            </Text>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="defaultPaymentTerms" label={t('settings.defaultPaymentTerms')}>
              <Select>
                {paymentTermOptions.map(o => (
                  <Select.Option key={o.value} value={o.value}>{o.translation}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'appearance',
      label: t('settings.appearance'),
      children: (
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="theme" label={t('settings.theme')}>
              <Select>
                <Select.Option value="dark">{t('settings.darkMode')}</Select.Option>
                <Select.Option value="light">{t('settings.lightMode')}</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Divider style={{ margin: '4px 0' }} />
            <Text strong style={{ display: 'block', marginBottom: 12 }}>{t('settings.accentColor')}</Text>
            <Form.Item name="themeColor" label={t('settings.accentColor')} style={{ marginBottom: 8 }}>
              <Space wrap>
                {['#6366f1', '#2563eb', '#16a34a', '#0d9488', '#9333ea', '#db2777',
                  '#dc2626', '#ea580c', '#d97706', '#0891b2'].map(color => (
                  <Tooltip key={color} title={color}>
                    <div onClick={() => {
                      form.setFieldsValue({ themeColor: color });
                      if (window.applyAccent) window.applyAccent(color);
                    }}
                      style={{
                        width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                        background: color, border: '2px solid transparent',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                    </div>
                  </Tooltip>
                ))}
                <Input type="color" value={form.getFieldValue('themeColor') || '#6366f1'}
                  onChange={e => {
                    form.setFieldsValue({ themeColor: e.target.value });
                    if (window.applyAccent) window.applyAccent(e.target.value);
                  }}
                  style={{ width: 40, height: 32, padding: 0, border: 'none', cursor: 'pointer' }} />
              </Space>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('settings.accentColorDesc')}</Text>
          </Col>
        </Row>
      ),
    },
    {
      key: 'security',
      label: <Space><SafetyCertificateOutlined />{t('settings.security')}</Space>,
      children: (
        <div>
          <Alert message={<Space><SafetyCertificateOutlined />{t('settings.security')}</Space>}
            description={t('common.pinDesc')}
            type="info" showIcon icon={<SafetyCertificateOutlined />}
            style={{ marginBottom: 16, borderRadius: 10 }} />
          <Card styles={{
            body: {
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, rgba(139,92,246,0.08) 100%)',
              borderRadius: 12,
              border: '1px solid rgba(var(--accent-rgb), 0.15)',
            }
          }}>
            <Row gutter={[20, 20]} align="middle">
              <Col xs={24} md={14}>
                <Space direction="vertical" size={8}>
                  <Space>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: 'var(--accent-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <LockOutlined style={{ fontSize: 18, color: 'white' }} />
                    </div>
                    <Text strong style={{ fontSize: 16 }}>{t('common.pin')}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 13 }}>{t('common.pinDesc')}</Text>
                </Space>
              </Col>
              <Col xs={24} md={10}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Button type="primary" icon={<LockOutlined />} block
                    onClick={() => setPinModalOpen(true)}
                    style={{ height: 40, borderRadius: 10 }}>
                    {t('common.pinSetup')}
                  </Button>
                  <Button danger icon={<DeleteOutlined />} block
                    onClick={handleRemovePin}
                    style={{ height: 40, borderRadius: 10 }}>
                    {t('common.pinRemove')}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </div>
      ),
    },
    {
      key: 'email',
      label: <Space><MailOutlined />{t('settings.emailSettings')}</Space>,
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Alert message={t('settings.emailSettings')}
              description={t('settings.emailSettingsDesc')}
              type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }} />
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="smtpHost" label={t('settings.smtpHost')}>
              <Input placeholder="smtp.gmail.com" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="smtpPort" label={t('settings.smtpPort')}>
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item name="smtpSecure" label={t('settings.smtpSecure')}>
              <Select>
                <Select.Option value={true}>SSL/TLS (465)</Select.Option>
                <Select.Option value={false}>STARTTLS (587)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="smtpUser" label={t('settings.smtpUser')}>
              <Input placeholder="your@email.com" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="smtpPass" label={t('settings.smtpPass')}>
              <Input.Password placeholder={t('settings.smtpPass')} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="smtpFromEmail" label={t('settings.smtpFromEmail')}>
              <Input placeholder="your@email.com" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Space>
              <Button
                icon={<MailOutlined />}
                onClick={async () => {
                  setSmtpTesting(true);
                  try {
                    const values = form.getFieldsValue();
                    const result = await window.electronAPI?.sendEmailSmtp({
                      to: values.smtpFromEmail || values.smtpUser,
                      subject: 'Test Email from Billing Pro',
                      body: 'Your SMTP settings are working correctly!',
                    });
                    if (result?.success) {
                      message.success(t('msg.emailSent'));
                    } else {
                      message.error(result?.error || t('msg.emailSendFailed'));
                    }
                  } catch (e) {
                    message.error(e.message);
                  }
                  setSmtpTesting(false);
                }}
                loading={smtpTesting}
              >
                {t('settings.smtpTest')}
              </Button>
            </Space>
          </Col>
        </Row>
      ),
    },
    {
      key: 'data',
      label: t('settings.dataManagement'),
      children: (
        <div>
          <Alert message={t('settings.dataManagement')}
            description={t('settings.dataManagementDesc')}
            type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }} />
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>{t('settings.exportData')}</Button>
            <Button icon={<UploadOutlined />} onClick={handleImport} disabled={importing}>{t('settings.importData')}</Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setClearModalOpen(true)}>{t('settings.clearData')}</Button>
          </Space>
        </div>
      ),
    },
    {
      key: 'backup',
      label: t('settings.backupRestore'),
      children: (
        <div>
          <Alert message={t('settings.backupRestore')}
            description={t('settings.dataManagementDesc')}
            type="info" showIcon style={{ marginBottom: 16, borderRadius: 10 }} />
          <Space wrap style={{ marginBottom: 24 }}>
            <Button icon={<CloudDownloadOutlined />} onClick={handleCreateBackup}>{t('settings.backupCreate')}</Button>
            <Button icon={<CloudUploadOutlined />} onClick={handleRestoreBackup} disabled={backupRestoring}
              loading={backupRestoring}>{t('settings.backupRestoreBtn')}</Button>
          </Space>
          <Divider />
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            <HistoryOutlined style={{ marginRight: 8 }} />{t('settings.backupHistory')}
          </Text>
          <Table
            dataSource={backupHistory}
            rowKey="id"
            size="small"
            pagination={false}
            locale={{ emptyText: t('settings.backupNoData') }}
            columns={[
              { title: t('settings.backupDate'), dataIndex: 'createdAt', key: 'createdAt',
                render: v => new Date(v).toLocaleString() },
              { title: t('settings.backupFile'), dataIndex: 'filename', key: 'filename' },
              { title: t('settings.backupRecords'), dataIndex: 'totalRecords', key: 'totalRecords',
                render: v => v ?? '-' },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={[12, 12]}>
          <Col flex="auto">
            <Space align="center" size={14}>
              <div className="gradient-icon">
                <SettingOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('settings.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{t('settings.businessInfo')}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>{t('settings.save')}</Button>
          </Col>
        </Row>
      </div>

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

      <Modal title={t('common.clearDataConfirm')} open={clearModalOpen}
        onCancel={() => { setClearModalOpen(false); setClearConfirmText(''); }}
        onOk={handleClearData} okText={t('common.clearDataBtn')} okButtonProps={{ danger: true, disabled: clearConfirmText !== 'DELETE' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="danger" strong>{t('common.clearDataWarn')}</Text>
          <div>{t('common.clearDataType')}</div>
          <Input value={clearConfirmText} onChange={e => setClearConfirmText(e.target.value)}
            placeholder={t('common.clearDataPlaceholder')} style={{ width: '100%' }} />
        </Space>
      </Modal>

      <Modal title={t('common.pinSetup')} open={pinModalOpen}
        onCancel={() => { setPinModalOpen(false); pinForm.resetFields(); }}
        onOk={handleSavePin} okText={t('common.pinSaved')}>
        <Form form={pinForm} layout="vertical">
          <Form.Item name="newPin" label={t('common.pinNew')} rules={[
            { required: true, message: t('common.pinRequired') },
            { len: 6, message: t('common.pinDigit') },
            { pattern: /^\d{6}$/, message: t('common.pinDigit') },
          ]}>
            <Input.Password maxLength={6} placeholder={t('common.pinNew')} autoFocus />
          </Form.Item>
          <Form.Item name="confirmPin" label={t('common.pinConfirm')} rules={[
            { required: true, message: t('common.pinMatch') },
          ]}>
            <Input.Password maxLength={6} placeholder={t('common.pinConfirm')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
