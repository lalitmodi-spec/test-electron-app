import { useState, useRef } from 'react';
import { Modal, Card, Typography, Space, Button, Row, Col, Tag } from 'antd';
import { EyeOutlined, DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import { pdf } from '@react-pdf/renderer';
import { getAllTemplates, getDummyData } from './index';

const { Text } = Typography;

export default function TemplatePreview({ selected, onSelect, visible, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLabel, setPreviewLabel] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewRef = useRef(null);
  const { invoice, settings } = getDummyData();
  const templates = getAllTemplates();

  async function showPreview(template) {
    try {
      const Template = template.Component;
      const doc = <Template invoice={invoice} settings={settings} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      setPreviewLabel(template.label);
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (err) {
      console.error('Preview error:', err);
    }
  }

  async function downloadSample(template) {
    try {
      const Template = template.Component;
      const doc = <Template invoice={invoice} settings={settings} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sample_${template.key}_Invoice.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Download error:', err);
    }
  }

  const templateColors = {
    professional: { bg: '#eef2ff', border: '#6366f1', accent: '#6366f1' },
    classic: { bg: '#eff6ff', border: '#2563eb', accent: '#2563eb' },
    minimal: { bg: '#f8fafc', border: '#0f172a', accent: '#0f172a' },
  };

  return (
    <>
      {visible && (
        <Modal
          title={<Space><FilePdfOutlined style={{ color: '#6366f1' }} /> Select PDF Template</Space>}
          open={visible}
          onCancel={onClose}
          footer={null}
          width={780}
        >
          <Row gutter={[16, 16]}>
            {templates.map((t) => {
              const colors = templateColors[t.key] || templateColors.professional;
              const isSelected = selected === t.key;
              return (
                <Col xs={24} sm={12} md={8} key={t.key}>
                  <Card
                    hoverable
                    style={{
                      borderColor: isSelected ? colors.border : undefined,
                      borderWidth: isSelected ? 2 : 1,
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      if (onSelect) onSelect(t.key);
                      if (onClose) onClose();
                    }}
                  >
                    <div style={{
                      height: 160,
                      background: `linear-gradient(135deg, ${colors.bg}, white)`,
                      borderRadius: 8,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${colors.bg}`,
                      marginBottom: 12,
                    }}>
                      <FilePdfOutlined style={{ fontSize: 40, color: colors.accent, marginBottom: 8 }} />
                      <Text strong style={{ color: colors.accent }}>{t.label}</Text>
                      <Tag color="default" style={{ marginTop: 4, fontSize: 10 }}>
                        {t.key === 'professional' ? 'Indigo Header' :
                         t.key === 'classic' ? 'Blue Classic' : 'Clean Dark'}
                      </Tag>
                    </div>
                    <Space style={{ width: '100%', justifyContent: 'center' }}>
                      <Button size="small" icon={<EyeOutlined />}
                        onClick={(e) => { e.stopPropagation(); showPreview(t); }}>
                        Preview
                      </Button>
                      <Button size="small" icon={<DownloadOutlined />}
                        onClick={(e) => { e.stopPropagation(); downloadSample(t); }}>
                        Sample
                      </Button>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Modal>
      )}

      <Modal
        title={`Preview: ${previewLabel} Template`}
        open={previewOpen}
        onCancel={() => { setPreviewOpen(false); setPreviewUrl(null); }}
        width={800}
        footer={[
          <Button key="close" onClick={() => { setPreviewOpen(false); setPreviewUrl(null); }}>Close</Button>
        ]}
      >
        {previewUrl && (
          <iframe
            ref={previewRef}
            src={previewUrl}
            style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }}
            title="PDF Preview"
          />
        )}
      </Modal>
    </>
  );
}
