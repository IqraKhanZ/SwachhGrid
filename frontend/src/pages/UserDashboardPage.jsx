import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { EcoPointsBadge, EnvCategoryBadge, StatusPill } from '../components/ui/Badges';
import { format } from 'date-fns';
import { formatTimeAgo } from '../utils/date';
import {
  FileText, Heart, Leaf, AlertTriangle, RefreshCw,
  Mail, Loader2, Star, Zap
} from 'lucide-react';
import api from '../utils/api';

const NOTIF_ICONS = {
  upvote:                Heart,
  status_update:         RefreshCw,
  complaint_letter_sent: Mail,
  verification_failed:   AlertTriangle,
};

const LEVELS = [
  { min: 1000, label: 'Planet Guardian', next: Infinity },
  { min: 600,  label: 'Eco Champion',    next: 1000 },
  { min: 300,  label: 'Green Guardian',  next: 600 },
  { min: 100,  label: 'Eco Activist',    next: 300 },
  { min: 0,    label: 'Eco Starter',     next: 100 },
];

export default function UserDashboardPage() {
  const { currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [myIssues, setMyIssues]     = useState([]);
  const [notifications, setNotifs]  = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    // Refresh user profile from backend to get latest ecoPoints
    refreshUser?.();

    Promise.all([
      api.get('/api/issues/mine'),
      api.get('/api/notifications'),
    ]).then(([issuesRes, notifsRes]) => {
      setMyIssues(issuesRes.data || []);
      setNotifs(notifsRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [currentUser]);

  const ecoPoints   = currentUser?.ecoPoints || 0;
  const level       = LEVELS.find(l => ecoPoints >= l.min) || LEVELS[LEVELS.length - 1];
  const progressPct = level.next === Infinity
    ? 100
    : Math.min(((ecoPoints - level.min) / (level.next - level.min)) * 100, 100);

  const totalUpvotes = myIssues.reduce((sum, i) => sum + (i.upvotes?.length || 0), 0);
  const resolved     = myIssues.filter(i => i.status === 'resolved').length;

  const statCards = [
    { label: 'Reports Filed',     value: myIssues.length, icon: FileText, color: 'text-accent' },
    { label: 'Issues Resolved',   value: resolved,        icon: Leaf,     color: 'text-secondary' },
    { label: 'Community Support', value: totalUpvotes,    icon: Heart,    color: 'text-danger' },
    { label: 'Eco Points',        value: ecoPoints,       icon: Star,     color: 'text-warning' },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-accent animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
            <Leaf className="w-7 h-7 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">My Eco Dashboard</h1>
            <p className="text-muted text-sm">Welcome back, {currentUser?.displayName || 'Eco Citizen'} 🌱</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex flex-col gap-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="text-2xl font-bold text-primary font-mono">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>

        {/* Eco Points Progress */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-primary">Eco Level</h2>
            <EcoPointsBadge points={ecoPoints} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted">
              <span>{ecoPoints} eco points</span>
              {level.next !== Infinity && <span>{level.next} for next level</span>}
            </div>
            <div className="w-full bg-bg rounded-full h-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-accent to-secondary transition-all duration-700"
                style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
            <p className="text-xs text-muted">
              🌱 <strong className="text-accent">+10 pts</strong> for reporting ·
              <strong className="text-accent"> +15 pts</strong> for verifying ·
              <strong className="text-accent"> +20 pts</strong> for organising actions ·
              <strong className="text-accent"> +25 pts</strong> for genuine resolutions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* My Reports */}
          <div className="lg:col-span-2 card">
            <h2 className="font-semibold text-primary mb-4">My Environmental Reports ({myIssues.length})</h2>
            {myIssues.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No reports yet</p>
                <button onClick={() => navigate('/report')} className="btn-primary text-sm mt-3 px-4 py-2">
                  Report an Environmental Issue
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted border-b border-border">
                      <th className="pb-2 font-medium">Issue</th>
                      <th className="pb-2 font-medium hidden md:table-cell">Category</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium hidden md:table-cell">Letter</th>
                      <th className="pb-2 font-medium text-center">👍</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myIssues.map(issue => (
                      <tr key={issue.id} onClick={() => navigate(`/issues/${issue.id}`)}
                        className="border-b border-border/50 hover:bg-surface cursor-pointer transition-colors">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-primary line-clamp-1">{issue.title}</p>
                          {issue.createdAt && (
                            <p className="text-xs text-muted">{format(new Date(issue.createdAt), 'dd MMM yyyy')}</p>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 hidden md:table-cell">
                          <EnvCategoryBadge category={issue.environmental_category || issue.category} />
                        </td>
                        <td className="py-2.5 pr-3"><StatusPill status={issue.status} /></td>
                        <td className="py-2.5 pr-3 hidden md:table-cell">
                          <span className={`text-xs font-semibold ${issue.complaintLetterSent ? 'text-accent' : 'text-muted'}`}>
                            {issue.complaintLetterSent ? '✓ Sent' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-muted text-xs font-mono">{issue.upvotes?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="card">
            <h2 className="font-semibold text-primary mb-4">Activity Feed</h2>
            {notifications.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map(notif => {
                  const Icon = NOTIF_ICONS[notif.type] || Zap;
                  const ts   = notif.createdAt ? new Date(notif.createdAt) : null;
                  return (
                    <div key={notif.id}
                      className={`flex gap-3 p-2.5 rounded-lg ${!notif.read ? 'border-l-2 border-l-accent bg-accent/5' : ''}`}>
                      <Icon className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                      <div>
                        <p className={`text-xs leading-snug ${notif.read ? 'text-muted' : 'text-primary'}`}>{notif.message}</p>
                        {notif.createdAt && <p className="text-xs text-muted/60 mt-0.5">{formatTimeAgo(notif.createdAt)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
