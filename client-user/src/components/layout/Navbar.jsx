import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Cloud, Search, ExternalLink, ChevronDown, Plus, Check,
  Activity, ShieldCheck, User, Layers, Receipt, CreditCard,
  Mail, LogOut, Sparkles, Smartphone, Building2, LogIn, UserPlus
} from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import CustomerRegisterModal from '../auth/CustomerRegisterModal';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentCustomer, logoutCustomer, orders } = useCustomerAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const pendingCount = orders.filter((o) => o.status === 'FAILED').length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/orders?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 shadow-xs">
      {/* ── Azure Primary Masthead (Deep Navy) ── */}
      <div className="bg-[#002050] text-white h-12 px-4 flex items-center justify-between">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="w-7 h-7 rounded bg-[#0078d4] flex items-center justify-center text-white shadow-xs">
              <Cloud size={17} className="fill-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[14px] tracking-tight text-white">Acme Cloud</span>
              <span className="text-[11px] text-blue-200/80 font-normal">|</span>
              <span className="text-[12px] text-blue-100 font-medium">Customer Portal</span>
            </div>
          </Link>
        </div>

        {/* Center: Global Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden md:flex items-center flex-1 max-w-md mx-6"
        >
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources, invoices, or subscriptions..."
              className="w-full h-8 pl-9 pr-3 text-xs rounded bg-white text-slate-900 placeholder:text-slate-500 border border-transparent focus:outline-hidden focus:border-[#0078d4] shadow-inner"
            />
          </div>
        </form>

        {/* Right Utilities */}
        <div className="flex items-center gap-3">
          {/* Live Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-[#00173d] text-[11px] text-emerald-400 border border-blue-900/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-200">Socket.IO Live</span>
          </div>

          {/* RevivePilot Cockpit Link */}
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-100 hover:text-white bg-[#003366] hover:bg-[#004080] rounded border border-blue-700/50 transition-colors"
            title="Open RevivePilot Merchant Cockpit in new tab"
          >
            <ShieldCheck size={13} className="text-blue-300" />
            <span className="font-medium">Merchant Cockpit (:3000)</span>
            <ExternalLink size={11} className="opacity-70" />
          </a>

          {/* Real Customer Identity / Register Button */}
          {currentCustomer ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded hover:bg-[#003366] text-left text-xs transition-colors cursor-pointer border border-transparent hover:border-blue-700/50"
              >
                <div className="w-6 h-6 rounded bg-[#0078d4] text-white font-bold flex items-center justify-center text-[10px]">
                  {(currentCustomer.name || 'CU').slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="font-semibold text-white text-[12px]">{currentCustomer.name}</p>
                  <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verified User
                  </p>
                </div>
                <ChevronDown size={13} className="text-blue-200" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-80 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-fade-in"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Active Verified Profile
                      </p>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                        Email OTP Verified
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{currentCustomer.name}</p>
                    <p className="text-[11px] text-slate-600 truncate">{currentCustomer.email}</p>
                    <p className="text-[11px] text-slate-500">
                      Balance: <strong className="text-slate-900 font-mono">₹{(currentCustomer.balance || 150000).toLocaleString('en-IN')}.00</strong>
                    </p>
                  </div>

                  {/* Unique Dynamic Instruments Summary */}
                  <div className="p-3 bg-white space-y-2 text-xs border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Assigned Test Instruments</p>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1">
                          <CreditCard size={12} className="text-[#0078d4]" />
                          Card:
                        </span>
                        <span className="font-mono font-semibold text-slate-900">
                          {currentCustomer.cardNumber || currentCustomer.card_number || '4532 •••• •••• 4242'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1">
                          <Smartphone size={12} className="text-purple-600" />
                          UPI VPA:
                        </span>
                        <span className="font-mono text-purple-700 font-medium">
                          {currentCustomer.upiVpa || currentCustomer.upi_vpa || 'user@okhdfcbank'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        logoutCustomer();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left text-xs py-1.5 px-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      <LogOut size={13} />
                      <span>Sign Out / Switch User</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setRegisterModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] hover:bg-[#004080] text-blue-100 hover:text-white rounded text-xs font-semibold border border-blue-400/40 transition-colors cursor-pointer shadow-xs"
              >
                <LogIn size={13} className="text-blue-300" />
                <span>Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegisterModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <UserPlus size={13} />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Azure Sub-Navigation Toolbar (Tabs) ── */}
      <div className="bg-white border-b border-slate-200 px-4 flex items-center justify-between h-10">
        <nav className="flex items-center gap-6 h-full">
          <Link
            to="/"
            className={`h-full flex items-center gap-1.5 text-xs font-medium border-b-2 transition-colors ${
              location.pathname === '/'
                ? 'border-[#0078d4] text-[#0078d4] font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} />
            <span>Products &amp; Subscriptions</span>
          </Link>

          <Link
            to="/orders"
            className={`h-full flex items-center gap-1.5 text-xs font-medium border-b-2 transition-colors ${
              location.pathname === '/orders'
                ? 'border-[#0078d4] text-[#0078d4] font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt size={14} />
            <span>Invoices &amp; Transactions</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            className={`h-full flex items-center gap-1.5 text-xs font-medium border-b-2 transition-colors ${
              location.pathname === '/profile'
                ? 'border-[#0078d4] text-[#0078d4] font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard size={14} />
            <span>Payment Rails &amp; Balance</span>
          </Link>
        </nav>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span>Tenant: <strong className="text-slate-700 font-medium">Acme Corp</strong></span>
          <span>•</span>
          <span>Region: <strong className="text-slate-700 font-medium">India Central (Mumbai)</strong></span>
        </div>
      </div>

      {/* Registration & OTP Modal */}
      <CustomerRegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        initialMode={authMode}
      />
    </header>
  );
}
