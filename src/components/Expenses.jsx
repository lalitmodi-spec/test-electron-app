import { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Table, Card, Button, Input, Select, Space, Drawer, Form, Typography,
  Row, Col, Popconfirm, message, Tag, DatePicker, InputNumber
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  WalletOutlined, SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { getSettings, updateSetting, logActivity } from '../db';

const { Title, Text } = Typography;

export default function Expenses() {
  const { t } = useLanguage();
  const defaultCategories = [
    t('expenseCategories.officeSupplies'), t('expenseCategories.utilities'),
    t('expenseCategories.travel'), t('expenseCategories.food'),
    t('expenseCategories.rent'), t('expenseCategories.maintenance'),
    t('expenseCategories.salary'), t('expenseCategories.marketing'),
    t('expenseCategories.software'), t('expenseCategories.other'),
  ];
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [categories, setCategories] = useState(defaultCategories);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [data, settings] = await Promise.all([
      db.expenses.reverse().toArray(),
      getSettings(),
    ]);
    setExpenses(data);
    if (settings.expenseCategories) {
      try { setCategories(JSON.parse(settings.expenseCategories)); }
      catch { setCategories(defaultCategories); }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEdit(null);
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), category: t('expenseCategories.other') });
    setShowForm(true);
  }

  function openEdit(record) {
    setEdit(record);
    form.setFieldsValue({
      ...record,
      date: record.date ? dayjs(record.date) : dayjs(),
    });
    setShowForm(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    const data = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      amount: Number(values.amount) || 0,
    };
    if (edit) {
      await db.expenses.update(edit.id, data);
      await logActivity('update', `Updated expense: ${data.title}`);
      message.success(t('msg.updated'));
    } else {
      await db.expenses.add({ ...data, createdAt: new Date().toISOString() });
      await logActivity('create', `Added expense: ${data.title} - ₹${data.amount}`);
      message.success(t('msg.saved'));
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, title) {
    await db.expenses.delete(id);
    await logActivity('delete', `Deleted expense: ${title}`);
    message.success(t('msg.deleted'));
    load();
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    const updated = [...categories, name];
    setCategories(updated);
    await updateSetting('expenseCategories', JSON.stringify(updated));
    setNewCategory('');
    message.success(`${t('msg.saved')}`);
  }

  async function removeCategory(cat) {
    if (defaultCategories.includes(cat)) return;
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    await updateSetting('expenseCategories', JSON.stringify(updated));
    message.success(`${t('msg.deleted')}`);
  }

  const filtered = expenses.filter(e =>
    (!search || e.title?.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || e.category === catFilter)
  );

  const total = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const catTotals = {};
  filtered.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + (Number(e.amount) || 0); });

  const columns = [
    {
      title: t('expense.expenseTitle'), dataIndex: 'title', key: 'title', render: (t) => <Text strong>{t}</Text>,
    },
    {
      title: t('expense.category'), dataIndex: 'category', key: 'category',
      render: (t) => <Tag>{t}</Tag>,
      filters: categories.map(c => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
    },
    { title: t('expense.date'), dataIndex: 'date', key: 'date', sorter: (a, b) => a.date?.localeCompare(b.date) },
    {
      title: t('expense.amount'), dataIndex: 'amount', key: 'amount', align: 'right',
      render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: t('expense.vendorName'), dataIndex: 'vendorName', key: 'vendorName',
      render: (t) => t || '-', responsive: ['md'],
    },
    {
      title: t('expense.billNumber'), dataIndex: 'billNumber', key: 'billNumber',
      render: (t) => t || '-', responsive: ['lg'],
    },
    {
      title: '', key: 'actions', width: 100, align: 'right',
      render: (_, r) => (
        <Space>
          <Popconfirm title={t('msg.confirmDelete')} onConfirm={() => handleDelete(r.id, r.title)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
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
              <div className="gradient-icon" style={{ background: 'linear-gradient(135deg, #fa8c16, #ffa940)' }}>
                <WalletOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('expense.title')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Track your business spending</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<SettingOutlined />} onClick={() => setShowCatManager(true)}>{t('expense.categories')}</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{t('expense.addTitle')}</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}>
            <Text type="secondary">{t('expense.totalExpenses')}</Text>
            <div><Title level={4} style={{ margin: 0, color: '#faad14' }}>₹{total.toFixed(2)}</Title></div>
          </Card>
        </Col>
        {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, amt]) => (
          <Col xs={24} sm={12} md={6} key={cat}>
            <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #6366f1' } }}>
              <Text type="secondary">{cat}</Text>
              <div><Title level={4} style={{ margin: 0 }}>₹{amt.toFixed(2)}</Title></div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Input prefix={<SearchOutlined />} placeholder={t('expense.search')}
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select value={catFilter} onChange={setCatFilter} placeholder={`${t('common.all')} ${t('expense.categories')}`} allowClear style={{ width: '100%' }}>
                {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
              </Select>
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (total) => `${total} ${t('expense.title')}` }}
          scroll={{ x: 600 }} locale={{ emptyText: t('msg.noData') }} />
      </Card>

      <Drawer
        title={edit ? t('expense.editTitle') : t('expense.addTitle')}
        open={showForm}
        onClose={() => setShowForm(false)}
        placement="right"
        width={520}
        extra={
          <Space>
            <Button onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            <Button type="primary" onClick={handleSave}>{edit ? t('common.update') : t('common.save')}</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('expense.expenseTitle')} rules={[{ required: true }]}>
            <Input placeholder={t('expense.expenseTitle')} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label={t('expense.category')}>
                <Select>
                  {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label={t('expense.date')} rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="vendorName" label={t('expense.vendorName')}>
                <Input placeholder={t('expense.vendorName')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="billNumber" label={t('expense.billNumber')}>
                <Input placeholder={t('placeholder.billNo')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label={`${t('expense.amount')} (₹)`} rules={[{ required: true }]}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gstAmount" label={`${t('expense.gstAmount')} (₹)`}>
                <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paymentMethod" label={t('expense.paymentMethod')}>
                <Select allowClear>
                  <Select.Option value="Cash">{t('paymentMethods.cash')}</Select.Option>
                  <Select.Option value="UPI">{t('paymentMethods.upi')}</Select.Option>
                  <Select.Option value="Bank Transfer">{t('paymentMethods.bankTransfer')}</Select.Option>
                  <Select.Option value="Card">{t('paymentMethods.card')}</Select.Option>
                  <Select.Option value="Cheque">{t('paymentMethods.cheque')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isRecurring" label={`${t('expense.recurring')}?`} valuePropName="checked">
                <Select>
                  <Select.Option value={false}>{t('expense.oneTime')}</Select.Option>
                  <Select.Option value={true}>{t('expense.recurring')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label={t('expense.note')}>
            <Input.TextArea rows={2} placeholder={t('placeholder.notes')} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={t('expense.manageCategories')}
        open={showCatManager}
        onClose={() => setShowCatManager(false)}
        placement="right"
        width={520}
      >
        <div style={{ maxHeight: 300, overflow: 'auto', marginBottom: 16 }}>
          {categories.map(cat => (
            <Row key={cat} justify="space-between" align="middle"
              style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: 'var(--bg-body)' }}>
              <Col><Text>{cat}</Text></Col>
              <Col>
                {!defaultCategories.includes(cat) && (
                  <Popconfirm title={t('msg.confirmDelete')} onConfirm={() => removeCategory(cat)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Col>
            </Row>
          ))}
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input value={newCategory} onChange={e => setNewCategory(e.target.value)}
            placeholder={t('expense.newCategory')} onPressEnter={addCategory} />
          <Button type="primary" icon={<PlusOutlined />} onClick={addCategory} />
        </Space.Compact>
      </Drawer>
    </div>
  );
}
