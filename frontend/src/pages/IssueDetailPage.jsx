import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadToCloudinary } from '../utils/cloudinary';
import { formatTimeAgo, parseSafeDate } from '../utils/date';
import api from '../utils/api';
import {
  EnvCategoryBadge, SeverityBadge, StatusPill,
  UrgencyBadge, VerificationVerdictBadge
} from '../components/ui/Badges';
import { format } from 'date-fns';
import {
  Heart, Shield, MapPin, Building2, ChevronLeft, ChevronRight,
  X, Upload, Loader2, Send, User, Leaf, AlertTriangle, CheckCircle,
  Lightbulb, Recycle, Mail, Star, Phone, ShieldCheck, CheckSquare
} from 'lucide-react';

const STATUS_STEPS  = ['open', 'in_progress', 'resolved'];
const STATUS_LABELS = { open: 'Reported', in_progress: 'In Progress', resolved: 'Resolved' };

export default function IssueDetailPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [issue, setIssue]                     = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [comments, setComments]               = useState([]);
  const [commentText, setCommentText]         = useState('');
  const [commentLoading, setCommentLoading]   = useState(false);
  const [currentImg, setCurrentImg]           = useState(0);
  const [lightbox, setLightbox]               = useState(false);
  const [resolveModal, setResolveModal]       = useState(false);
  const [resolvePhoto, setResolvePhoto]       = useState(null);
  const [resolveNotes, setResolveNotes]       = useState('');
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [toast, setToast]                     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchIssue = async () => {
    try {
      const res = await api.get(`/api/issues/${id}`);
      setIssue(res.data);
    } catch { navigate('/'); }
    setLoading(false);
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/api/issues/${id}/comments`);
      setComments(res.data);
    } catch {}
  };

  useEffect(() => { fetchIssue(); fetchComments(); }, [id]);

  const isUpvoted   = issue?.upvotes?.includes(currentUser?.id);
  const isSupported = issue?.supporters?.includes(currentUser?.id);
  const isVerified  = issue?.verifiedBy?.includes(currentUser?.id);

  const handleUpvote = async () => {
    try {
      await api.post(`/api/issues/${id}/upvote`);
      fetchIssue();
      showToast(isUpvoted ? 'Upvote removed' : 'Upvoted!');
    } catch {}
  };

  const handleSupport = async () => {
    try {
      await api.post(`/api/issues/${id}/support`);
      fetchIssue();
      showToast(isSupported ? 'Support removed' : 'You are now supporting this issue!');
    } catch {}
  };

  const handleVerify = async () => {
    if (isVerified) return;
    try {
      await api.post(`/api/issues/${id}/verify`);
      fetchIssue();
      showToast('Issue verified! +15 eco points');
    } catch {}
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvePhoto) {
      showToast('Please select a resolution photo.');
      return;
    }
    setResolveSubmitting(true);
    try {
      const photoUrl = await uploadToCloudinary(resolvePhoto);
      const res = await api.post(`/api/issues/${id}/resolve`, {
        resolution_photo_url: photoUrl,
        notes: resolveNotes
      });
      showToast(res.data.message || 'Issue updated!');
      setResolveModal(false);
      fetchIssue();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to submit resolution.');
    } finally {
      setResolveSubmitting(false);
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await api.post(`/api/issues/${id}/comments`, { text: commentText.trim() });
      setCommentText('');
      fetchComments();
    } catch {
      showToast('Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!issue) return null;

  const media = issue.mediaUrls?.length ? issue.mediaUrls : [];
  const recs = issue.sustainability_recs || {};
  const stepIndex = STATUS_STEPS.indexOf(issue.status);
  const createdDate = issue.createdAt ? parseSafeDate(issue.createdAt) : null;

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Eco Map
        </Link>

        {/* Media gallery */}
        {media.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-surface border border-border h-72 md:h-96">
            <img
              src={media[currentImg]}
              alt={issue.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightbox(true)}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop&q=80";
              }}
            />
            {media.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImg(i => (i - 1 + media.length) % media.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentImg(i => (i + 1) % media.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-y-1/2 flex gap-1.5">
                  {media.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImg(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === currentImg ? 'bg-accent w-5' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Main info */}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <h1 className="text-xl md:text-2xl font-bold text-primary flex-1">{issue.title}</h1>
            <div className="flex flex-wrap gap-2">
              <EnvCategoryBadge category={issue.environmental_category || issue.category} />
              <SeverityBadge severity={issue.severity} />
              <StatusPill status={issue.status} />
              {issue.urgency && <UrgencyBadge urgency={issue.urgency} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs mt-2">
            {issue.location?.address && <div className="flex items-center gap-2 text-muted"><MapPin className="w-4 h-4 text-accent" /><span>{issue.location.address}</span></div>}
            {issue.department && <div className="flex items-center gap-2 text-muted"><Building2 className="w-4 h-4 text-accent" /><span>{issue.department}</span></div>}
            {createdDate && <p className="text-muted text-xs">{format(createdDate, 'dd MMM yyyy, HH:mm')} ({formatTimeAgo(issue.createdAt)})</p>}
          </div>
          <p className="mt-4 text-sm text-primary/80 leading-relaxed">{issue.description}</p>
          <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-border items-center">
            <button onClick={handleUpvote}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isUpvoted ? 'bg-danger/20 text-danger border border-danger/40' : 'bg-surface border border-border text-muted hover:border-danger hover:text-danger'}`}>
              <Heart className={`w-4 h-4 ${isUpvoted ? 'fill-current' : ''}`} />
              <span>{issue.upvotes?.length || 0}</span>
            </button>
            <button onClick={handleSupport}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSupported ? 'bg-accent/20 text-accent border border-accent/40' : 'bg-surface border border-border text-muted hover:border-accent hover:text-accent'}`}>
              <Leaf className="w-4 h-4" />
              <span>{isSupported ? 'Supporting' : 'Support'} ({issue.supporters?.length || 0})</span>
            </button>
            <button onClick={handleVerify} disabled={isVerified}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isVerified ? 'bg-water/20 text-water border border-water/40 cursor-default' : 'bg-surface border border-border text-muted hover:border-water hover:text-water'}`}>
              <Shield className="w-4 h-4" />
              <span>{isVerified ? 'Verified' : 'Verify'} ({issue.verifiedBy?.length || 0})</span>
            </button>
            {issue.status !== 'resolved' && (
              <button onClick={() => setResolveModal(true)}
                className="btn-primary text-sm flex items-center gap-2 py-2 px-4">
                <CheckSquare className="w-4 h-4" /> Mark Resolved (Upload Proof)
              </button>
            )}
            <span className="font-mono text-xs text-muted/60 ml-auto self-center">#{id.slice(-8)}</span>
          </div>
        </div>

        {/* Assigned Ward Authority Card */}
        <div className="card border-accent/30 bg-surface">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <h2 className="font-semibold text-primary">Assigned Ward Authority</h2>
            </div>
            <span className="text-xs bg-accent/10 border border-accent/30 text-accent px-2.5 py-1 rounded-full font-medium">
              ✅ Auto-Notified (Demo Mode)
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Ward Authority</p>
              <p className="text-primary font-medium text-base">{issue.assigned_authority_name || "Lucknow Ward Authority"}</p>
              <p className="text-xs text-muted mt-0.5">{issue.assigned_ward ? `${issue.assigned_ward} Ward` : "Lucknow Municipal Corporation"}</p>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2 text-muted">
                <Mail className="w-3.5 h-3.5 text-accent" />
                <span>{issue.departmentEmail || "ward.officer@lmc.gov.in"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Phone className="w-3.5 h-3.5 text-accent" />
                <span>0522-2301001 (Helpline)</span>
              </div>
              <div className="flex items-center gap-1.5 text-warning mt-1">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-semibold text-primary">4.8 / 5.0 Authority Rating</span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-bg border border-border rounded-xl flex items-center justify-between text-xs text-muted">
            <span>📢 Official grievance reference dispatched to municipal cell. Response SLA: 72 hours.</span>
            <Link to="/authorities" className="text-accent hover:underline font-medium shrink-0 ml-2">
              View Ward Leaderboard →
            </Link>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="card border-accent/20 bg-accent/5">
          <div className="flex items-center gap-2 mb-3"><Leaf className="w-5 h-5 text-accent" /><h2 className="font-semibold text-accent">Environmental Impact</h2></div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Impact Analysis</p>
              <p className="text-primary/80 leading-relaxed">
                {issue.environmental_impact || "Accumulation of unmanaged waste and environmental degradation threatens local biodiversity, soil quality, and public health."}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Recommended Remediation</p>
              <p className="text-primary/80 leading-relaxed">
                {issue.recommended_action || `Dispatched notification to ${issue.assigned_authority_name || "Ward Authority"} for immediate site inspection and remediation.`}
              </p>
            </div>
            {issue.sustainability_tip && (
              <div className="flex items-start gap-2 bg-bg rounded-lg p-3 border border-border">
                <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-muted">{issue.sustainability_tip}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sustainability Recommendations */}
        {recs.immediate_actions?.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4"><Recycle className="w-5 h-5 text-secondary" /><h2 className="font-semibold text-primary">Sustainable Action Advisor</h2></div>
            <div className="grid md:grid-cols-2 gap-4">
              {recs.immediate_actions?.length > 0 && <div><p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Immediate Actions</p><ul className="space-y-1.5">{recs.immediate_actions.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm text-primary/80"><span className="text-accent shrink-0 mt-0.5">•</span>{a}</li>)}</ul></div>}
              {recs.community_actions?.length > 0 && <div><p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Community Actions</p><ul className="space-y-1.5">{recs.community_actions.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm text-primary/80"><span className="text-secondary shrink-0 mt-0.5">•</span>{a}</li>)}</ul></div>}
              {recs.prevention_tips?.length > 0 && <div><p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Prevention Tips</p><ul className="space-y-1.5">{recs.prevention_tips.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm text-primary/80"><span className="text-warning shrink-0 mt-0.5">•</span>{a}</li>)}</ul></div>}
              {recs.sustainability_habits?.length > 0 && <div><p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Daily Habits</p><ul className="space-y-1.5">{recs.sustainability_habits.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm text-primary/80"><span className="text-eco shrink-0 mt-0.5">•</span>{a}</li>)}</ul></div>}
            </div>
            {recs.impact_statement && <div className="mt-4 p-3 bg-accent/5 border border-accent/20 rounded-lg"><p className="text-sm text-accent font-medium">{recs.impact_statement}</p></div>}
          </div>
        )}

        {/* Status Timeline */}
        <div className="card">
          <h2 className="font-semibold text-primary mb-4">Status Timeline</h2>
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i <= stepIndex ? 'bg-accent border-accent text-bg' : 'bg-bg border-border text-muted'}`}>
                    {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-xs text-muted mt-1">{STATUS_LABELS[step]}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < stepIndex ? 'bg-accent' : 'bg-border'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Before/After Resolution Verification */}
        {(issue.resolution_photo_url || issue.afterRepairUrl) && (
          <div className="card border-accent/30 bg-surface">
            <h2 className="font-semibold text-primary mb-3">Environmental Remediation Verified Proof</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-muted mb-1 font-semibold">Reported Issue (Before)</p>
                <img src={issue.mediaUrls?.[0]} alt="Before" className="w-full h-40 object-cover rounded-xl border border-border" />
              </div>
              <div>
                <p className="text-xs text-accent mb-1 font-semibold">Remediation Proof (After)</p>
                <img src={issue.resolution_photo_url || issue.afterRepairUrl} alt="After" className="w-full h-40 object-cover rounded-xl border border-accent/40" />
              </div>
            </div>
            {issue.resolution_verification && (
              <div className="p-3 bg-bg rounded-xl border border-border text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-accent">AI Verification: {issue.resolution_verification.verdict}</span>
                  <span className="text-muted">| Score: {((issue.resolution_verification.environmental_improvement_score || 0.85) * 100).toFixed(0)}%</span>
                </div>
                <p className="text-muted">{issue.resolution_verification.reasoning}</p>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <div className="card">
          <h2 className="font-semibold text-primary mb-4">Community Discussion ({comments.length})</h2>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {comments.length === 0 && <p className="text-muted text-sm">No comments yet.</p>}
            {comments.map(c => {
              return (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 bg-accent/20 rounded-full flex items-center justify-center shrink-0"><User className="w-4 h-4 text-accent" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{c.authorName}</span>
                      <span className="text-xs text-muted">{formatTimeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-primary/80 mt-0.5">{c.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1 text-sm" placeholder="Share your thoughts…" value={commentText}
              onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()} />
            <button onClick={submitComment} disabled={commentLoading || !commentText.trim()} className="btn-primary px-3 py-2">
              {commentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-accent" /> Submit Resolution Proof
              </h2>
              <button onClick={() => setResolveModal(false)}><X className="w-5 h-5 text-muted hover:text-primary" /></button>
            </div>
            <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
              <p className="text-xs text-muted">
                Upload a photo showing that the issue has been remediated. Our AI will compare this photo with the original to verify the cleanup.
              </p>
              <div>
                <label className="label">Remediation Photo (After) *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setResolvePhoto(e.target.files[0])}
                  className="input file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-bg cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="label">Resolution Notes / Details</label>
                <textarea
                  className="input resize-none h-20"
                  placeholder="e.g. Ward sanitation team cleared the garbage and disinfected the area."
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={resolveSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {resolveSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {resolveSubmitting ? 'Verifying with AI...' : 'Verify & Mark Resolved'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <img src={media[currentImg]} alt="Full" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white/70 hover:text-white"><X className="w-8 h-8" /></button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 right-6 z-50 bg-surface border border-accent/30 text-accent text-sm px-4 py-2.5 rounded-xl shadow-lg animate-slide-up">{toast}</div>
      )}
    </div>
  );
}
