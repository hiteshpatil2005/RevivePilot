import { Navigate, Outlet } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

const FEATURES = [
  {
    title: 'Instant Gateway Bottleneck Bypass',
    desc: 'Routes failed bank transactions to active fallback rails instantly.',
  },
  {
    title: 'Bounded Multi-Agent Governance',
    desc: 'Strict merchant policies enforce retry caps, cooldowns, and amount limits.',
  },
  {
    title: 'Real-Time Razorpay Webhook Ingestion',
    desc: 'Sub-second event detection for payment.failed and payment.captured.',
  },
];

const STATS = [
  { value: '74.9%', label: 'Recovery Rate' },
  { value: '<8s', label: 'AI Decision', color: '#00d2d3' },
  { value: '₹42.8L', label: 'Saved Today', color: '#34d399' },
];

export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#072654' }}>
        <Spinner size={28} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: '#f4f5f7' }}>

      {/* ── Left Brand Panel ── */}
      <div style={{
        width: '480px',
        flexShrink: 0,
        backgroundColor: '#072654',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }} className="hidden lg:flex">

        {/* Top logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Logo variant="full" size="lg" light />
          <div style={{
            marginTop: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '100px',
            border: '1px solid rgba(12,111,249,0.4)',
            backgroundColor: 'rgba(12,111,249,0.15)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00d2d3', display: 'inline-block' }} className="animate-pulse-live" />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#93c5fd', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Razorpay Buildathon · Track 03
            </span>
          </div>
        </div>

        {/* Middle pitch */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '800',
            lineHeight: '1.3',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            marginBottom: '16px',
          }}>
            Stop losing revenue to transient payment failures.
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.7', marginBottom: '28px' }}>
            RevivePilot monitors gateway drops in real-time, diagnoses root causes using multi-agent AI,
            and autonomously issues 1-click alternative recovery rails within your bounded merchant policies.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(12,111,249,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  <CheckCircle2 size={12} color="#0c6ff9" />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', marginBottom: '2px' }}>{f.title}</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <p style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'monospace', color: s.color || '#ffffff', letterSpacing: '-0.02em' }}>
                {s.value}
              </p>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Auth Panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Minimal top bar — mobile logo only */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid #e8eaed',
          backgroundColor: '#ffffff',
        }}>
          <div className="lg:hidden">
            <Logo variant="full" size="sm" />
          </div>
          <div className="hidden lg:block" /> {/* spacer */}
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: '420px' }} className="animate-fade-in">
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 32px',
          borderTop: '1px solid #e8eaed',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <p style={{ fontSize: '12px', color: '#9299a7' }}>© 2026 RevivePilot · Razorpay Buildathon Edition</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9299a7' }}>
              <ShieldCheck size={12} style={{ color: '#059669' }} />
              RBI Tokenized
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9299a7' }}>
              <Lock size={12} style={{ color: '#0c6ff9' }} />
              256-Bit SSL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
