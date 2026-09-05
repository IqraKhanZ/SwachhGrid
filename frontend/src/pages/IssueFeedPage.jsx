import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import IssueCard from '../components/ui/IssueCard';
import api from '../utils/api';
import { Loader2, Plus, Layers, Zap, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SEVERITY_COLORS = { critical: '#F87171', high: '#FACC15', medium: '#FB923C', low: '#22C55E' };

const FILTER_GROUPS = [
  { label: 'All',       cats: [] },
  { label: 'Waste',     cats: ['Illegal Waste Dumping', 'Plastic Pollution', 'Waste Accumulation', 'Lack of Waste Segregation'] },
  { label: 'Water',     cats: ['Water Leakage', 'Water Wastage', 'Drainage Blockage', 'Flood / Waterlogging Risk', 'Sewage Problem'] },
  { label: 'Pollution', cats: ['Open Burning', 'Air Pollution'] },
  { label: 'Greenery',  cats: ['Tree Cutting', 'Damaged Greenery'] },
  { label: 'Energy',    cats: ['Excessive Energy Usage'] },
];

const STATUSES = ['All', 'open', 'in_progress', 'resolved'];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 12);
    }
  }, [center]);
  return null;
}

export default function IssueFeedPage() {
  const navigate = useNavigate();
  const [issues, setIssues]           = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [userLocation, setUserLocation] = useState({ lat: 26.8467, lng: 80.9462 }); // Lucknow default
  const [selectedId, setSelectedId]   = useState(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [activeGroup, setActiveGroup] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy]           = useState('newest');
  const [radius, setRadius]           = useState(0); // 0 = Everywhere / All

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
  }, []);

  // Fetch issues from backend API
  useEffect(() => {
    let cancelled = false;
    const fetchIssues = async () => {
      try {
        const res = await api.get('/api/issues', { params: { limit: 100 } });
        if (!cancelled) setIssues(res.data);
      } catch {}
      if (!cancelled) setLoading(false);
    };
    fetchIssues();
    const interval = setInterval(fetchIssues, 15_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Fetch predictions when toggled
  useEffect(() => {
    if (!showPredictions) return;
    api.get('/api/analytics').then(res => {
      setPredictions(res.data.predictions || []);
    }).catch(() => {});
  }, [showPredictions]);

  // Client-side filter + sort
  const group = FILTER_GROUPS.find(g => g.label === activeGroup);
  const filtered = issues
    .filter(i => group?.cats?.length ? (group.cats.includes(i.category) || group.cats.includes(i.environmental_category)) : true)
    .filter(i => selectedStatus === 'All' || i.status === selectedStatus)
    .filter(i => {
      if (radius === 0) return true; // Show all issues!
      if (!i.location?.lat || !userLocation?.lat) return true;
      return haversine(userLocation.lat, userLocation.lng, i.location.lat, i.location.lng) <= radius * 1000;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'upvotes') return (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
      if (sortBy === 'severity') {
        const o = { critical: 4, high: 3, medium: 2, low: 1 };
        return (o[b.severity] || 2) - (o[a.severity] || 2);
      }
      if (sortBy === 'nearest') {
        const da = a.location?.lat ? haversine(userLocation.lat, userLocation.lng, a.location.lat, a.location.lng) : Infinity;
        const db = b.location?.lat ? haversine(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng) : Infinity;
        return da - db;
      }
      return 0;
    });

  const mapCenter = (filtered.length > 0 && filtered[0].location?.lat)
    ? [filtered[0].location.lat, filtered[0].location.lng]
    : [userLocation.lat, userLocation.lng];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Filter Bar */}
      <div className="bg-surface border-b border-border px-4 py-2 flex items-center gap-3 overflow-x-auto shrink-0">
        {FILTER_GROUPS.map(({ label }) => (
          <button key={label} onClick={() => setActiveGroup(label)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeGroup === label ? 'bg-accent text-bg font-semibold' : 'bg-bg text-muted border border-border hover:border-accent hover:text-accent'
            }`}>{label}</button>
        ))}
        <div className="w-px h-5 bg-border shrink-0" />
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
          className="bg-bg border border-border rounded-lg px-3 py-1 text-xs text-primary focus:border-accent focus:outline-none shrink-0">
          {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-bg border border-border rounded-lg px-3 py-1 text-xs text-primary focus:border-accent focus:outline-none shrink-0">
          <option value="newest">Newest</option>
          <option value="severity">Highest Severity</option>
          <option value="upvotes">Most Upvoted</option>
          <option value="nearest">Nearest</option>
        </select>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted">Radius:</span>
          <select
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            className="bg-bg border border-border rounded-lg px-2.5 py-1 text-xs text-primary focus:border-accent focus:outline-none"
          >
            <option value={0}>All Issues (Everywhere)</option>
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={25}>Within 25 km</option>
            <option value={50}>Within 50 km</option>
          </select>
        </div>
        <button onClick={() => setShowPredictions(!showPredictions)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shrink-0 transition-colors ${
            showPredictions ? 'bg-hotspot/20 text-hotspot border-hotspot/40' : 'bg-bg text-muted border-border hover:border-hotspot hover:text-hotspot'
          }`}>
          <Zap className="w-3 h-3" /> Hotspots
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Issue list */}
        <div className="w-full md:w-[420px] shrink-0 overflow-y-auto border-r border-border bg-bg p-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-primary">No environmental issues found</p>
              <p className="text-xs mt-1">Try adjusting your category or status filters</p>
            </div>
          ) : (
            filtered.map(issue => (
              <div id={`issue-${issue.id}`} key={issue.id}>
                <IssueCard issue={issue} isSelected={selectedId === issue.id}
                  onClick={() => { setSelectedId(issue.id); navigate(`/issues/${issue.id}`); }}
                  userLocation={userLocation} />
              </div>
            ))
          )}
        </div>

        {/* Environmental Map */}
        <div className="flex-1 hidden md:block relative">
          <MapContainer center={mapCenter} zoom={12}
            style={{ width: '100%', height: '100%' }} className="z-0">
            <MapCenterUpdater center={mapCenter} />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ'
              subdomains="abcd" maxZoom={20}
            />
            {filtered.map(issue => {
              if (!issue.location?.lat || !issue.location?.lng) return null;
              const color = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.medium;
              return (
                <CircleMarker key={issue.id} center={[issue.location.lat, issue.location.lng]}
                  radius={10} pathOptions={{ color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.85 }}
                  eventHandlers={{ click: () => { setSelectedId(issue.id); document.getElementById(`issue-${issue.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } }}>
                  <Popup>
                    <div style={{ background: '#122010', color: '#E8F5EA', padding: '10px', borderRadius: '8px', minWidth: '200px', fontFamily: 'Inter, sans-serif' }}>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{issue.title}</p>
                      <p style={{ fontSize: '11px', color: '#6B8E72', marginBottom: '8px' }}>{issue.environmental_category || issue.category}</p>
                      <a href={`/issues/${issue.id}`} style={{ color: '#22C55E', fontSize: '12px', fontWeight: 600 }}>View Details →</a>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
            {showPredictions && predictions.map(pred => {
              if (!pred.location?.lat || !pred.location?.lng) return null;
              return (
                <CircleMarker key={pred.id || pred.wardName} center={[pred.location.lat, pred.location.lng]}
                  radius={16} pathOptions={{ color: '#FB923C', weight: 2, fillColor: '#FB923C', fillOpacity: 0.25, dashArray: '6,4' }}>
                  <Popup>
                    <div style={{ background: '#122010', color: '#E8F5EA', padding: '10px', borderRadius: '8px', fontFamily: 'Inter, sans-serif' }}>
                      <p style={{ fontWeight: 700, color: '#FB923C', fontSize: '12px' }}>⚠️ Environmental Hotspot</p>
                      <p style={{ fontSize: '11px', marginTop: '4px' }}>{pred.predictedCategory}</p>
                      <p style={{ fontSize: '11px', color: '#6B8E72' }}>Risk: {((pred.riskScore || 0) * 100).toFixed(0)}% · {pred.timeframe}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
            <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8}
              pathOptions={{ color: '#22C55E', weight: 3, fillColor: '#22C55E', fillOpacity: 0.5 }}>
              <Popup><span style={{ color: '#22C55E', fontWeight: 600 }}>📍 Your Location</span></Popup>
            </CircleMarker>
          </MapContainer>
        </div>
      </div>

      <button onClick={() => navigate('/report')}
        className="fixed bottom-6 right-24 z-30 w-14 h-14 bg-accent rounded-full shadow-2xl shadow-accent/30 items-center justify-center hover:scale-110 transition-transform hidden md:flex"
        title="Report Environmental Issue">
        <Plus className="w-7 h-7 text-bg" />
      </button>
    </div>
  );
}
