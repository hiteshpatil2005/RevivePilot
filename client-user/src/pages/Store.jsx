import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers, Server, Cpu, Zap, CreditCard, Check, ArrowRight,
  ShieldCheck, Info, Sparkles, Filter
} from 'lucide-react';
import { STORE_CATALOG } from '../data/mockUserData';
import RazorpayModal from '../components/checkout/RazorpayModal';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function Store() {
  const { currentCustomer } = useCustomerAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredProducts = STORE_CATALOG.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const handleOpenCheckout = (product) => {
    const calculatedAmount = (billingCycle === 'annual' ? product.annualAmount : product.monthlyAmount) ?? product.amount ?? 25000;
    setSelectedProduct({
      ...product,
      amount: calculatedAmount,
      billingCycle,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-16">
      {/* ── Azure Breadcrumb & Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mb-1">
          <Link to="/" className="hover:text-[#0078d4] text-slate-600">Home</Link>
          <span>/</span>
          <span className="text-slate-500">Marketplace</span>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Subscriptions &amp; Compute</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cloud Services Catalog</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any subscription plan or compute pack to test payment gateway processing and AI recovery.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Billing:</span>
            <div className="inline-flex bg-slate-100 p-0.5 rounded border border-slate-200">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1 text-xs font-semibold rounded flex items-center gap-1 transition-colors cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
        {/* Informative Azure Notice Bar */}
        <div className="bg-[#eff6fc] border border-[#c7e0f4] rounded p-3 flex items-start gap-3 text-xs text-[#004578]">
          <Info size={16} className="text-[#0078d4] flex-shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold">Razorpay Buildathon Environment:</span> All checkouts use Razorpay test mode. You can simulate normal captures or trigger banking timeout bottlenecks. Failure events are ingested by RevivePilot on <strong className="font-semibold">Port 5173</strong>.
          </div>
        </div>

        {/* Category Command Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
          {[
            { id: 'all', label: 'All Services', icon: Layers },
            { id: 'cloud', label: 'Cloud Mandates', icon: Server },
            { id: 'compute', label: 'GPU & AI Compute', icon: Cpu },
            { id: 'subscriptions', label: 'SaaS Subscriptions', icon: Zap },
            { id: 'developer', label: 'Developer APIs', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-[#0078d4] text-white font-semibold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const displayPrice = (billingCycle === 'annual' ? product.annualAmount : product.monthlyAmount) ?? product.amount ?? 25000;

            return (
              <div
                key={product.id}
                className="azure-card p-5 flex flex-col justify-between hover:border-[#0078d4] transition-colors relative"
              >
                {product.popular && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-[#0078d4] px-2 py-0.5 rounded border border-blue-200">
                    {product.tag}
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {product.type}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{product.name}</h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{product.description}</p>
                  </div>

                  {/* Price */}
                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900 font-mono-code">
                        ₹{displayPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-500">
                        {product.interval === 'one-time' ? '/ package' : `/${product.interval}`}
                      </span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    {product.features?.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deploy / Pay Button */}
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(product)}
                    className="w-full btn-azure py-2 text-xs font-semibold cursor-pointer"
                  >
                    <span>Pay with Razorpay</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Razorpay Modal */}
      <RazorpayModal
        item={selectedProduct}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
