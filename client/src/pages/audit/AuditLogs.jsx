import { useState, useMemo } from 'react';
import {
  ScrollText, Download, Search, Filter, X, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Info, Zap,
  CreditCard, Shield, Bot, Play, Square, RefreshCcw,
  TrendingUp, AlertCircle, ChevronRight, Copy, Clock,
} from 'lucide-react';
import { AUDIT_EVENT_TYPES, MOCK_AUDIT_LOGS } from '../../data/mockData';
import { useRealtimeContext } from '../../context/RealtimeContext';
import { useAuditLogs } from '../../hooks/useAuditLogs';

// ── Event type config ─────────────────────────────────────────────────────────
const EVENT_CONFIG = {
  PAYMENT_RECEIVED:       { icon: CreditCard,    color: 'var(--color-success)', label: 'Payment Received' },
  PAYMENT_FAILED:         { icon: XCircle,       color: 'var(--color-danger)',  label: 'Payment Failed' },
  RISK_DETECTED:          { icon: AlertTriangle, color: 'var(--color-warning)', label: 'Risk Detected' },
  ROOT_CAUSE_IDENTIFIED:  { icon: Search,        color: 'var(--color-info)',    label: 'Root Cause Identified' },
  STRATEGY_SELECTED:      { icon: Zap,           color: 'var(--color-brand)',   label: 'Strategy Selected' },
  POLICY_EVALUATED:       { icon: Shield,        color: 'var(--color-info)',    label: 'Policy Evaluated' },
  POLICY_APPROVED:        { icon: CheckCircle2,  color: 'var(--color-success)', label: 'Policy Approved' },
  POLICY_BLOCKED:         { icon: XCircle,       color: 'var(--color-danger)',  label: 'Policy Blocked' },
  ACTION_STARTED:         { icon: Play,          color: 'var(--color-brand)',   label: 'Action Started' },
  ACTION_COMPLETED:       { icon: CheckCircle2,  color: 'var(--color-success)', label: 'Action Completed' },
  ACTION_FAILED:          { icon: XCircle,       color: 'var(--color-danger)',  label: 'Action Failed' },
  PAYMENT_RECOVERED:      { icon: TrendingUp,    color: 'var(--color-success)', label: 'Payment Recovered' },
  CASE_ESCALATED:         { icon: AlertCircle,   color: 'var(--color-warning)', label: 'Case Escalated' },
  CASE_STOPPED:           { icon: Square,        color: 'var(--color-danger)',  label: 'Case Stopped' },
};

const RESULT_STYLE = {
  SUCCESS:   { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  APPROVED:  { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  FAILED:    { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
  BLOCKED:   { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
  ESCALATED: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  PENDING:   { color: 'var(--color-info)',    bg: 'var(--color-info-bg)' },
};

function relativeTs(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch { return iso; }
}

function shortTs(iso) {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  } catch { return ''; }
}

// ── Audit Detail Drawer ───────────────────────────────────────────────────────
function AuditDetailDrawer({ log, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const cfg = EVENT_CONFIG[log.eventType] || { icon: Info, color: 'var(--color-info)', label: log.eventType };
  const Icon = cfg.icon;
  const resSty = RESULT_STYLE[log.result] || RESULT_STYLE.PENDING;

  const copyMetadata = () => {
    navigator.clipboard.writeText(JSON.stringify(log.metadata, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 overflow-y-auto animate-fade-in"
        style={{
          width: 'min(480px, 100vw)',
          backgroundColor: 'var(--color-bg-card)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-card)',
            zIndex: 1,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${cfg.color}20` }}
            >
              <Icon size={16} style={{ color: cfg.color }} />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Event Details
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {log.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: 'var(--color-text-muted)', border: 'none', background: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-muted)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                {cfg.label}
              </span>
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: resSty.bg, color: resSty.color }}
              >
                {log.result}
              </span>
            </div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {log.decision}
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {log.reason}
            </p>
          </div>

          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Timestamp', value: relativeTs(log.timestamp), icon: Clock },
              { label: 'Actor', value: log.actor, icon: Bot },
              { label: 'Recovery Case', value: log.caseId, icon: RefreshCcw },
              { label: 'Action', value: log.action, icon: Zap },
            ].map((item, idx) => (
              <div key={idx} className="rounded-lg p-3" style={{ border: '1px solid var(--color-border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  {item.label}
                </p>
                <div className="flex items-center gap-1.5">
                  <item.icon size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {item.value || '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* State transition */}
          {log.prevState && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                State Transition
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text-secondary)' }}>
                  {log.prevState}
                </span>
                <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                  {log.newState}
                </span>
              </div>
            </div>
          )}

          {/* Metadata JSON */}
          {log.metadata && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  Metadata
                </p>
                <button
                  onClick={copyMetadata}
                  className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer transition-colors"
                  style={{ color: 'var(--color-brand)', background: 'none', border: 'none' }}
                >
                  <Copy size={11} />
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre
                className="font-mono-data text-[12px] p-4 rounded-xl overflow-x-auto"
                style={{
                  backgroundColor: 'var(--color-bg-muted)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  lineHeight: '1.6',
                }}
              >
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Detail */}
          {log.detail && (
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--color-bg-muted)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Summary
              </p>
              <p className="text-[13px]" style={{ color: 'var(--color-text-primary)' }}>{log.detail}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Audit Logs Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AuditLogs() {
  const { events: realtimeEvents } = useRealtimeContext();
  const { logs: apiLogs, loading } = useAuditLogs();
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  // Combine backend/mock audit logs + demo event logs from realtime context
  const allLogs = useMemo(() => {
    const baseLogs = (apiLogs && apiLogs.length > 0) ? apiLogs : MOCK_AUDIT_LOGS;
    const demoLogs = realtimeEvents
      .filter(e => e.isDemo)
      .map((e, idx) => ({
        id: `demo_${e.id || idx}`,
        timestamp: e.timestamp || new Date().toISOString(),
        eventType: (e.type || 'ACTION_STARTED').replace('RECOVERY_SUCCESS', 'PAYMENT_RECOVERED'),
        actor: 'Demo Mode',
        caseId: e.caseId || '—',
        action: e.data?.action || e.type,
        result: e.type?.includes('FAILED') || e.type?.includes('BLOCKED') ? 'FAILED' : 'SUCCESS',
        detail: e.data?.detail || e.type,
        prevState: null, newState: null,
        decision: `Demo event: ${e.type}`,
        reason: 'Triggered via Demo Controls',
        metadata: e.data || {},
      }));

    return [...demoLogs, ...baseLogs].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [apiLogs, realtimeEvents]);

  const filtered = useMemo(() => {
    return allLogs.filter(log => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        log.caseId?.toLowerCase().includes(q) ||
        log.actor?.toLowerCase().includes(q) ||
        log.eventType?.toLowerCase().includes(q) ||
        log.action?.toLowerCase().includes(q) ||
        log.detail?.toLowerCase().includes(q);

      const matchType = eventTypeFilter === 'all' || log.eventType === eventTypeFilter;
      const matchResult = resultFilter === 'all' || log.result === resultFilter;

      return matchSearch && matchType && matchResult;
    });
  }, [allLogs, search, eventTypeFilter, resultFilter]);

  const handleExport = () => {
    const csv = [
      'Timestamp,Event,Actor,Case,Action,Result,Detail',
      ...filtered.map(l =>
        `"${relativeTs(l.timestamp)}","${l.eventType}","${l.actor}","${l.caseId}","${l.action}","${l.result}","${l.detail}"`
      )
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revivepilot-audit-logs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Audit Logs
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Complete history of revenue recovery decisions, actions, policy evaluations and outcomes.
          </p>
        </div>
        <button onClick={handleExport} className="btn-ghost flex items-center gap-2" style={{ flexShrink: 0 }}>
          <Download size={14} />
          Export Logs
        </button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base"
              style={{ paddingLeft: '34px', fontSize: '13px', paddingTop: '8px', paddingBottom: '8px' }}
            />
          </div>

          {/* Event Type */}
          <select
            value={eventTypeFilter}
            onChange={e => setEventTypeFilter(e.target.value)}
            className="input-base"
            style={{ width: 'auto', fontSize: '13px', padding: '8px 12px', minWidth: '180px' }}
          >
            <option value="all">All Event Types</option>
            {Object.keys(AUDIT_EVENT_TYPES).map(t => (
              <option key={t} value={t}>{EVENT_CONFIG[t]?.label || t}</option>
            ))}
          </select>

          {/* Result */}
          <select
            value={resultFilter}
            onChange={e => setResultFilter(e.target.value)}
            className="input-base"
            style={{ width: 'auto', fontSize: '13px', padding: '8px 12px', minWidth: '130px' }}
          >
            <option value="all">All Results</option>
            {['SUCCESS', 'APPROVED', 'FAILED', 'BLOCKED', 'ESCALATED'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Clear */}
          {(search || eventTypeFilter !== 'all' || resultFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setEventTypeFilter('all'); setResultFilter('all'); }}
              className="btn-ghost flex items-center gap-1.5"
              style={{ fontSize: '12px', padding: '8px 12px' }}
            >
              <X size={12} />
              Clear
            </button>
          )}

          {/* Count */}
          <span className="text-[12px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length} of {allLogs.length} events
          </span>
        </div>
      </div>

      {/* ── Audit Table ───────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {['Timestamp', 'Event', 'Actor', 'Case', 'Action', 'Result', 'Detail', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 16px', textAlign: 'left',
                    color: 'var(--color-text-muted)', fontSize: '11px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    backgroundColor: 'var(--color-bg-muted)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    No logs match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((log, idx) => {
                  const cfg = EVENT_CONFIG[log.eventType] || { icon: Info, color: 'var(--color-text-muted)' };
                  const Icon = cfg.icon;
                  const resSty = RESULT_STYLE[log.result] || RESULT_STYLE.PENDING;

                  return (
                    <tr
                      key={log.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onClick={() => setSelectedLog(log)}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
                    >
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <p className="font-mono-data text-[12px]" style={{ color: 'var(--color-text-primary)' }}>
                          {shortTs(log.timestamp)}
                        </p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '2px' }}>
                          {new Date(log.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </p>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${cfg.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={12} style={{ color: cfg.color }} />
                          </div>
                          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, whiteSpace: 'nowrap', fontSize: '12px' }}>
                            {cfg.label || log.eventType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {log.actor}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="font-mono-data text-[12px] font-medium" style={{ color: 'var(--color-brand)' }}>
                          {log.caseId}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                          style={{ backgroundColor: resSty.bg, color: resSty.color, whiteSpace: 'nowrap' }}
                        >
                          {log.result}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '12px', maxWidth: '180px' }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {log.detail}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <ExternalLink size={13} style={{ color: 'var(--color-text-muted)' }} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Drawer */}
      {selectedLog && (
        <AuditDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
