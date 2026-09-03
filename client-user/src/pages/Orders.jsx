import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RefreshCw, Search, ArrowRight, ShieldCheck, Download,
  CheckCircle2, AlertCircle, Clock, ExternalLink, Plus, Filter,
  LogIn, Receipt
} from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export default function Orders() {
  const { currentCustomer, orders = [], refreshOrders, setIsAuthModalOpen } = useCustomerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const safeOrders = useMemo(() => {
    return Array.isArray(orders) ? orders : [];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return safeOrders.filter((order) => {
      const status = (order.status || '').toUpperCase();
      // Status filter
      if (statusFilter === 'PAID' && status !== 'PAID' && status !== 'SUCCESS') {
        return false;
      }
      if (statusFilter === 'FAILED' && status !== 'FAILED') {
        return false;
      }
      if (statusFilter === 'RECOVERED' && status !== 'RECOVERED') {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (order.itemName || order.item_name || '').toLowerCase().includes(q);
        const matchId = (order.id || order.payment_id || order.paymentId || '').toLowerCase().includes(q);
        const matchReason = (order.failureReason || order.failure_reason || '').toLowerCase().includes(q);
        if (!matchName && !matchId && !matchReason) return false;
      }
      return true;
    });
  }, [safeOrders, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    let total = 0;
    let recovered = 0;
    let failed = 0;
    safeOrders.forEach((o) => {
      const amt = Number(o.amount || 0);
      total += amt;
      const st = (o.status || '').toUpperCase();
      if (st === 'RECOVERED') recovered += amt;
      if (st === 'FAILED') failed += amt;
    });
    return { total, recovered, failed, count: safeOrders.length };
  }, [safeOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (refreshOrders) {
      await refreshOrders();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const customerName = currentCustomer?.name || 'Verified Customer';
  const customerEmail = currentCustomer?.email || 'guest@example.com';
  const customerBalance = Number(currentCustomer?.balance || 150000);

  return (
    <div className="space-y-4 pb-12">
      {/* ── Azure Breadcrumb & Title Area ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mb-1">
          <Link to="/" className="hover:text-[#0078d4] text-slate-600">Home</Link>
          <span>/</span>
          <span className="text-slate-500">Billing &amp; Cost Management</span>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Invoices &amp; Transactions</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices &amp; Orders</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer Account:{' '}
              <strong className="text-slate-800">{customerName}</strong>{' '}
              <span className="text-slate-400">({customerEmail})</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!currentCustomer && (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen && setIsAuthModalOpen(true)}
                className="btn-azure-secondary text-xs flex items-center gap-1.5"
              >
                <LogIn size={13} />
                <span>Sign In to Sync</span>
              </button>
            )}
            <Link to="/" className="btn-azure text-xs flex items-center gap-1.5">
              <Plus size={14} />
              <span>Browse Products &amp; Catalog</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Unauthenticated notice if user is browsing orders logged out */}
        {!currentCustomer && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>You are viewing local session transactions. Sign in to view your cloud database invoices.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen && setIsAuthModalOpen(true)}
              className="text-[#0078d4] font-semibold hover:underline cursor-pointer"
            >
              Sign In Now →
            </button>
          </div>
        )}

        {/* ── Azure Unified Cost & Recovery Ribbon (Single continuous strip) ── */}
        <div className="bg-white border border-slate-200 rounded shadow-2xs divide-y sm:divide-y-0 sm:divide-x divide-slate-200 grid grid-cols-2 md:grid-cols-4">
          <div className="p-3.5 sm:px-5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Invoiced
            </span>
            <div className="mt-1">
              <span className="text-xl font-bold text-slate-900 font-mono-code">
                ₹{stats.total.toLocaleString('en-IN')}.00
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{stats.count} total transactions</span>
          </div>

          <div className="p-3.5 sm:px-5">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Recovered Revenue
            </span>
            <div className="mt-1">
              <span className="text-xl font-bold text-emerald-600 font-mono-code">
                ₹{stats.recovered.toLocaleString('en-IN')}.00
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">Via AI Recovery Engine</span>
          </div>

          <div className="p-3.5 sm:px-5">
            <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block">
              Action Required (At Risk)
            </span>
            <div className="mt-1">
              <span className="text-xl font-bold text-red-600 font-mono-code">
                ₹{stats.failed.toLocaleString('en-IN')}.00
              </span>
            </div>
            <span className="text-[11px] text-red-600 font-medium mt-0.5 block">Awaiting settlement</span>
          </div>

          <div className="p-3.5 sm:px-5">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
              Simulated Account Balance
            </span>
            <div className="mt-1">
              <span className="text-xl font-bold text-[#0078d4] font-mono-code">
                ₹{customerBalance.toLocaleString('en-IN')}.00
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">
              Enterprise Verified Rail
            </span>
          </div>
        </div>

        {/* ── Azure Command Bar & Filter Toolbar ── */}
        <div className="bg-white border border-slate-200 rounded shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center gap-1">
                <Filter size={12} /> Filter:
              </span>
              {[
                { id: 'ALL', label: 'All Invoices' },
                { id: 'PAID', label: 'Succeeded' },
                { id: 'FAILED', label: 'Action Required' },
                { id: 'RECOVERED', label: 'Recovered by AI' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-[#0078d4] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right: Search & Refresh */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name or ID..."
                  className="w-full h-7 pl-8 pr-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#0078d4]"
                />
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="h-7 px-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Refresh table"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* ── The Clean Azure Data Table ── */}
          <div className="overflow-x-auto">
            <table className="azure-table">
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>Invoice ID</th>
                  <th style={{ width: '28%' }}>Subscription / Service</th>
                  <th style={{ width: '14%' }}>Date &amp; Rail</th>
                  <th style={{ width: '14%' }}>Amount (INR)</th>
                  <th style={{ width: '14%' }}>Gateway Status</th>
                  <th style={{ width: '14%', minWidth: '160px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                      No invoices found matching your filter.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, idx) => {
                    const status = (order.status || '').toUpperCase();
                    const isPaid = status === 'PAID' || status === 'SUCCESS';
                    const isRecovered = status === 'RECOVERED';
                    const isFailed = status === 'FAILED';

                    const rawDate = order.date || order.created_at || Date.now();
                    const formattedDate = !isNaN(new Date(rawDate).getTime())
                      ? new Date(rawDate).toLocaleDateString()
                      : 'Recent';

                    const amountVal = Number(order.amount || 0);
                    const orderId = order.id || order.payment_id || order.paymentId || `INV-2026-${idx + 100}`;
                    const itemName = order.itemName || order.item_name || 'Acme Cloud Compute Service';
                    const caseId = order.caseId || order.case_id || order.id;

                    return (
                      <tr key={orderId + idx} className="transition-colors">
                        {/* Invoice ID */}
                        <td className="font-mono-code text-xs font-semibold text-[#0078d4]">
                          {orderId}
                        </td>

                        {/* Service / Item */}
                        <td>
                          <p className="font-semibold text-slate-900 leading-tight">{itemName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Billed to {customerName}</p>
                        </td>

                        {/* Date & Rail */}
                        <td>
                          <p className="text-slate-700 text-xs">{formattedDate}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{order.paymentMethod || order.payment_method || 'Razorpay Standard'}</p>
                        </td>

                        {/* Amount */}
                        <td className="font-mono-code font-bold text-slate-900 text-xs">
                          ₹{amountVal.toLocaleString('en-IN')}.00
                        </td>

                        {/* Gateway Status */}
                        <td>
                          {isPaid && (
                            <span className="status-pill status-success">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              <span>Succeeded</span>
                            </span>
                          )}

                          {isRecovered && (
                            <span className="status-pill status-recovered">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              <span>Recovered by AI</span>
                            </span>
                          )}

                          {isFailed && (
                            <div className="space-y-0.5">
                              <span className="status-pill status-failed">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                <span>Failed</span>
                              </span>
                              {(order.failureReason || order.failure_reason) && (
                                <p className="text-[10px] text-red-600 font-mono-code font-semibold pl-2">
                                  {order.failureReason || order.failure_reason}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Action Column */}
                        <td style={{ minWidth: '160px', textAlign: 'right' }}>
                          {isFailed ? (
                            <Link
                              to={`/pay/${caseId}`}
                              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-semibold rounded shadow-2xs transition-colors"
                            >
                              <span>Pay Recovery Link</span>
                              <ArrowRight size={12} />
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium pr-2">Settled</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>Showing {filteredOrders.length} of {safeOrders.length} transactions</span>
            <span className="text-[11px] text-slate-400">Razorpay Payment Engine v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
