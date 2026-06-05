import { useState, useEffect, useRef } from 'react';
import { Typography, Input } from 'antd';
import { LockOutlined, FileTextOutlined, KeyOutlined } from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';
import db from '../db';

const { Text, Title } = Typography;

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'];

function Dot({ filled }) {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
      background: filled ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
      border: filled ? 'none' : '2px solid rgba(255,255,255,0.2)',
      transition: 'all 0.15s',
      margin: '0 5px',
    }} />
  );
}

export default function PinGate({ onUnlock }) {
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [storedPin, setStoredPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    db.settings.get('appPin').then(s => {
      if (s) setStoredPin(s.value);
    });
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  function handleDigit(d) {
    if (d === 'DEL') {
      setPin(prev => prev.slice(0, -1));
      setError(false);
    } else if (pin.length < 6) {
      const newPin = pin + d;
      setPin(newPin);
      setError(false);
      if (newPin.length === 6) {
        setTimeout(() => {
          if (newPin === storedPin) {
            onUnlock();
          } else {
            setError(true);
            setPin('');
            setAttempts(a => a + 1);
          }
        }, 150);
      }
    }
  }

  const styles = {
    container: {
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0b1120', zIndex: 9999,
    },
    bgGradient: {
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 30% 20%, rgba(var(--accent-rgb), 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
    },
    card: {
      position: 'relative', zIndex: 2,
      background: '#111827',
      borderRadius: 24, padding: '36px 32px 28px',
      width: 320,
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    },
    keyBtn: {
      width: 64, height: 56, borderRadius: 14,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
      color: 'white', fontSize: 20, fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.12s',
      userSelect: 'none',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgGradient} />
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(var(--accent-rgb), 0.3)',
          }}>
            <LockOutlined style={{ fontSize: 24, color: 'white' }} />
          </div>
          <Title level={4} style={{ color: 'white', margin: 0, fontWeight: 600 }}>Billing Pro</Title>
          <Text style={{ color: 'rgba(148,163,184,0.7)', fontSize: 12, display: 'block', marginTop: 4 }}>
            {t('common.pinRequired')}
          </Text>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28, minHeight: 18 }}>
          {[0, 1, 2, 3, 4, 5].map(i => <Dot key={i} filled={i < pin.length} />)}
        </div>

        {error && (
          <div style={{
            textAlign: 'center', marginBottom: 16, padding: '8px 12px',
            background: 'rgba(255,77,79,0.1)', borderRadius: 10,
            border: '1px solid rgba(255,77,79,0.2)',
          }}>
            <Text type="danger" style={{ fontSize: 13 }}>{t('common.pinWrong')}</Text>
          </div>
        )}

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, justifyContent: 'center', maxWidth: 220, margin: '0 auto',
          justifyItems: 'center',
        }}>
          {KEYPAD.map((d, i) => (
            d === '' ? (
              <div key={i} style={{ width: 64, height: 56 }} />
            ) : (
              <div
                key={i}
                style={styles.keyBtn}
                onClick={() => handleDigit(d)}
                onMouseDown={e => {
                  e.currentTarget.style.transform = 'scale(0.92)';
                  e.currentTarget.style.background = 'rgba(var(--accent-rgb), 0.2)';
                }}
                onMouseUp={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                {d === 'DEL' ? <KeyOutlined style={{ fontSize: 18, color: '#ff4d4f' }} /> : d}
              </div>
            )
          ))}
        </div>

        <input ref={inputRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          onKeyDown={e => {
            if (e.key === 'Backspace') handleDigit('DEL');
            else if (/^\d$/.test(e.key)) handleDigit(e.key);
          }}
          autoFocus />
      </div>
    </div>
  );
}
