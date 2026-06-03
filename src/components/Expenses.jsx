import { useEffect, useState } from 'react';
import {
  Table, Card, Button, Input, Select, Space, Modal, Form, Typography,
  Row, Col, Popconfirm, message, Tag, DatePicker, InputNumber
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  WalletOutlined, SettingOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import db, { getSettings, updateSetting, logActivity } from '../db';

const { Title, Text } = Typography;
const defaultCategories = ['Office Supplies', 'Utilities', 'Travel', 'Food', 'Rent', 'Maintenance', 'Salary', 'Marketing', 'Software', 'Other'];

export default function Expenses() {
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
    form.setFieldsValue({ date: dayjs(), category: 'Other' });
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
      message.success('Expense updated');
    } else {
      await db.expenses.add({ ...data, createdAt: new Date().toISOString() });
      await logActivity('create', `Added expense: ${data.title} - ₹${data.amount}`);
      message.success('Expense added');
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(id, title) {
    await db.expenses.delete(id);
    await logActivity('delete', `Deleted expense: ${title}`);
    message.success(`Deleted: ${title}`);
    load();
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    const updated = [...categories, name];
    setCategories(updated);
    await updateSetting('expenseCategories', JSON.stringify(updated));
    setNewCategory('');
    message.success(`Category "${name}" added`);
  }

  async function removeCategory(cat) {
    if (defaultCategories.includes(cat)) return;
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    await updateSetting('expenseCategories', JSON.stringify(updated));
    message.success(`Category "${cat}" removed`);
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
      title: 'Title', dataIndex: 'title', key: 'title', render: (t) => <Text strong>{t}</Text>,
    },
    {
      title: 'Category', dataIndex: 'category', key: 'category',
      render: (t) => <Tag>{t}</Tag>,
      filters: categories.map(c => ({ text: c, value: c })),
      onFilter: (value, record) => record.category === value,
    },
    { title: 'Date', dataIndex: 'date', key: 'date', sorter: (a, b) => a.date?.localeCompare(b.date) },
    {
      title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right',
      render: (v) => <Text strong>₹{Number(v).toFixed(2)}</Text>,
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: '', key: 'actions', width: 100, align: 'right',
      render: (_, r) => (
        <Space>
          <Popconfirm title={`Delete ${r.title}?`} onConfirm={() => handleDelete(r.id, r.title)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Expenses</Title>
          <Text type="secondary">Track your business spending</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setShowCatManager(true)}>Categories</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Expense</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" styles={{ body: { padding: '16px 20px', borderLeft: '3px solid #faad14' } }}>
            <Text type="secondary">Total Expenses</Text>
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
              <Input prefix={<SearchOutlined />} placeholder="Search expenses..."
                value={search} onChange={e => setSearch(e.target.value)} allowClear />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select value={catFilter} onChange={setCatFilter} placeholder="All Categories" allowClear style={{ width: '100%' }}>
                {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
              </Select>
            </Col>
          </Row>
        </div>

        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showTotal: (t) => `${t} expenses` }}
          scroll={{ x: 600 }} locale={{ emptyText: 'No expenses yet' }} />
      </Card>

      <Modal
        title={edit ? 'Edit Expense' : 'Add Expense'}
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={handleSave}
        okText={edit ? 'Update' : 'Save'}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Expense Title" rules={[{ required: true }]}>
            <Input placeholder="Expense title" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Category">
                <Select>
                  {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} prefix="₹" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input.TextArea rows={2} placeholder="Optional note" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Manage Categories"
        open={showCatManager}
        onCancel={() => setShowCatManager(false)}
        footer={null}
        width={400}
      >
        <div style={{ maxHeight: 300, overflow: 'auto', marginBottom: 16 }}>
          {categories.map(cat => (
            <Row key={cat} justify="space-between" align="middle"
              style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: 'var(--bg-body)' }}>
              <Col><Text>{cat}</Text></Col>
              <Col>
                {!defaultCategories.includes(cat) && (
                  <Popconfirm title={`Remove "${cat}"?`} onConfirm={() => removeCategory(cat)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Col>
            </Row>
          ))}
        </div>
        <Space.Compact style={{ width: '100%' }}>
          <Input value={newCategory} onChange={e => setNewCategory(e.target.value)}
            placeholder="New category name" onPressEnter={addCategory} />
          <Button type="primary" icon={<PlusOutlined />} onClick={addCategory} />
        </Space.Compact>
      </Modal>
    </div>
  );
}
