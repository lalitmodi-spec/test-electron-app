import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Input, Drawer, theme, ConfigProvider, Badge } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, PlusOutlined, UserOutlined,
  ShoppingOutlined, WalletOutlined, BarChartOutlined, SettingOutlined,
  MenuOutlined, SunOutlined, MoonOutlined, SearchOutlined, AuditOutlined,
  DollarOutlined, ShoppingCartOutlined, TeamOutlined, HistoryOutlined,
  FormOutlined, InfoCircleOutlined, QuestionCircleOutlined,
  CloseOutlined, MinusOutlined, ExpandOutlined, CompressOutlined
} from '@ant-design/icons';
import { getSettings } from '../db';
import { useLanguage } from '../i18n/LanguageContext';
import CommandPalette from './CommandPalette';

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
  const [overdueCount, setOverdueCount] = useState(0);
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
      if (s.theme) setThemeMode(s.theme);
      const color = s.themeColor || '#6366f1';
      applyAccent(color);
    });
    return () => { delete window.applyAccent; };
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

  useEffect(() => {
    let cancelled = false;
    async function checkOverdue() {
      const invoices = await db.invoices.toArray();
      if (cancelled) return;
      const today = new Date().toISOString().split('T')[0];
      const overdue = invoices.filter(i => i.status !== 'paid' && i.dueDate && i.dueDate < today);
      setOverdueCount(overdue.length);
      if (overdue.length > 0) {
        document.title = `(${overdue.length}) Billing Pro`;
      } else {
        document.title = 'Billing Pro';
      }
    }
    checkOverdue();
    const interval = setInterval(checkOverdue, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

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
            padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12,
            height: 56, borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 10,
            WebkitAppRegion: 'drag', justifyContent: 'space-between',
          }}>
            <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)}
                style={{ color: 'var(--text-secondary)' }} />
            )}
            {isMobile === false && (
              <Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed(!collapsed)}
                style={{ color: 'var(--text-secondary)' }} />
            )}
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              placeholder={t('header.searchPlaceholder')}
              style={{ maxWidth: 320, background: 'var(--bg-body)', border: 'none', borderRadius: 8 }}
              suffix={<span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5, background: 'var(--border-color)', padding: '0 6px', borderRadius: 4, lineHeight: '18px' }}>Ctrl+K</span>}
              onClick={() => setCmdPaletteOpen(true)}
              onPressEnter={(e) => {
                const q = e.target.value.trim().toLowerCase();
                if (q) navigate(`/invoices?search=${encodeURIComponent(q)}`);
              }}
            />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
              <Button
                type="text"
                onClick={() => setLang(isHindi ? 'en' : 'hi')}
                style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}
              >
                {isHindi ? 'EN' : 'हिं'}
              </Button>
              <Button
                type="text"
                icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                style={{ color: 'var(--text-secondary)' }}
              />
              <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 4px' }} />
              <Button type="text" icon={<MinusOutlined />} onClick={() => window.electronAPI?.minimize()}
                style={{ color: 'var(--text-secondary)', width: 32 }} />
              <Button type="text" icon={maximized ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={() => window.electronAPI?.maximize().then(() =>
                  window.electronAPI?.isMaximized().then(setMaximized)
                )}
                style={{ color: 'var(--text-secondary)', width: 32 }} />
              <Button type="text" icon={<CloseOutlined />} onClick={() => window.electronAPI?.close()}
                style={{ color: 'var(--text-secondary)', width: 32 }}
                onMouseEnter={e => e.currentTarget.style.background = '#ff4d4f'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
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
            styles={{ body: { padding: 0, background: '#060d1a' } }}
          >
            {sidebarContent}
          </Drawer>
        )}
      </Layout>
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
    </ConfigProvider>
  );
}
