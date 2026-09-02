import { useState } from 'react';
import { X, UserPlus, ShieldCheck } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function NewCustomerModal({ isOpen, onClose }) {
  const { registerCustomer } = useCustomerAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tier, setTier] = useState('Standard');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email) return;

    registerCustomer({ name, email, phone, tier });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-lg w-full max-w-md p-5 shadow-2xl border border-slate-300 space-y-4 text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-50 text-[#0078d4] flex items-center justify-center font-bold">
              <UserPlus size={17} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Create Customer Profile</h3>
              <p className="text-[11px] text-slate-500">Add an end-user identity for checkout simulation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-[#0078d4]"
              placeholder="e.g. Deepika Roy"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-[#0078d4]"
              placeholder="deepika.r@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:border-[#0078d4]"
              placeholder="+91 98765 11223"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">LTV Policy Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-[#0078d4] cursor-pointer"
            >
              <option value="Standard">Standard Tier (LTV &lt; ₹50,000)</option>
              <option value="Pro Tier">Pro Tier (LTV ₹50,000 – ₹1,00,000)</option>
              <option value="Enterprise">Enterprise Tier (LTV &gt; ₹1,00,000)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full btn-azure py-2 text-xs font-bold cursor-pointer"
            >
              Save &amp; Switch Identity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
