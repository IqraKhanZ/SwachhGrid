import { Heart, MapPin, Users, ShieldCheck } from 'lucide-react';
import { EnvCategoryBadge, SeverityBadge, StatusPill } from './Badges';
import { formatTimeAgo } from '../../utils/date';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180, phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

// Environmental category icons for thumbnails
const CATEGORY_ICONS = {
  'Illegal Waste Dumping':     '🗑️',
  'Plastic Pollution':         '🧴',
  'Waste Accumulation':        '♻️',
  'Water Leakage':             '💧',
  'Water Wastage':             '🚿',
  'Drainage Blockage':         '🔵',
  'Flood / Waterlogging Risk': '🌊',
  'Sewage Problem':            '⚠️',
  'Open Burning':              '🔥',
  'Air Pollution':             '🌫️',
  'Lack of Waste Segregation': '🗂️',
  'Tree Cutting':              '🌳',
  'Damaged Greenery':          '🌿',
  'Excessive Energy Usage':    '⚡',
  'Other Environmental Issue': '🌍',
};

export default function IssueCard({ issue, isSelected, onClick, userLocation }) {
  const thumb = issue.mediaUrls?.[0];
  const cat = issue.environmental_category || issue.category || 'Other Environmental Issue';
  const timeAgo = formatTimeAgo(issue.createdAt);
  const upvoteCount = issue.upvotes?.length || 0;
  const supporterCount = issue.supporters?.length || 0;

  let distanceText = null;
  if (userLocation && issue.location?.lat && issue.location?.lng) {
    const d = haversine(userLocation.lat, userLocation.lng, issue.location.lat, issue.location.lng);
    distanceText = formatDistance(d);
  }

  return (
    <div
      onClick={onClick}
      className={`card cursor-pointer hover:scale-[1.01] transition-all duration-200 p-0 overflow-hidden ${
        isSelected
          ? 'border-accent shadow-accent/20 shadow-lg eco-glow'
          : 'hover:border-muted'
      }`}
    >
      {/* Thumbnail */}
      <div className="w-full h-36 bg-bg flex items-center justify-center overflow-hidden relative">
        {thumb ? (
          <img
            src={thumb}
            alt={issue.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br from-surface to-bg flex items-center justify-center"><span class="text-4xl opacity-40">${CATEGORY_ICONS[cat] || '🌍'}</span></div>`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface to-bg flex items-center justify-center">
            <span className="text-4xl opacity-40">{CATEGORY_ICONS[cat] || '🌍'}</span>
          </div>
        )}
        {/* Environmental impact indicator strip */}
        {issue.severity && (
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${
            issue.severity === 'critical' ? 'bg-danger' :
            issue.severity === 'high'     ? 'bg-warning' :
            issue.severity === 'medium'   ? 'bg-yellow-500' :
            'bg-accent'
          }`} />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-primary text-sm leading-tight line-clamp-2 mb-2">{issue.title}</h3>
        {/* Environmental impact short description */}
        {issue.environmental_impact && (
          <p className="text-xs text-muted line-clamp-1 mb-2">{issue.environmental_impact}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <EnvCategoryBadge category={cat} />
          <SeverityBadge severity={issue.severity} />
          <StatusPill status={issue.status} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" /> {upvoteCount}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {supporterCount}
          </span>
          {distanceText && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {distanceText}
            </span>
          )}
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
