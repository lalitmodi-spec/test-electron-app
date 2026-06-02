import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Input, Drawer, theme, ConfigProvider } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, PlusOutlined, UserOutlined,
  ShoppingOutlined, WalletOutlined, BarChartOutlined, SettingOutlined,
  MenuOutlined, SunOutlined, MoonOutlined, SearchOutlined, AuditOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { getSettings } from '../db';

const { Sider, Header, Content } = Layout;

const navItems = [
  { key: '/', icon: DashboardOutlined, label: 'Dashboard' },
  { key: '/invoices', icon: FileTextOutlined, label: 'Invoices' },
  { key: '/invoice/new', icon: PlusOutlined, label: 'New Invoice' },
  { key: '/payments', icon: DollarOutlined, label: 'Payments' },
  { key: '/customers', icon: UserOutlined, label: 'Customers' },
  { key: '/products', icon: ShoppingOutlined, label: 'Products' },
  { key: '/expenses', icon: WalletOutlined, label: 'Expenses' },
  { key: '/reports', icon: BarChartOutlined, label: 'Reports' },
  { key: '/settings', icon: SettingOutlined, label: 'Settings' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [themeMode, setThemeMode] = useState('dark');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    getSettings().then(s => { if (s.theme) setThemeMode(s.theme); });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
  }, [themeMode]);

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
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <AuditOutlined style={{ color: 'white', fontSize: 16 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'white', lineHeight: 1.2 }}>BillingPro</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>GST Invoice Manager</div>
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
        items={navItems.map(item => ({
          key: item.key,
          icon: <item.icon style={{ fontSize: 15 }} />,
          label: item.label,
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
        BillingPro v3.0
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
            background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 10
          }}>
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
              placeholder="Search invoices, customers..."
              style={{ maxWidth: 320, background: 'var(--bg-body)', border: 'none', borderRadius: 8 }}
              onPressEnter={(e) => {
                const q = e.target.value.trim().toLowerCase();
                if (q) navigate(`/invoices?search=${encodeURIComponent(q)}`);
              }}
            />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <Button
                type="text"
                icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                style={{ color: 'var(--text-secondary)' }}
              />
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
    </ConfigProvider>
  );
}
