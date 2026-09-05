import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Shield, Star, MapPin, Mail, Phone, Building, Search, Loader2, Award
} from 'lucide-react';

export default function AuthoritiesPage() {
  const { currentUser } = useAuth();
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAuthorities = async () => {
    try {
      const res = await api.get('/api/authorities');
      setAuthorities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const filtered = authorities.filter(a =>
    a.ward_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.authority_name?.toLowerCase().includes(search.toLowerCase()) ||
    (a.area_keywords || []).some(k => k.includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-bold text-primary">Ward Authorities & Public Performance Scorecard</h1>
            </div>
            <p className="text-muted text-sm">
              Public accountability ratings for municipal ward officers and environmental response cells across Lucknow.
            </p>
          </div>
          {currentUser?.role === 'admin' && (
            <Link to="/admin" className="btn-primary text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" /> Admin Console →
            </Link>
          )}
          {currentUser?.role === 'authority' && (
            <Link to="/authority-portal" className="btn-primary text-sm flex items-center gap-2">
              <Building className="w-4 h-4" /> My Ward Portal →
            </Link>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-10"
            placeholder="Search by ward name (e.g. Kalyanpur, Daliganj, Gomti Nagar)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Leaderboard Grid */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No authorities found matching "{search}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((a, idx) => (
              <div key={a.id} className="card hover:border-accent/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center font-bold text-accent text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-primary text-base leading-tight">{a.ward_name} Ward</h3>
                        <p className="text-xs text-muted">{a.authority_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-warning/10 border border-warning/30 text-warning px-2 py-0.5 rounded-full text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{a.rating?.toFixed(1) || '5.0'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted my-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-accent" />
                      <span>{a.department}</span>
                    </div>
                    {a.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-accent" />
                        <span className="truncate">{a.contact_email}</span>
                      </div>
                    )}
                    {a.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-accent" />
                        <span>{a.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-bg rounded-xl border border-border text-center text-xs">
                    <div>
                      <p className="text-muted/70 text-[10px] uppercase font-semibold">Assigned</p>
                      <p className="font-bold text-primary text-sm mt-0.5">{a.total_assigned || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted/70 text-[10px] uppercase font-semibold">Resolved</p>
                      <p className="font-bold text-accent text-sm mt-0.5">{a.total_resolved || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted/70 text-[10px] uppercase font-semibold">Score</p>
                      <p className="font-bold text-secondary text-sm mt-0.5">{a.score || 100}%</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-[11px] text-muted">
                  <span>Jurisdiction: Lucknow Municipal</span>
                  <span className="text-accent font-medium">Response SLA: 72h</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
