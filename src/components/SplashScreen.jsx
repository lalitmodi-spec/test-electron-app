import { useEffect, useState } from 'react';
import { FileTextOutlined } from '@ant-design/icons';
import { useLanguage } from '../i18n/LanguageContext';

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    overflow: 'hidden',
    background: '#0b1120',
  },
  bgGradient: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(var(--accent-rgb), 0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(var(--accent-rgb), 0.05) 0%, transparent 70%)',
    animation: 'gradientShift 8s ease-in-out infinite alternate',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(var(--accent-rgb), 0.2) 0%, transparent 70%)',
    animation: 'glowPulse 3s ease-in-out infinite alternate',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  iconWrapper: {
    position: 'relative',
    zIndex: 2,
    width: 90,
    height: 90,
    borderRadius: 24,
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 40px rgba(var(--accent-rgb), 0.4), 0 0 80px rgba(var(--accent-rgb), 0.2)',
    animation: 'iconFloat 3s ease-in-out infinite',
  },
  iconRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 30,
    border: '2px solid rgba(var(--accent-rgb), 0.3)',
    animation: 'ringPulse 2s ease-out infinite',
  },
  ring2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 36,
    border: '1px solid rgba(var(--accent-rgb), 0.15)',
    animation: 'ringPulse 2s ease-out infinite 0.5s',
  },
  title: {
    position: 'relative',
    zIndex: 2,
    color: 'white',
    fontSize: 28,
    fontWeight: 700,
    marginTop: 32,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    position: 'relative',
    zIndex: 2,
    color: 'rgba(148,163,184,0.8)',
    fontSize: 13,
    marginTop: 6,
    letterSpacing: '1px',
    textTransform: 'uppercase' },
  dots: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    gap: 8,
    marginTop: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--accent)',
    animation: 'dotBounce 1.4s ease-in-out infinite both',
  },
  dot2: { animationDelay: '0.16s' },
  dot3: { animationDelay: '0.32s' },
  progressTrack: {
    position: 'relative',
    zIndex: 2,
    width: 200,
    height: 3,
    borderRadius: 2,
    background: 'rgba(var(--accent-rgb), 0.15)',
    marginTop: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    background: 'var(--accent-gradient)',
    animation: 'progressFill 2s ease-in-out infinite',
  },
  version: {
    position: 'absolute',
    bottom: 32,
    zIndex: 2,
    color: 'rgba(148,163,184,0.4)',
    fontSize: 11,
    letterSpacing: '0.5px',
  },
  particles: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
};

function Particle({ index }) {
  const size = Math.random() * 4 + 2;
  const left = Math.random() * 100;
  const delay = Math.random() * 5;
  const duration = Math.random() * 3 + 3;
  const opacity = Math.random() * 0.3 + 0.1;
  return (
    <div style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'rgba(var(--accent-rgb), 0.5)',
      left: `${left}%`,
      bottom: '-10px',
      opacity,
      animation: `particleFloat ${duration}s ease-in-out ${delay}s infinite`,
    }} />
  );
}

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 600);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradientShift {
        0% { transform: scale(1) rotate(0deg); }
        100% { transform: scale(1.1) rotate(3deg); }
      }
      @keyframes glowPulse {
        0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
        100% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
      }
      @keyframes iconFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes ringPulse {
        0% { transform: scale(0.8); opacity: 0.5; }
        100% { transform: scale(1.2); opacity: 0; }
      }
      @keyframes dotBounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }
      @keyframes progressFill {
        0% { width: 0%; }
        50% { width: 70%; }
        100% { width: 100%; }
      }
      @keyframes particleFloat {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        10% { opacity: 0.3; }
        90% { opacity: 0.3; }
        100% { transform: translateY(-600px) translateX(100px); opacity: 0; }
      }
      @keyframes splashFadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(1.05); filter: blur(4px); }
      }
      .splash-fade-out {
        animation: splashFadeOut 0.6s ease-in-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <div style={styles.container} className={fadeOut ? 'splash-fade-out' : ''}>
      <div style={styles.bgGradient} />
      <div style={styles.particles}>
        {Array.from({ length: 15 }, (_, i) => <Particle key={i} index={i} />)}
      </div>
      <div style={styles.glow} />
      <div style={styles.iconWrapper}>
        <div style={styles.iconRing} />
        <div style={styles.ring2} />
        <FileTextOutlined style={{ fontSize: 38, color: 'white', position: 'relative', zIndex: 3 }} />
      </div>
      <div style={styles.title}>{t('header.billingPro')}</div>
      <div style={styles.subtitle}>{t('header.subtitle')}</div>
      <div style={styles.dots}>
        <div style={{ ...styles.dot, ...styles.dot2 }} />
        <div style={{ ...styles.dot, ...styles.dot2 }} />
        <div style={{ ...styles.dot, ...styles.dot3 }} />
      </div>
      <div style={styles.progressTrack}>
        <div style={styles.progressBar} />
      </div>
      <div style={styles.version}>{t('header.version')}</div>
    </div>
  );
}
