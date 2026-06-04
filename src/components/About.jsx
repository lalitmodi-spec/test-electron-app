import { Row, Col, Card, Typography, Space, Tag, Divider } from 'antd';
import {
  FileTextOutlined, SafetyOutlined, CodeOutlined, TeamOutlined,
  GlobalOutlined, MailOutlined, EnvironmentOutlined, PhoneOutlined
} from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text, Paragraph } = Typography;

export default function About() {
  const { t } = useLanguage();

  const features = [
    { icon: <FileTextOutlined />, key: t('about.featureGst'), desc: t('about.featureGstDesc') },
    { icon: <SafetyOutlined />, key: t('about.featureOffline'), desc: t('about.featureOfflineDesc') },
    { icon: <TeamOutlined />, key: t('about.featureCustVendor'), desc: t('about.featureCustVendorDesc') },
    { icon: <CodeOutlined />, key: t('about.featureStock'), desc: t('about.featureStockDesc') },
    { icon: <GlobalOutlined />, key: t('about.featureBilingual'), desc: t('about.featureBilingualDesc') },
    { icon: <FileTextOutlined />, key: t('about.featurePdf'), desc: t('about.featurePdfDesc') },
  ];

  return (
    <div>
      <Row gutter={[20, 20]}>
        <Col xs={24} md={16}>
          <Card styles={{ body: { padding: '28px 32px' } }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'var(--accent-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileTextOutlined style={{ fontSize: 26, color: 'white' }} />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0 }}>BillingPro</Title>
                  <Text type="secondary">{t('about.subtitle')}</Text>
                </div>
              </Space>

              <Paragraph style={{ fontSize: 14, margin: 0 }}>
                {t('about.description')}
              </Paragraph>
            </Space>

            <Divider style={{ margin: '20px 0' }} />

            <Title level={5} style={{ margin: '0 0 12px' }}>{t('about.keyFeatures')}</Title>
            <Row gutter={[12, 12]}>
              {features.map((f, i) => (
                <Col xs={24} sm={12} key={i}>
                  <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
                    <Space>
                      <span style={{ color: 'var(--accent)', fontSize: 18 }}>{f.icon}</span>
                      <div>
                        <Text strong style={{ fontSize: 13 }}>{f.key}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{f.desc}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card title={t('about.company')} size="small" styles={{ body: { padding: '16px 20px' } }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{t('about.developer')}</Text><br /><Text strong>Lalit Kumar</Text></div>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{t('about.technology')}</Text><br />
                  <Space wrap size={4}>
                    <Tag color="blue">React 19</Tag>
                    <Tag color="purple">Electron</Tag>
                    <Tag color="cyan">Vite</Tag>
                    <Tag color="orange">Ant Design</Tag>
                    <Tag color="green">Dexie.js</Tag>
                    <Tag color="red">@react-pdf</Tag>
                    <Tag color="geekblue">Recharts</Tag>
                  </Space>
                </div>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{t('about.version')}</Text><br /><Text strong>3.0.0</Text></div>
                <div><Text type="secondary" style={{ fontSize: 11 }}>{t('about.dataStorage')}</Text><br /><Text strong>IndexedDB (local)</Text></div>
              </Space>
            </Card>

            <Card title={t('about.contact')} size="small" styles={{ body: { padding: '16px 20px' } }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div><MailOutlined style={{ color: 'var(--accent)', marginRight: 8 }} /><Text>lalit@example.com</Text></div>
                <div><PhoneOutlined style={{ color: 'var(--accent)', marginRight: 8 }} /><Text>+91-9876543210</Text></div>
                <div><EnvironmentOutlined style={{ color: 'var(--accent)', marginRight: 8 }} /><Text>Mumbai, India</Text></div>
              </Space>
            </Card>

            <Card title={t('about.license')} size="small" styles={{ body: { padding: '16px 20px' } }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('about.licenseText')}
              </Text>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
