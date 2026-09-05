import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeAgo } from '../utils/date';
import api from '../utils/api';
import {
  Shield, Building, Users, AlertCircle, Plus, Edit2, Trash2,
  CheckCircle, Clock, Star, MapPin, Eye, Search, X, Loader2, Award
} from 'lucide-react';
import { EnvCategoryBadge, SeverityBadge, StatusPill } from '../components/ui/Badges';

export default function AdminDashboardPage() {
  const { currentUser } = useAuth();
  const [authorities, setAuthorities] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('authorities');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAuth, setEditingAuth] = useState(null);
  const [form, setForm] = useState({
    ward_name: '', authority_name: '', department: 'Lucknow Municipal Corporation',
    contact_email: '', phone: '', authority_type: 'Ward Officer', area_keywords: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadData = async () => {
    try {
      const [authRes, issuesRes] = await Promise.all([
        api.get('/api/authorities'),
        api.get('/api/issues?limit=100')
      ]);
      setAuthorities(authRes.data);
      setIssues(issuesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const keywords = form.area_keywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      if (editingAuth) {
        await api.patch(`/api/authorities/${editingAuth.id}`, {
          ward_name: form.ward_name,
          authority_name: form.authority_name,
          department: form.department,
          contact_email: form.contact_email,
          phone: form.phone,
          area_keywords: keywords
        });
        showToast('Authority updated!');
      } else {
        await api.post('/api/authorities', {
          ...form,
          area_keywords: keywords
        });
        showToast('New Authority created!');
      }
      setShowModal(false);
      setEditingAuth(null);
      setForm({ ward_name: '', authority_name: '', department: 'Lucknow Municipal Corporation', contact_email: '', phone: '', authority_type: 'Ward Officer', area_keywords: '' });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this authority from the system?')) return;
    try {
      await api.delete(`/api/authorities/${id}`);
      showToast('Authority deleted.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Delete failed.');
    }
  };

  const openEdit = (a) => {
    setEditingAuth(a);
    setForm({
      ward_name: a.ward_name,
      authority_name: a.authority_name,
      department: a.department || 'Lucknow Municipal Corporation',
      contact_email: a.contact_email || '',
      phone: a.phone || '',
      authority_type: a.authority_type || 'Ward Officer',
      area_keywords: (a.area_keywords || []).join(', ')
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  const totalResolved = issues.filter(i => i.status === 'resolved').length;
  const resolutionRate = issues.length > 0 ? Math.round((totalResolved / issues.length) * 100) : 100;

  const filteredAuths = authorities.filter(a =>
    a.ward_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.authority_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-warning" />
              <h1 className="text-2xl font-bold text-primary">Super Administrator Management Console</h1>
            </div>
            <p className="text-xs text-muted mt-1">
              City-wide municipal governance, authority credential management, and SLA oversight.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAuth(null);
              setForm({ ward_name: '', authority_name: '', department: 'Lucknow Municipal Corporation', contact_email: '', phone: '', authority_type: 'Ward Officer', area_keywords: '' });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Ward Authority
          </button>
        </div>

        {/* System KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card border-border">
            <p className="text-xs text-muted font-medium">Registered Wards</p>
            <p className="text-2xl font-bold text-primary mt-1">{authorities.length}</p>
          </div>
          <div className="card border-border">
            <p className="text-xs text-muted font-medium">Total City Grievances</p>
            <p className="text-2xl font-bold text-primary mt-1">{issues.length}</p>
          </div>
          <div className="card border-border">
            <p className="text-xs text-accent font-medium">Remediations Verified</p>
            <p className="text-2xl font-bold text-accent mt-1">{totalResolved}</p>
          </div>
          <div className="card border-border">
            <p className="text-xs text-secondary font-medium">City Resolution Rate</p>
            <p className="text-2xl font-bold text-secondary mt-1">{resolutionRate}%</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            onClick={() => setTab('authorities')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === 'authorities' ? 'bg-accent text-bg' : 'bg-surface text-muted hover:text-primary'
            }`}
          >
            🏛️ Authority Directory ({authorities.length})
          </button>
          <button
            onClick={() => setTab('issues')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === 'issues' ? 'bg-accent text-bg' : 'bg-surface text-muted hover:text-primary'
            }`}
          >
            📋 City-Wide Issue Log ({issues.length})
          </button>
        </div>

        {tab === 'authorities' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                className="input pl-10"
                placeholder="Filter authorities by ward..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuths.map((a) => (
                <div key={a.id} className="card border-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-primary text-base">{a.ward_name} Ward</h3>
                        <p className="text-xs text-muted">{a.authority_name}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-warning/10 text-warning px-2 py-0.5 rounded-lg text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{a.rating?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted space-y-1 my-3 pt-3 border-t border-border">
                      <p>📧 {a.contact_email || 'N/A'}</p>
                      <p>📞 {a.phone || 'N/A'}</p>
                      <p className="truncate text-muted/70">
                        🏷️ Keywords: {(a.area_keywords || []).join(', ') || 'general'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="text-xs text-muted">
                      Assigned: <span className="font-bold text-primary">{a.total_assigned || 0}</span> | Resolved: <span className="font-bold text-accent">{a.total_resolved || 0}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 text-muted hover:text-accent rounded-lg border border-border"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-muted hover:text-danger rounded-lg border border-border"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map(issue => (
              <div key={issue.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-[240px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-primary text-sm">{issue.title}</span>
                    <EnvCategoryBadge category={issue.environmental_category || issue.category} />
                    <StatusPill status={issue.status} />
                  </div>
                  <p className="text-xs text-muted">{issue.location?.address} • Assigned: <span className="text-accent">{issue.assigned_authority_name || "General Ward"}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{formatTimeAgo(issue.createdAt)}</span>
                  <Link to={`/issues/${issue.id}`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-primary">
                {editingAuth ? 'Edit Ward Authority' : 'Add New Ward Authority'}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted hover:text-primary" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Ward Jurisdiction Name *</label>
                <input
                  className="input"
                  placeholder="e.g. Kalyanpur"
                  value={form.ward_name}
                  onChange={e => setForm(f => ({ ...f, ward_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Officer / Cell Title *</label>
                <input
                  className="input"
                  placeholder="e.g. Kalyanpur Ward Officer"
                  value={form.authority_name}
                  onChange={e => setForm(f => ({ ...f, authority_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  className="input"
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Official Email *</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="ward@lmc.gov.in"
                    value={form.contact_email}
                    onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Helpline Phone</label>
                  <input
                    className="input"
                    placeholder="0522-XXXXXXX"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label">Area Matching Keywords (comma-separated)</label>
                <input
                  className="input"
                  placeholder="kalyanpur, ring road, awadh"
                  value={form.area_keywords}
                  onChange={e => setForm(f => ({ ...f, area_keywords: e.target.value }))}
                />
                <p className="text-[10px] text-muted mt-1">Issues reported with these keywords in their address will auto-assign to this ward.</p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {editingAuth ? 'Save Changes' : 'Create Authority'}
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
