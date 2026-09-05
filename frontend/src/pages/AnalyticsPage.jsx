import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { HotspotRiskBar, SustainabilityScoreBar } from '../components/ui/Badges';
import { Loader2, TrendingUp, Clock, AlertTriangle, Zap, Leaf, Droplets, Recycle, Activity } from 'lucide-react';

const CHART_THEME = {
  grid:       '#1E3A20',
  text:       '#6B8E72',
  accent:     '#22C55E',
  warning:    '#FACC15',
  danger:     '#F87171',
  hotspot:    '#FB923C',
  water:      '#38BDF8',
  secondary:  '#4ADE80',
};

const STATUS_COLORS = {
  open:        '#38BDF8',
  in_progress: '#FACC15',
  resolved:    '#22C55E',
  duplicate:   '#6B8E72',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border px-3 py-2 rounded-lg text-xs shadow-xl">
      {label && <p className="text-muted mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || CHART_THEME.accent }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics')
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-accent animate-spin" /></div>;
  if (!data)   return <div className="min-h-screen flex items-center justify-center text-muted">Failed to load analytics.</div>;

  const summaryCards = [
    { label: 'Environmental Issues',  value: data.totalOpen,            icon: AlertTriangle, color: 'text-danger' },
    { label: 'Resolved This Week',    value: data.resolvedThisWeek,     icon: TrendingUp,    color: 'text-accent' },
    { label: 'Avg Resolution (hrs)',  value: data.avgResolutionHours || 'N/A', icon: Clock,  color: 'text-warning' },
    { label: 'Most Reported',         value: (data.mostReportedCategory || 'N/A').slice(0, 18), icon: Zap, color: 'text-hotspot' },
  ];

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Leaf className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-primary">Environmental Analytics</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex flex-col gap-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="text-xl font-bold text-primary font-mono truncate">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bar: by environmental category */}
          <div className="card">
            <h2 className="font-semibold text-primary mb-4">Issues by Environmental Category</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.categoryBreakdown?.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                <XAxis dataKey="category" tick={{ fill: CHART_THEME.text, fontSize: 9 }} />
                <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={CHART_THEME.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie: status distribution */}
          <div className="card">
            <h2 className="font-semibold text-primary mb-4">Status Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.statusBreakdown.map(entry => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6B8E72'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line: last 30 days */}
        <div className="card">
          <h2 className="font-semibold text-primary mb-4">Environmental Reports — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.dailySeries} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="date" tick={{ fill: CHART_THEME.text, fontSize: 9 }} tickFormatter={v => v.slice(5)} interval={4} />
              <YAxis tick={{ fill: CHART_THEME.text, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke={CHART_THEME.accent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Severity breakdown */}
        {data.severityBreakdown?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-primary mb-4">Severity Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.severityBreakdown.map(({ severity, count }) => {
                const colors = { critical: 'text-danger border-danger/30', high: 'text-warning border-warning/30', medium: 'text-yellow-400 border-yellow-400/30', low: 'text-accent border-accent/30' };
                return (
                  <div key={severity} className={`p-3 bg-bg rounded-xl border text-center ${colors[severity] || ''}`}>
                    <p className="text-2xl font-bold font-mono">{count}</p>
                    <p className="text-xs capitalize mt-1">{severity}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Community Sustainability Scores */}
        {data.sustainabilityScores?.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="w-5 h-5 text-accent" />
              <h2 className="font-semibold text-primary">Community Sustainability Scores</h2>
              <span className="text-xs text-muted ml-auto">Higher = Better sustainability</span>
            </div>
            <div className="space-y-3">
              {data.sustainabilityScores.map((s, i) => (
                <div key={s.id || i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted w-4">{i + 1}</span>
                  <span className="text-sm text-primary flex-1">{s.ward || 'Unknown Area'}</span>
                  <div className="w-48">
                    <SustainabilityScoreBar score={s.score} />
                  </div>
                  <span className="text-xs text-muted ml-2">({s.resolved}/{s.totalIssues} resolved)</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted mt-4 italic">
              * Score is based on issue resolution rate and open issues in the area. 
              Not a direct carbon-footprint measurement.
            </p>
          </div>
        )}

        {/* Environmental Hotspot Predictions */}
        {data.predictions?.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-hotspot" />
              <h2 className="font-semibold text-primary">Environmental Hotspot Predictions</h2>
            </div>
            <div className="space-y-4">
              {data.predictions.map((pred, i) => (
                <div key={pred.id || i} className="p-3 bg-bg rounded-xl border border-hotspot/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted">#{i + 1}</span>
                      <span className="text-sm text-primary font-medium">{pred.predictedCategory}</span>
                      <span className="text-xs text-muted">{pred.location?.address || pred.wardName}</span>
                    </div>
                    <span className="text-xs text-hotspot font-mono">within {pred.timeframe}</span>
                  </div>
                  <HotspotRiskBar score={pred.riskScore} />
                  {pred.factors && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {pred.factors.weatherFactor > 0 && (
                        <span className="text-xs bg-water/10 text-water px-2 py-0.5 rounded-full">
                          🌧 Weather +{(pred.factors.weatherFactor * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className="text-xs bg-muted/10 text-muted px-2 py-0.5 rounded-full">
                        🏗 Infrastructure ×{pred.factors.infrastructureAgeFactor}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Areas */}
        {data.topAreas?.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-primary mb-4">Top 5 Areas by Environmental Issues</h2>
            <div className="space-y-3">
              {data.topAreas.map(({ area, count }, i) => (
                <div key={area} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted w-4">{i + 1}</span>
                  <span className="text-sm text-primary flex-1">{area || 'Unknown'}</span>
                  <span className="text-xs font-mono text-accent">{count}</span>
                  <div className="w-24 bg-bg rounded-full h-1.5">
                    <div className="h-1.5 bg-accent rounded-full" style={{ width: `${(count / (data.topAreas[0]?.count || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Alerts */}
        {data.verificationAlerts?.length > 0 && (
          <div className="card border-warning/20">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <h2 className="font-semibold text-primary">Verification Alerts</h2>
              <span className="ml-auto text-xs font-mono text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                {data.verificationAlerts.length} flagged
              </span>
            </div>
            <div className="space-y-2">
              {data.verificationAlerts.map(issue => (
                <div key={issue.id} className="p-3 bg-bg rounded-xl border border-border text-sm">
                  <p className="font-medium text-primary">{issue.title}</p>
                  <p className="text-xs text-muted">{issue.environmental_category || issue.category} · {issue.location?.address?.slice(0, 40)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
