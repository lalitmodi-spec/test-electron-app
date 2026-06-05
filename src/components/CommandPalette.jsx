import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Input, List, Typography, Space, Tag } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, UserOutlined, ShoppingOutlined,
  WalletOutlined, BarChartOutlined, SettingOutlined, AuditOutlined,
  DollarOutlined, ShoppingCartOutlined, TeamOutlined, HistoryOutlined,
  FormOutlined, InfoCircleOutlined, SearchOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import db from '../db';
import { useLanguage } from '../i18n/LanguageContext';

const { Text } = Typography;

const NAV_ITEMS = [
  { key: '/', icon: DashboardOutlined, label: 'nav.dashboard' },
  { key: '/invoices', icon: FileTextOutlined, label: 'nav.allInvoices' },
  { key: '/invoice/new', icon: FileTextOutlined, label: 'nav.newInvoice' },
  { key: '/payments', icon: DollarOutlined, label: 'nav.payments' },
  { key: '/credit-notes', icon: AuditOutlined, label: 'nav.creditNotes' },
  { key: '/customers', icon: UserOutlined, label: 'nav.customers' },
  { key: '/vendors', icon: TeamOutlined, label: 'nav.vendors' },
  { key: '/purchases', icon: ShoppingCartOutlined, label: 'nav.purchases' },
  { key: '/products', icon: ShoppingOutlined, label: 'nav.products' },
  { key: '/expenses', icon: WalletOutlined, label: 'nav.expenses' },
  { key: '/reports', icon: BarChartOutlined, label: 'nav.reports' },
  { key: '/activity', icon: HistoryOutlined, label: 'nav.activityLog' },
  { key: '/quotations', icon: FormOutlined, label: 'nav.allQuotations' },
  { key: '/quotation/new', icon: FormOutlined, label: 'nav.newQuotation' },
  { key: '/settings', icon: SettingOutlined, label: 'nav.settings' },
  { key: '/about', icon: InfoCircleOutlined, label: 'nav.about' },
  { key: '/support', icon: QuestionCircleOutlined, label: 'nav.support' },
];

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      Promise.all([
        db.invoices.reverse().limit(10).toArray(),
        db.customers.limit(10).toArray(),
      ]).then(([inv, cust]) => {
        setInvoices(inv);
        setCustomers(cust);
      });
      setTimeout(() => document.getElementById('cmd-palette-input')?.focus(), 50);
    }
  }, [open]);

  const filteredNav = useMemo(() => {
    if (!query) return NAV_ITEMS;
    const q = query.toLowerCase();
    return NAV_ITEMS.filter(item => t(item.label).toLowerCase().includes(q) || item.key.includes(q));
  }, [query, t]);

  const filteredInvoices = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return invoices.filter(i => i.invoiceNo?.toLowerCase().includes(q) || i.customerName?.toLowerCase().includes(q));
  }, [query, invoices]);

  const filteredCustomers = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return customers.filter(c => c.name?.toLowerCase().includes(q) || c.companyName?.toLowerCase().includes(q));
  }, [query, customers]);

  function handleSelect(path) {
    navigate(path);
    onClose();
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      closable={false}
      style={{ top: 80 }}
      destroyOnClose
    >
      <Input
        id="cmd-palette-input"
        size="large"
        prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
        placeholder="Search pages, invoices, customers..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ borderRadius: 8, marginBottom: 12, border: 'none', background: 'var(--bg-body)' }}
      />
      <div style={{ maxHeight: 400, overflow: 'auto' }}>
        {filteredNav.length > 0 && (
          <>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Pages</Text>
            <List
              dataSource={filteredNav}
              renderItem={item => {
                const Icon = item.icon;
                return (
                  <List.Item
                    onClick={() => handleSelect(item.key)}
                    style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 8, transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Space>
                      <Icon style={{ color: 'var(--accent)', fontSize: 15 }} />
                      <Text>{t(item.label)}</Text>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 11 }}>{item.key}</Text>
                  </List.Item>
                );
              }}
              size="small"
              split={false}
            />
          </>
        )}
        {filteredInvoices.length > 0 && (
          <>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginTop: 8, marginBottom: 4 }}>Invoices</Text>
            <List
              dataSource={filteredInvoices}
              renderItem={item => (
                <List.Item
                  onClick={() => handleSelect(`/invoice/edit/${item.id}`)}
                  style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 8, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Space>
                    <FileTextOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
                    <Text>{item.invoiceNo}</Text>
                    <Tag color={item.status === 'paid' ? 'success' : item.status === 'partial' ? 'warning' : 'error'} style={{ fontSize: 10 }}>{item.status}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.customerName} - ₹{Number(item.grandTotal).toFixed(0)}</Text>
                </List.Item>
              )}
              size="small"
              split={false}
            />
          </>
        )}
        {filteredCustomers.length > 0 && (
          <>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginTop: 8, marginBottom: 4 }}>Customers</Text>
            <List
              dataSource={filteredCustomers}
              renderItem={item => (
                <List.Item
                  onClick={() => handleSelect(`/customers`)}
                  style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 8, transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Space>
                    <UserOutlined style={{ color: '#52c41a', fontSize: 15 }} />
                    <Text>{item.name}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.companyName || item.email || ''}</Text>
                </List.Item>
              )}
              size="small"
              split={false}
            />
          </>
        )}
        {!query && filteredNav.length > 0 && (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 11 }}>
            Type to search invoices and customers
          </Text>
        )}
      </div>
    </Modal>
  );
}
