/**
 * StatusBadge — unified status pill used across recovery cases, transactions, etc.
 *
 * Props:
 *   status  (string) — key from STATUS_MAP
 *   size    ('sm' | 'md')
 */
const STATUS_MAP = {
  // Recovery case statuses
  recovered:   { label: 'Recovered',   cls: 'badge-success' },
  failed:      { label: 'Failed',       cls: 'badge-danger'  },
  executing:   { label: 'Executing',    cls: 'badge-info'    },
  pending:     { label: 'Pending',      cls: 'badge-warning' },
  analyzing:   { label: 'Analyzing',    cls: 'badge-info'    },
  escalated:   { label: 'Escalated',    cls: 'badge-warning' },
  approved:    { label: 'Approved',     cls: 'badge-success' },
  blocked:     { label: 'Blocked',      cls: 'badge-danger'  },
  stopped:     { label: 'Stopped',      cls: 'badge-danger'  },
  // Transaction statuses
  success:     { label: 'Success',      cls: 'badge-success' },
  refunded:    { label: 'Refunded',     cls: 'badge-warning' },
  // Agent statuses
  online:      { label: 'Online',       cls: 'badge-success' },
  processing:  { label: 'Processing',   cls: 'badge-info'    },
  idle:        { label: 'Idle',         cls: 'badge-warning' },
  error:       { label: 'Error',        cls: 'badge-danger'  },
  offline:     { label: 'Offline',      cls: 'badge-danger'  },
  // Generic
  in_progress: { label: 'In Progress',  cls: 'badge-info'    },
  active:      { label: 'Active',       cls: 'badge-info'    },
};

export default function StatusBadge({ status, size = 'md' }) {
  const { label, cls } = STATUS_MAP[status] || { label: status, cls: '' };
  return (
    <span className={`badge ${cls} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
      {label}
    </span>
  );
}
