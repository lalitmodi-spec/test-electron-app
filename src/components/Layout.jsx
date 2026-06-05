import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Input, Drawer, theme, ConfigProvider, Badge, Typography, Space, Divider, Tag, Tooltip, List, notification } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, PlusOutlined, UserOutlined,
  ShoppingOutlined, WalletOutlined, BarChartOutlined, SettingOutlined,
  MenuOutlined, SunOutlined, MoonOutlined, SearchOutlined, AuditOutlined,
  DollarOutlined, ShoppingCartOutlined, TeamOutlined, HistoryOutlined,
  FormOutlined, InfoCircleOutlined, QuestionCircleOutlined,
  CloseOutlined, MinusOutlined, ExpandOutlined, CompressOutlined,
  BellOutlined, WarningOutlined, ClockCircleOutlined, StockOutlined,
  DollarCircleOutlined, ShoppingCartOutlined as CartOutlined
} from '@ant-design/icons';
import db, { getSettings } from '../db';
import { useLanguage } from '../i18n/LanguageContext';
import CommandPalette from './CommandPalette';

const { Text } = Typography;

const { Sider, Header, Content } = Layout;

function NavItems() {
  const { t } = useLanguage();
  return [
    { key: '/', icon: DashboardOutlined, label: t('nav.dashboard') },
    {
      key: 'invoices_group', icon: FileTextOutlined, label: t('nav.invoices'),
      children: [
        { key: '/invoices', label: t('nav.allInvoices') },
        { key: '/invoice/new', label: t('nav.newInvoice') },
      ],
    },
    { key: '/payments', icon: DollarOutlined, label: t('nav.payments') },
    { key: '/credit-notes', icon: AuditOutlined, label: t('nav.creditNotes') },
    { key: '/customers', icon: UserOutlined, label: t('nav.customers') },
    { key: '/vendors', icon: TeamOutlined, label: t('nav.vendors') },
    { key: '/purchases', icon: ShoppingCartOutlined, label: t('nav.purchases') },
    { key: '/products', icon: ShoppingOutlined, label: t('nav.products') },
    { key: '/expenses', icon: WalletOutlined, label: t('nav.expenses') },
    { key: '/reports', icon: BarChartOutlined, label: t('nav.reports') },
    { key: '/activity', icon: HistoryOutlined, label: t('nav.activityLog') },
    {
      key: 'quotations_group', icon: FormOutlined, label: t('nav.quotations'),
      children: [
        { key: '/quotations', label: t('nav.allQuotations') },
        { key: '/quotation/new', label: t('nav.newQuotation') },
      ],
    },
    { key: '/settings', icon: SettingOutlined, label: t('nav.settings') },
    { key: '/about', icon: InfoCircleOutlined, label: t('nav.about') },
    { key: '/support', icon: QuestionCircleOutlined, label: t('nav.support') },
  ];
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [themeMode, setThemeMode] = useState('dark');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const cmdPaletteRef = useRef(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState({ overdueInvoices: [], dueSoonInvoices: [], lowStock: [], overduePurchases: [] });
  const prevNotifRef = useRef({ lowStock: [] });
  const { t, lang, setLang, isHindi } = useLanguage();

  function applyAccent(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    const light = (c) => Math.min(255, c + 60).toString(16).padStart(2, '0');
    document.documentElement.style.setProperty('--accent-light', `#${light(r)}${light(g)}${light(b)}`);
  }

  useEffect(() => { cmdPaletteRef.current = cmdPaletteOpen; }, [cmdPaletteOpen]);

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setMaximized);
    }
  }, []);

  useEffect(() => {
    window.applyAccent = applyAccent;
    getSettings().then(s => {
      let mode = s.theme;
      if (s.theme === 'system' || !s.theme) {
        mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      setThemeMode(mode);
      const color = s.themeColor || '#6366f1';
      applyAccent(color);
    });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      getSettings().then(s => {
        if (s.theme === 'system' || !s.theme) {
          setThemeMode(e.matches ? 'dark' : 'light');
        }
      });
    };
    mq.addEventListener('change', handler);
    return () => { delete window.applyAccent; mq.removeEventListener('change', handler); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
  }, [themeMode]);

  useEffect(() => {
    function handleKeydown(e) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n' && !e.shiftKey) {
          e.preventDefault();
          navigate('/invoice/new');
        }
        if (e.key === 'k') {
          e.preventDefault();
          if (!cmdPaletteRef.current) setCmdPaletteOpen(true);
        }
      }
      if (e.key === 'Escape') {
        setCmdPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate]);

  function daysFromNow(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.floor((d - now) / (1000 * 60 * 60 * 24));
  }

  const loadNotifications = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const allInvoices = await db.invoices.toArray();
    const allProducts = await db.products.toArray();
    const allPurchases = await db.purchases.toArray();

    const overdueInvoices = allInvoices
      .filter(i => i.status !== 'paid' && i.dueDate && i.dueDate < today)
      .map(i => ({ ...i, daysOverdue: Math.abs(daysFromNow(i.dueDate)) }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const dueSoonInvoices = allInvoices
      .filter(i => i.status !== 'paid' && i.dueDate && i.dueDate >= today && daysFromNow(i.dueDate) <= 7)
      .map(i => ({ ...i, daysUntilDue: daysFromNow(i.dueDate) }))
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const lowStock = allProducts
      .filter(p => (Number(p.stock) || 0) <= (Number(p.minStock) || 0) && (Number(p.minStock) || 0) > 0)
      .sort((a, b) => (Number(a.stock) / Number(a.minStock)) - (Number(b.stock) / Number(b.minStock)));

    const overduePurchases = allPurchases
      .filter(p => p.paymentStatus !== 'paid' && p.dueDate && p.dueDate < today)
      .map(p => ({ ...p, daysOverdue: Math.abs(daysFromNow(p.dueDate)) }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    setNotifications({ overdueInvoices, dueSoonInvoices, lowStock, overduePurchases });

    if (lowStock.length > 0 && lowStock.length !== prevNotifRef.current.lowStock.length) {
      lowStock.slice(0, 3).forEach(p => {
        notification.warning({
          message: `${t('common.lowStock')}: ${p.name}`,
          description: `${'Stock'}: ${p.stock} / ${'Min'}: ${p.minStock}`,
          duration: 5,
          placement: 'bottomRight',
        });
      });
    }
    prevNotifRef.current = { lowStock };

    const totalNotif = overdueInvoices.length + lowStock.length + overduePurchases.length;
    if (totalNotif > 0) {
      document.title = `(${totalNotif}) Billing Pro`;
    } else {
      document.title = 'Billing Pro';
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const notifCount = notifications.overdueInvoices.length + notifications.lowStock.length + notifications.overduePurchases.length;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const themeConfig = {
    algorithm: themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#6366f1',
      borderRadius: 10,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
      ...(themeMode === 'dark' ? {
        colorBgContainer: '#131c31',
        colorBgLayout: '#0b1120',
        colorBgElevated: '#1a2640',
        colorBgSpotlight: '#1a2640',
        colorBorder: '#1e293b',
        colorBorderSecondary: '#1e293b',
        colorText: '#e2e8f0',
        colorTextSecondary: '#94a3b8',
        colorBgTextHover: 'rgba(255,255,255,0.04)',
      } : {}),
    },
    components: {
      Menu: {
        ...(themeMode === 'dark' ? {
          darkItemBg: 'transparent',
          darkItemColor: 'rgba(255,255,255,0.45)',
          darkItemHoverBg: 'rgba(255,255,255,0.06)',
          darkItemHoverColor: 'rgba(255,255,255,0.85)',
          darkItemSelectedBg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          darkItemSelectedColor: '#ffffff',
          itemBorderRadius: 10,
        } : {}),
      },
      Table: {
        ...(themeMode === 'dark' ? {
          headerBg: '#131c31',
          headerColor: '#94a3b8',
          headerBorderColor: '#1e293b',
          borderColor: '#1e293b',
          rowHoverBg: 'rgba(255,255,255,0.04)',
        } : {}),
      },
      Card: {
        ...(themeMode === 'dark' ? {
          colorBorderSecondary: '#1e293b',
        } : {}),
      },
      Modal: {
        ...(themeMode === 'dark' ? {
          contentBg: '#141e33',
          headerBg: '#141e33',
        } : {}),
      },
    },
  };

  const sidebarContent = (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#060d1a',
    }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--accent-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <AuditOutlined style={{ color: 'white', fontSize: 16 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'white', lineHeight: 1.2 }}>{t('header.billingPro')}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{t('header.subtitle')}</div>
        </div>
      </div>
      <Menu
        mode="inline"
        theme="dark"
        selectedKeys={[location.pathname]}
        onClick={({ key }) => {
          navigate(key);
          if (isMobile) setDrawerOpen(false);
        }}
        items={NavItems().map(item => ({
          ...item,
          icon: item.icon ? <item.icon style={{ fontSize: 15 }} /> : undefined,
          children: item.children?.map(child => ({
            ...child,
          })),
        }))}
        style={{
          flex: 1, borderInlineEnd: 'none', padding: '4px 8px',
          background: 'transparent',
        }}
      />
      <div style={{
        padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 11, color: 'rgba(255,255,255,0.25)'
      }}>
        {t('header.version')}
      </div>
    </div>
  );

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout style={{ height: '100vh' }}>
        {!isMobile && (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={240}
            collapsedWidth={0}
            trigger={null}
            style={{ overflow: 'auto', height: '100vh', background: '#060d1a' }}
          >
            {sidebarContent}
          </Sider>
        )}

        <Layout>
          <Header style={{
            padding: '0 12px 0 4px', display: 'flex', alignItems: 'center', gap: 6,
            height: 52, borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 10,
            WebkitAppRegion: 'drag', justifyContent: 'space-between',
          }}>
            <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center', gap: 4 }}>
              {isMobile && (
                <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)}
                  style={{ color: 'var(--text-secondary)', width: 36 }} />
              )}
              {isMobile === false && (
                <Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed(!collapsed)}
                  style={{ color: 'var(--text-secondary)', width: 36 }} />
              )}
              <Input
                prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 14 }} />}
                placeholder={t('header.searchPlaceholder')}
                style={{
                  maxWidth: 300, height: 34, borderRadius: 8, fontSize: 13,
                  background: 'var(--bg-body)', border: '1px solid transparent',
                }}
                suffix={
                  <span style={{
                    fontSize: 10, color: '#94a3b8', opacity: 0.6,
                    background: 'var(--border-color)', padding: '0 6px', borderRadius: 4,
                    lineHeight: '18px', fontWeight: 500, letterSpacing: '0.3px'
                  }}>⌘K</span>
                }
                onClick={() => setCmdPaletteOpen(true)}
                onPressEnter={(e) => {
                  const q = e.target.value.trim().toLowerCase();
                  if (q) navigate(`/invoices?search=${encodeURIComponent(q)}`);
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, WebkitAppRegion: 'no-drag' }}>
              <Tooltip title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}>
                <div onClick={() => setLang(isHindi ? 'en' : 'hi')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    background: isHindi ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: isHindi ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: 12, letterSpacing: '0.3px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!isHindi) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { if (!isHindi) e.currentTarget.style.background = 'transparent'; }}
                >
                  {isHindi ? 'EN' : 'हिं'}
                </div>
              </Tooltip>
              <Tooltip title={themeMode === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}>
                <Button type="text" icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                  onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                  style={{ color: 'var(--text-secondary)', width: 34 }} />
              </Tooltip>
              <Tooltip title={t('nav.notifications')}>
                <Badge count={notifCount} size="small" offset={[-2, 2]}>
                  <Button type="text" icon={<BellOutlined />} onClick={() => setNotifDrawerOpen(true)}
                    style={{ color: 'var(--text-secondary)', width: 34 }} />
                </Badge>
              </Tooltip>
              <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 4px' }} />
              <div style={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Minimize">
                  <Button type="text" icon={<MinusOutlined />} onClick={() => window.electronAPI?.minimize()}
                    style={{ color: 'var(--text-secondary)', width: 34, height: 34, borderRadius: 8 }} />
                </Tooltip>
                <Tooltip title={maximized ? 'Restore' : 'Maximize'}>
                  <Button type="text" icon={maximized ? <CompressOutlined /> : <ExpandOutlined />}
                    onClick={() => window.electronAPI?.maximize().then(() =>
                      window.electronAPI?.isMaximized().then(setMaximized)
                    )}
                    style={{ color: 'var(--text-secondary)', width: 34, height: 34, borderRadius: 8 }} />
                </Tooltip>
                <Tooltip title="Close">
                  <Button type="text" icon={<CloseOutlined />} onClick={() => window.electronAPI?.close()}
                    style={{ color: 'var(--text-secondary)', width: 34, height: 34, borderRadius: 8 }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }} />
                </Tooltip>
              </div>
            </div>
          </Header>

          <Content style={{
            overflow: 'auto', padding: 24,
            background: 'var(--bg-body)', minHeight: 'calc(100vh - 56px)'
          }}>
            <Outlet />
          </Content>
        </Layout>

        {isMobile && (
          <Drawer
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            width={260}
            closable
            maskClosable
            styles={{ body: { padding: 0, background: '#060d1a' } }}
          >
            {sidebarContent}
          </Drawer>
        )}
      </Layout>
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />

      <Drawer
        title={
          <Space>
            <BellOutlined style={{ color: 'var(--accent)' }} />
            <Text strong style={{ fontSize: 16 }}>{t('nav.notifications')}</Text>
            {notifCount > 0 && <Tag color="error" style={{ fontSize: 11, borderRadius: 6 }}>{notifCount}</Tag>}
          </Space>
        }
        open={notifDrawerOpen}
        onClose={() => { setNotifDrawerOpen(false); }}
        placement="right"
        width={420}
        closable
        maskClosable
        mask
        destroyOnClose
        getContainer={document.body}
        rootStyle={{ WebkitAppRegion: 'no-drag' }}
        zIndex={1050}
      >
        {notifCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <BellOutlined style={{ fontSize: 48, opacity: 0.3, marginBottom: 16, display: 'block' }} />
            <Text type="secondary">{t('nav.noNotifications')}</Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {notifications.overdueInvoices.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(239,68,68,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <WarningOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                  </div>
                  <Text strong style={{ color: '#ef4444', fontSize: 14 }}>
                    {t('nav.overdueInvoices')}
                  </Text>
                  <Tag color="error" style={{ fontSize: 10, marginLeft: 'auto' }}>
                    {notifications.overdueInvoices.length}
                  </Tag>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notifications.overdueInvoices.slice(0, 5).map((inv, i) => (
                    <div key={i} onClick={() => { navigate('/invoices'); setNotifDrawerOpen(false); }}
                      style={{
                        padding: '10px 14px', background: '#1a2332', borderRadius: 10,
                        border: '1px solid #2a3444', cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13 }}>{inv.invoiceNo}</Text>
                        <Tag color="error" style={{ fontSize: 10, borderRadius: 4 }}>
                          {inv.daysOverdue}d {t('nav.overdue')}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <Text type="secondary">{inv.customerName}</Text>
                        <Text strong style={{ color: '#ef4444' }}>₹{Number(inv.grandTotal).toFixed(2)}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('invoice.dueDate')}: {inv.dueDate}</Text>
                    </div>
                  ))}
                  {notifications.overdueInvoices.length > 5 && (
                    <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                      +{notifications.overdueInvoices.length - 5} {t('nav.moreItems')}
                    </Text>
                  )}
                </div>
              </div>
            )}

            {notifications.dueSoonInvoices.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(245,158,11,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
                  </div>
                  <Text strong style={{ color: '#f59e0b', fontSize: 14 }}>
                    {t('nav.dueSoon')}
                  </Text>
                  <Tag color="warning" style={{ fontSize: 10, marginLeft: 'auto' }}>
                    {notifications.dueSoonInvoices.length}
                  </Tag>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notifications.dueSoonInvoices.slice(0, 5).map((inv, i) => (
                    <div key={i} onClick={() => { navigate('/invoices'); setNotifDrawerOpen(false); }}
                      style={{
                        padding: '10px 14px', background: '#1a2332', borderRadius: 10,
                        border: '1px solid #2a3444', cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13 }}>{inv.invoiceNo}</Text>
                        <Tag color="warning" style={{ fontSize: 10, borderRadius: 4 }}>
                          {inv.daysUntilDue === 0 ? t('nav.today') : `${inv.daysUntilDue}d`}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <Text type="secondary">{inv.customerName}</Text>
                        <Text strong>₹{Number(inv.grandTotal).toFixed(2)}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>{t('invoice.dueDate')}: {inv.dueDate}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notifications.lowStock.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(245,158,11,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <StockOutlined style={{ color: '#f59e0b', fontSize: 14 }} />
                  </div>
                  <Text strong style={{ color: '#f59e0b', fontSize: 14 }}>
                    {t('nav.lowStock')}
                  </Text>
                  <Tag color="warning" style={{ fontSize: 10, marginLeft: 'auto' }}>
                    {notifications.lowStock.length}
                  </Tag>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notifications.lowStock.slice(0, 5).map((prod, i) => (
                    <div key={i} onClick={() => { navigate('/products'); setNotifDrawerOpen(false); }}
                      style={{
                        padding: '10px 14px', background: '#1a2332', borderRadius: 10,
                        border: '1px solid #2a3444', cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13 }}>{prod.name}</Text>
                        {Number(prod.stock) === 0
                          ? <Tag color="error" style={{ fontSize: 10, borderRadius: 4 }}>{t('nav.outOfStock')}</Tag>
                          : <Tag color="warning" style={{ fontSize: 10, borderRadius: 4 }}>{t('nav.lowStock')}</Tag>
                        }
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('nav.stock')}: {prod.stock} / {prod.minStock} {prod.unit || 'pcs'}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {notifications.overduePurchases.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(239,68,68,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <DollarCircleOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                  </div>
                  <Text strong style={{ color: '#ef4444', fontSize: 14 }}>
                    {t('nav.overduePurchases')}
                  </Text>
                  <Tag color="error" style={{ fontSize: 10, marginLeft: 'auto' }}>
                    {notifications.overduePurchases.length}
                  </Tag>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notifications.overduePurchases.slice(0, 5).map((p, i) => (
                    <div key={i} onClick={() => { navigate('/purchases'); setNotifDrawerOpen(false); }}
                      style={{
                        padding: '10px 14px', background: '#1a2332', borderRadius: 10,
                        border: '1px solid #2a3444', cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13 }}>{p.productName}</Text>
                        <Tag color="error" style={{ fontSize: 10, borderRadius: 4 }}>
                          {p.daysOverdue}d {t('nav.overdue')}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <Text type="secondary">{p.supplier}</Text>
                        <Text strong style={{ color: '#ef4444' }}>₹{Number(p.totalCost).toFixed(2)}</Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {t('invoice.dueDate')}: {p.dueDate} | {t('nav.status')}: {p.paymentStatus}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </Drawer>
    </ConfigProvider>
  );
}
