import { useState } from 'react';
import { Card, Typography, Row, Col, Space, Button, message, Input, Divider, Tag } from 'antd';
import { MailOutlined, QuestionCircleOutlined, BulbOutlined, BugOutlined, SendOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const SUPPORT_EMAIL = 'shemiconinfotech@gmail.com';

export default function ContactSupport() {
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  function handleSend() {
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject || 'Feedback / Issue')}&body=${encodeURIComponent(body || '')}`;
    window.open(mailto, '_blank');
    message.success(t('msg.emailOpened'));
  }

  function handleSendQuick(type) {
    const subjects = {
      feature: 'Feature Request - Billing Pro',
      issue: 'Bug Report - Billing Pro',
      feedback: 'Feedback - Billing Pro',
    };
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjects[type] || subjects.feedback)}&body=${encodeURIComponent('')}`;
    window.open(mailto, '_blank');
    message.success(t('msg.emailOpened'));
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={[12, 12]}>
          <Col flex="auto">
            <Space align="center" size={14}>
              <div className="gradient-icon">
                <MailOutlined style={{ color: '#fff', fontSize: 20 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0, fontSize: 22 }}>{t('nav.support')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>shemiconinfotech@gmail.com</Text>
              </div>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card styles={{ body: { padding: '24px 28px' } }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'var(--accent-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MailOutlined style={{ fontSize: 18, color: 'white' }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 15 }}>{t('support.contactTitle')}</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>{t('support.contactDesc')}</Text>
                </div>
              </Space>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 16px', background: '#1a2332', borderRadius: 10,
                border: '1px solid #2a3444'
              }}>
                <MailOutlined style={{ color: 'var(--accent)' }} />
                <Text copyable={{ text: SUPPORT_EMAIL }} style={{ fontSize: 14, fontFamily: 'monospace' }}>
                  {SUPPORT_EMAIL}
                </Text>
                <Tag color="success" style={{ marginLeft: 'auto', fontSize: 11 }}>{t('support.responseTime')}</Tag>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={
            <Space><BulbOutlined style={{ color: '#f59e0b' }} /><Text strong>{t('support.featureRequest')}</Text></Space>
          } styles={{ body: { padding: '20px 24px' } }}>
            <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
              {t('support.featureDesc')}
            </Paragraph>
            <Button type="primary" ghost icon={<BulbOutlined />} onClick={() => handleSendQuick('feature')} block>
              {t('support.sendFeature')}
            </Button>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={
            <Space><BugOutlined style={{ color: '#ef4444' }} /><Text strong>{t('support.reportIssue')}</Text></Space>
          } styles={{ body: { padding: '20px 24px' } }}>
            <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
              {t('support.issueDesc')}
            </Paragraph>
            <Button type="primary" ghost danger icon={<BugOutlined />} onClick={() => handleSendQuick('issue')} block>
              {t('support.sendIssue')}
            </Button>
          </Card>
        </Col>

        <Col span={24}>
          <Card styles={{ body: { padding: '24px 28px' } }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'var(--accent-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SendOutlined style={{ fontSize: 18, color: 'white' }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 15 }}>{t('support.sendMessage')}</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>{t('support.sendMessageDesc')}</Text>
                </div>
              </Space>

              <div>
                <Text style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>{t('support.subject')}</Text>
                <Input
                  placeholder={t('support.subjectPlaceholder')}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </div>

              <div>
                <Text style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>{t('support.message')}</Text>
                <TextArea
                  rows={4}
                  placeholder={t('support.messagePlaceholder')}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </div>

              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                size="large"
                style={{ borderRadius: 10, height: 44 }}
              >
                {t('support.sendViaEmail')}
              </Button>

              <Divider style={{ margin: '4px 0' }} />

              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{t('support.privacyNote')}</Text>
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
