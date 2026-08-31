import { FlaskConical } from 'lucide-react';

/**
 * TestModeBanner — sticky notice shown on payment-related views.
 *
 * Clearly communicates that Razorpay is in Test/Sandbox mode.
 * The platform itself is real; only the payment transaction is sandboxed.
 *
 * Props:
 *   compact (bool) — show as small inline badge instead of full banner
 */
export default function TestModeBanner({ compact = false }) {
  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          backgroundColor: '#fef9c3',
          border: '1px solid #fde047',
          color: '#854d0e',
        }}
      >
        <FlaskConical size={11} />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          Razorpay Test Mode
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 rounded-xl"
      style={{
        backgroundColor: '#fef9c3',
        border: '1px solid #fde047',
      }}
    >
      <FlaskConical size={16} style={{ color: '#92400e', flexShrink: 0 }} />
      <div>
        <p className="text-[13px] font-bold" style={{ color: '#92400e' }}>
          ● TEST MODE — Razorpay Sandbox Active
        </p>
        <p className="text-[12px]" style={{ color: '#a16207' }}>
          Payments are processed in Razorpay's test environment. No real money is moved.
          All other RevivePilot operations (AI, policies, audit, analytics) are fully real.
        </p>
      </div>
    </div>
  );
}
