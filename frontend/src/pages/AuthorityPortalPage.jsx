import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadToCloudinary } from '../utils/cloudinary';
import { formatTimeAgo } from '../utils/date';
import api from '../utils/api';
import {
  Shield, Building, Star, CheckSquare, Clock, AlertTriangle,
  Upload, Loader2, X, MapPin, Eye, CheckCircle, Flame, Droplets, Trash2
} from 'lucide-react';
import { EnvCategoryBadge, SeverityBadge, StatusPill } from '../components/ui/Badges';

export default function AuthorityPortalPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [resolveModalIssue, setResolveModalIssue] = useState(null);
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchPortalData = async () => {
    try {
      const res = await api.get('/api/authorities/my-portal');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvePhoto) {
      showToast('Please select a remediation photo.');
      return;
    }
    setSubmitting(true);
    try {
      const photoUrl = await uploadToCloudinary(resolvePhoto);
      const res = await api.post(`/api/issues/${resolveModalIssue.id}/resolve`, {
        resolution_photo_url: photoUrl,
        notes: resolveNotes
      });
      showToast(res.data.message || 'Issue resolved!');
      setResolveModalIssue(null);
      setResolvePhoto(null);
      setResolveNotes('');
      fetchPortalData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to submit resolution.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const auth = data?.authority || {};
  const stats = data?.stats || {};
  const issues = data?.issues || [];

  const filteredIssues = filterStatus === 'all'
    ? issues
    : issues.filter(i => i.status === filterStatus);

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Ward Header Card */}
        <div className="card bg-surface border-accent/30 relative overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                <Building className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-primary">{auth.ward_name || "Kalyanpur"} Ward Authority Portal</h1>
                  <span className="text-xs bg-accent/10 border border-accent/30 text-accent px-2.5 py-0.5 rounded-full font-semibold">
                    Official Officer Console
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {auth.department || "Lucknow Municipal Corporation"} • Officer: {currentUser?.displayName || auth.authority_name}
                </p>
              </div>
            </div>
            {/* Rating badge */}
            <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 px-3.5 py-2 rounded-xl text-warning">
              <Star className="w-5 h-5 fill-current" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ward Rating</p>
                <p className="text-lg font-bold text-primary leading-none">{auth.rating?.toFixed(1) || '5.0'} / 5.0</p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border">
            <div className="p-3 bg-bg rounded-xl border border-border">
              <p className="text-xs text-muted">Total Assigned</p>
              <p className="text-2xl font-bold text-primary mt-1">{stats.total || 0}</p>
            </div>
            <div className="p-3 bg-bg rounded-xl border border-border">
              <p className="text-xs text-warning">Pending Remediation</p>
              <p className="text-2xl font-bold text-warning mt-1">{stats.open || 0}</p>
            </div>
            <div className="p-3 bg-bg rounded-xl border border-border">
              <p className="text-xs text-accent">Resolved Proofs</p>
              <p className="text-2xl font-bold text-accent mt-1">{stats.resolved || 0}</p>
            </div>
            <div className="p-3 bg-bg rounded-xl border border-border">
              <p className="text-xs text-secondary">Efficiency Score</p>
              <p className="text-2xl font-bold text-secondary mt-1">{auth.score || 100}%</p>
            </div>
          </div>
        </div>

        {/* Action / Filter bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {[
              { id: 'all', label: `All Complaints (${issues.length})` },
              { id: 'open', label: `Open (${stats.open || 0})` },
              { id: 'resolved', label: `Resolved (${stats.resolved || 0})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === f.id
                    ? 'bg-accent text-bg font-semibold'
                    : 'bg-surface border border-border text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Complaints Table / List */}
        {filteredIssues.length === 0 ? (
          <div className="card text-center py-16 text-muted">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-accent opacity-30" />
            <p className="text-base font-semibold text-primary">No issues found in this filter.</p>
            <p className="text-xs mt-1">All clean! Any new issues reported in your ward will appear here instantly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map(issue => {
              const isUrgent = issue.severity === 'critical' || issue.severity === 'high';
              return (
                <div
                  key={issue.id}
                  className={`card border transition-all ${
                    issue.status === 'open' && isUrgent
                      ? 'border-danger/40 bg-danger/5'
                      : 'border-border hover:border-accent/40'
                  }`}
                >
                  <div className="flex flex-wrap md:flex-nowrap gap-4 items-start">
                    {/* Thumbnail */}
                    <div className="w-full md:w-36 h-28 bg-bg rounded-xl overflow-hidden shrink-0 border border-border">
                      {issue.mediaUrls?.[0] ? (
                        <img src={issue.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted text-xs">No Photo</div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-primary text-base leading-tight">{issue.title}</h3>
                        <EnvCategoryBadge category={issue.environmental_category || issue.category} />
                        <SeverityBadge severity={issue.severity} />
                        <StatusPill status={issue.status} />
                        {isUrgent && issue.status === 'open' && (
                          <span className="text-[10px] bg-danger text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                            ⚠️ SLA Urgent Action Required
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted line-clamp-2">{issue.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted/80 pt-1">
                        {issue.location?.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-accent" />
                            <span>{issue.location.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          <span>Reported {formatTimeAgo(issue.createdAt)}</span>
                        </div>
                      </div>

                      {issue.environmental_impact && (
                        <p className="text-[11px] text-accent/90 italic mt-1">
                          Impact: {issue.environmental_impact}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0 self-center w-full md:w-auto">
                      <Link
                        to={`/issues/${issue.id}`}
                        className="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2 px-3"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Public Issue
                      </Link>
                      {issue.status !== 'resolved' ? (
                        <button
                          onClick={() => setResolveModalIssue(issue)}
                          className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2 px-3"
                        >
                          <CheckSquare className="w-3.5 h-3.5" /> Remediate & Upload Proof
                        </button>
                      ) : (
                        <span className="text-xs text-accent bg-accent/10 border border-accent/30 py-1.5 px-3 rounded-lg text-center font-semibold">
                          ✓ Remediated & Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Resolution Modal */}
      {resolveModalIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="font-semibold text-primary flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-accent" /> Officer Remediation Submission
                </h2>
                <p className="text-xs text-muted">Upload post-cleanup proof for AI verification</p>
              </div>
              <button onClick={() => setResolveModalIssue(null)}><X className="w-5 h-5 text-muted hover:text-primary" /></button>
            </div>
            <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-bg rounded-xl border border-border text-xs">
                <p className="font-semibold text-primary">{resolveModalIssue.title}</p>
                <p className="text-muted mt-0.5">{resolveModalIssue.location?.address}</p>
              </div>

              <div>
                <label className="label">Remediation Photo (After Cleanup) *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setResolvePhoto(e.target.files[0])}
                  className="input file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-bg cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="label">Officer Notes & Actions Taken</label>
                <textarea
                  className="input resize-none h-20"
                  placeholder="e.g. Cleared 2 metric tonnes of solid waste, repaired storm drain, disinfected road."
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {submitting ? 'Running AI Before/After Verification...' : 'Submit Resolution & Update Ward Score'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 bg-surface border border-accent/30 text-accent text-sm px-4 py-2.5 rounded-xl shadow-lg animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
