import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useCustomerRealtime } from '../../context/CustomerRealtimeContext';

export default function RecoveryNotificationToast() {
  const navigate = useNavigate();
  const { activeRecoveryNotice, dismissNotice } = useCustomerRealtime();

  if (!activeRecoveryNotice) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl border-2 border-emerald-500 p-4 space-y-3 relative text-slate-900">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs">Acme Cloud Support</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                  RevivePilot AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{activeRecoveryNotice.timestamp}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissNotice}
            className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Message */}
        <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Checkout of ₹{activeRecoveryNotice.amount.toLocaleString('en-IN')} faced a bank timeout.
          </p>
          <p className="text-[11px] text-slate-600 mt-1">
            RevivePilot has generated an authorized, 1-click alternative Razorpay recovery link for you.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            dismissNotice();
            navigate(activeRecoveryNotice.payLink);
          }}
          className="w-full btn-azure py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ShieldCheck size={14} />
          <span>Pay via Smart Recovery Link</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
