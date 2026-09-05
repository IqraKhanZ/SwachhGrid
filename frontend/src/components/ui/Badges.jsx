import { CheckCircle, XCircle, AlertTriangle, Star, Leaf, Droplets, Flame, Wind, Trash2, TreeDeciduous, Zap } from 'lucide-react';

// ─── Environmental Category Badge ────────────────────────────────────────────
export function EnvCategoryBadge({ category }) {
  const map = {
    'Illegal Waste Dumping':     { color: 'bg-red-500/20 text-red-400 border-red-500/40',    icon: '🗑️' },
    'Plastic Pollution':         { color: 'bg-orange-500/20 text-orange-400 border-orange-500/40', icon: '🧴' },
    'Waste Accumulation':        { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', icon: '♻️' },
    'Water Leakage':             { color: 'bg-water/20 text-water border-water/40',          icon: '💧' },
    'Water Wastage':             { color: 'bg-water/20 text-water border-water/40',          icon: '🚿' },
    'Drainage Blockage':         { color: 'bg-blue-700/20 text-blue-400 border-blue-700/40', icon: '🔵' },
    'Flood / Waterlogging Risk': { color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: '🌊' },
    'Sewage Problem':            { color: 'bg-amber-700/20 text-amber-500 border-amber-700/40', icon: '⚠️' },
    'Open Burning':              { color: 'bg-red-600/20 text-red-400 border-red-600/40',    icon: '🔥' },
    'Air Pollution':             { color: 'bg-gray-500/20 text-gray-400 border-gray-500/40', icon: '🌫️' },
    'Lack of Waste Segregation': { color: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40', icon: '🗂️' },
    'Tree Cutting':              { color: 'bg-green-700/20 text-green-400 border-green-700/40', icon: '🌳' },
    'Damaged Greenery':          { color: 'bg-green-600/20 text-green-400 border-green-600/40', icon: '🌿' },
    'Excessive Energy Usage':    { color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40', icon: '⚡' },
    'Other Environmental Issue': { color: 'bg-muted/20 text-muted border-muted/40',          icon: '🌍' },
  };
  const cfg = map[category] || map['Other Environmental Issue'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cfg.color}`}>
      <span>{cfg.icon}</span> {category || 'Environmental Issue'}
    </span>
  );
}

// ─── Severity Badge ───────────────────────────────────────────────────────────
export function SeverityBadge({ severity }) {
  const map = {
    critical: 'bg-danger/20 text-danger border-danger/40',
    high:     'bg-warning/20 text-warning border-warning/40',
    medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    low:      'bg-accent/20 text-accent border-accent/40',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border font-mono uppercase ${map[severity] || map.medium}`}>
      {severity || 'medium'}
    </span>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
export function StatusPill({ status }) {
  const map = {
    open:        'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-warning/20 text-warning',
    resolved:    'bg-accent/20 text-accent',
    duplicate:   'bg-muted/20 text-muted',
  };
  const labels = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', duplicate: 'Duplicate' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.open}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {labels[status] || status}
    </span>
  );
}

// ─── Eco Points Badge ─────────────────────────────────────────────────────────
export function EcoPointsBadge({ points }) {
  const levels = [
    { min: 1000, label: 'Planet Guardian', color: 'bg-accent/20 text-accent border-accent/40',     icon: '🌍' },
    { min: 600,  label: 'Eco Champion',    color: 'bg-secondary/20 text-secondary border-secondary/40', icon: '🏆' },
    { min: 300,  label: 'Green Guardian',  color: 'bg-eco/20 text-eco border-eco/40',              icon: '🛡️' },
    { min: 100,  label: 'Eco Activist',    color: 'bg-water/20 text-water border-water/40',        icon: '✅' },
    { min: 0,    label: 'Eco Starter',     color: 'bg-muted/20 text-muted border-muted/40',        icon: '🌱' },
  ];
  const level = levels.find(l => points >= l.min) || levels[levels.length - 1];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${level.color}`}>
      {level.icon} {level.label}
    </span>
  );
}

// ─── Sustainability Score Bar ─────────────────────────────────────────────────
export function SustainabilityScoreBar({ score }) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  const label = pct >= 70 ? 'Good' : pct >= 40 ? 'Fair' : 'Poor';
  const color = pct >= 70 ? 'bg-accent' : pct >= 40 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-bg rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-primary shrink-0">{pct.toFixed(0)}</span>
      <span className={`text-xs font-semibold shrink-0 ${pct >= 70 ? 'text-accent' : pct >= 40 ? 'text-warning' : 'text-danger'}`}>{label}</span>
    </div>
  );
}

// ─── Verification Verdict Badge ───────────────────────────────────────────────
export function VerificationVerdictBadge({ verdict }) {
  if (!verdict) return null;
  const map = {
    GENUINE:    { color: 'bg-accent/20 text-accent border-accent/40',     icon: <CheckCircle className="w-3 h-3" /> },
    SUSPICIOUS: { color: 'bg-warning/20 text-warning border-warning/40',  icon: <AlertTriangle className="w-3 h-3" /> },
    FAKE:       { color: 'bg-danger/20 text-danger border-danger/40',     icon: <XCircle className="w-3 h-3" /> },
  };
  const cfg = map[verdict] || map.SUSPICIOUS;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${cfg.color}`}>
      {cfg.icon} {verdict}
    </span>
  );
}

// ─── Hotspot Risk Bar ─────────────────────────────────────────────────────────
export function HotspotRiskBar({ score }) {
  const pct = Math.min(Math.max((score || 0) * 100, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-bg rounded-full h-2">
        <div className="h-2 rounded-full bg-hotspot transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-hotspot shrink-0">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Urgency Badge ────────────────────────────────────────────────────────────
export function UrgencyBadge({ urgency }) {
  const map = {
    immediate:   'bg-danger/20 text-danger border-danger/40',
    short_term:  'bg-warning/20 text-warning border-warning/40',
    long_term:   'bg-accent/20 text-accent border-accent/40',
  };
  const labels = { immediate: 'Immediate', short_term: 'Short-term', long_term: 'Long-term' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${map[urgency] || map.short_term}`}>
      {labels[urgency] || urgency}
    </span>
  );
}
