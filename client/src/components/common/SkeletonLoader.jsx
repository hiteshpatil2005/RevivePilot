/**
 * SkeletonLoader — reusable loading skeleton shapes.
 *
 * Usage:
 *   <SkeletonLoader.Card />           — metric card skeleton
 *   <SkeletonLoader.Table rows={5} /> — table row skeleton
 *   <SkeletonLoader.Chart />          — chart area skeleton
 *   <SkeletonLoader.Line width="60%"/> — single text line
 */

const pulse = {
  background: 'linear-gradient(90deg, var(--color-bg-muted) 25%, var(--color-bg-hover) 50%, var(--color-bg-muted) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  borderRadius: '6px',
};

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
  const style = document.createElement('style');
  style.id = 'skeleton-style';
  style.textContent = `
    @keyframes skeleton-pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

function Line({ width = '100%', height = '14px', style = {} }) {
  return <div style={{ ...pulse, width, height, ...style }} />;
}

function Card() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Line width="60%" height="12px" />
        <div style={{ ...pulse, width: 28, height: 28, borderRadius: '8px' }} />
      </div>
      <Line width="45%" height="28px" />
      <Line width="70%" height="11px" />
    </div>
  );
}

function Table({ rows = 5 }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-3"
        style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}
      >
        {[60, 100, 80, 60, 80, 60].map((w, i) => (
          <Line key={i} width={`${w}px`} height="11px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderBottom: i < rows - 1 ? '1px solid var(--color-border)' : 'none' }}
        >
          <Line width="80px" height="13px" />
          <Line width="120px" height="13px" />
          <Line width="70px" height="13px" />
          <Line width="60px" height="20px" style={{ borderRadius: '99px' }} />
          <Line width="90px" height="13px" />
          <Line width="60px" height="20px" style={{ borderRadius: '99px' }} />
        </div>
      ))}
    </div>
  );
}

function Chart() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <Line width="140px" height="16px" />
          <Line width="200px" height="12px" />
        </div>
        <Line width="80px" height="32px" style={{ borderRadius: '8px' }} />
      </div>
      <div style={{ ...pulse, height: '240px', width: '100%', borderRadius: '10px' }} />
    </div>
  );
}

function MetricGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

const SkeletonLoader = { Line, Card, Table, Chart, MetricGrid };
export { Line, Card, Table, Table as SkeletonTable, Chart, MetricGrid };
export default SkeletonLoader;
