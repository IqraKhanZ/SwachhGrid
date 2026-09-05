import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Loader2, Plus, X, Users, Calendar, MapPin, Leaf, TreeDeciduous,
  Recycle, Droplets, Zap, Wind
} from 'lucide-react';
import { formatTimeAgo } from '../utils/date';

const ACTION_ICONS = {
  'Clean-up Drive':                Recycle,
  'Tree Plantation':               Leaf,
  'Recycling Campaign':            Recycle,
  'Waste Segregation Drive':       Recycle,
  'Water Conservation Initiative': Droplets,
  'Anti-Plastic Campaign':         Wind,
  'Community Garden':              Leaf,
  'Energy Conservation Drive':     Zap,
  'Other':                         Leaf,
};

const ACTION_COLORS = {
  'Clean-up Drive':                'bg-accent/10 text-accent border-accent/30',
  'Tree Plantation':               'bg-secondary/10 text-secondary border-secondary/30',
  'Recycling Campaign':            'bg-water/10 text-water border-water/30',
  'Waste Segregation Drive':       'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'Water Conservation Initiative': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Anti-Plastic Campaign':         'bg-hotspot/10 text-hotspot border-hotspot/30',
  'Community Garden':              'bg-eco/10 text-eco border-eco/30',
  'Energy Conservation Drive':     'bg-warning/10 text-warning border-warning/30',
  'Other':                         'bg-muted/10 text-muted border-muted/30',
};

const ACTION_TYPES = [
  'Clean-up Drive', 'Tree Plantation', 'Recycling Campaign', 'Waste Segregation Drive',
  'Water Conservation Initiative', 'Anti-Plastic Campaign', 'Community Garden',
  'Energy Conservation Drive', 'Other',
];

function ActionCard({ action, currentUid, onJoin }) {
  const Icon = ACTION_ICONS[action.action_type] || Leaf;
  const colorClass = ACTION_COLORS[action.action_type] || ACTION_COLORS['Other'];
  const isJoined = action.participants?.includes(currentUid);
  const isFull = (action.participants?.length || 0) >= (action.max_participants || 50);
  const createdAt = action.createdAt ? new Date(action.createdAt) : null;

  return (
    <div className="card hover:border-accent/50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary text-sm">{action.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>{action.action_type}</span>
        </div>
        {action.status === 'completed' && (
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full border border-accent/30">✓ Done</span>
        )}
      </div>

      <p className="text-sm text-muted leading-relaxed mb-3">{action.description}</p>

      <div className="space-y-1.5 text-xs text-muted mb-4">
        {action.location?.address && (
          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-accent" />{action.location.address}</div>
        )}
        {action.scheduled_date && (
          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-accent" />{action.scheduled_date}</div>
        )}
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-accent" />
          {action.participants?.length || 0} / {action.max_participants || 50} participants
        </div>
        {action.createdAt && <div className="text-muted/60">{formatTimeAgo(action.createdAt)}</div>}
      </div>

      {/* Participation progress bar */}
      <div className="w-full bg-bg rounded-full h-1.5 mb-3">
        <div
          className="h-1.5 bg-accent rounded-full transition-all"
          style={{ width: `${Math.min(((action.participants?.length || 0) / (action.max_participants || 50)) * 100, 100)}%` }}
        />
      </div>

      <button
        onClick={() => onJoin(action)}
        disabled={!isJoined && isFull}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
          isJoined
            ? 'bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30'
            : isFull
            ? 'bg-bg text-muted border border-border cursor-not-allowed'
            : 'bg-accent text-bg hover:opacity-90'
        }`}
      >
        {isJoined ? '✓ Joined — Click to Leave' : isFull ? 'Full' : 'Join Activity'}
      </button>
    </div>
  );
}

export default function CommunityActionsPage() {
  const { currentUser } = useAuth();
  const [actions, setActions]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]       = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeType, setActiveType] = useState('All');
  const [form, setForm] = useState({
    title: '', description: '', action_type: ACTION_TYPES[0],
    address: '', scheduled_date: '', max_participants: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  const showToastMsg = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchActions = () => {
    api.get('/api/actions')
      .then(res => { setActions(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchActions();
    const interval = setInterval(fetchActions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleJoin = async (action) => {
    try {
      const res = await api.post(`/api/actions/${action.id}/join`, {});
      showToastMsg(res.data.joined ? 'You joined the activity! +10 eco points 🌱' : 'You left the activity.');
      fetchActions();
    } catch (err) {
      showToastMsg(err.response?.data?.detail || 'Action failed.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/api/actions', {
        title:            form.title,
        description:      form.description,
        action_type:      form.action_type,
        location:         { address: form.address },
        scheduled_date:   form.scheduled_date || null,
        max_participants: Number(form.max_participants),
      });
      setShowCreate(false);
      setForm({ title: '', description: '', action_type: ACTION_TYPES[0], address: '', scheduled_date: '', max_participants: 50 });
      showToastMsg('Activity created! +20 eco points 🌳');
      fetchActions();
    } catch (err) {
      showToastMsg(err.response?.data?.detail || 'Failed to create activity.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = activeType === 'All' ? actions : actions.filter(a => a.action_type === activeType);

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Leaf className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-bold text-primary">Community Environmental Actions</h1>
            </div>
            <p className="text-muted text-sm">Discover and join local sustainability initiatives</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Organise Activity
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['All', ...ACTION_TYPES].map(type => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeType === type ? 'bg-accent text-bg' : 'bg-surface border border-border text-muted hover:border-accent hover:text-accent'
              }`}
            >{type}</button>
          ))}
        </div>

        {/* Actions Grid */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Leaf className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-1">No activities yet</p>
            <p className="text-sm">Be the first to organise a sustainability activity!</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Organise Activity
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                currentUid={currentUser?.id}
                onJoin={handleJoin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-primary">Organise Environmental Activity</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-muted hover:text-primary" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input" placeholder="e.g. Weekend Clean-up Drive at Riverside" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Activity Type</label>
                <select className="input" value={form.action_type} onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))}>
                  {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description *</label>
                <textarea className="input resize-none h-24" placeholder="Describe the activity, what participants will do, what to bring…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="relative">
                <label className="label">Location</label>
                <input className="input" placeholder="Area or address" value={form.address}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, address: val }));
                    if (val.length < 3) {
                      setAddressSuggestions([]);
                      setShowSuggestions(false);
                      return;
                    }
                    if (window.searchTimeout) clearTimeout(window.searchTimeout);
                    window.searchTimeout = setTimeout(async () => {
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5`);
                        const data = await res.json();
                        setAddressSuggestions(data);
                        setShowSuggestions(true);
                      } catch (err) {}
                    }, 500);
                  }} 
                  onFocus={() => { if(addressSuggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {addressSuggestions.map((s, i) => (
                      <div key={i} className="px-3 py-2 text-sm text-primary hover:bg-accent/10 cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm(f => ({ ...f, address: s.display_name }));
                          setShowSuggestions(false);
                        }}>
                        {s.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Scheduled Date (optional)</label>
                  <input type="date" className="input" value={form.scheduled_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Max Participants</label>
                  <input type="number" min="1" max="500" className="input" value={form.max_participants}
                    onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))} />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Leaf className="w-4 h-4" />}
                Create Activity (+20 eco points)
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
