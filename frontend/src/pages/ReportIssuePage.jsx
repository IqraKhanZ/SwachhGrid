import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadMultipleToCloudinary } from '../utils/cloudinary';
import api from '../utils/api';
import {
  MapPin, Upload, X, Camera, Loader2, AlertCircle, CheckCircle2, Sparkles,
  Search, Leaf, Info
} from 'lucide-react';

const ENV_CATEGORIES = [
  'Illegal Waste Dumping',
  'Plastic Pollution',
  'Waste Accumulation',
  'Water Leakage',
  'Water Wastage',
  'Drainage Blockage',
  'Flood / Waterlogging Risk',
  'Sewage Problem',
  'Open Burning',
  'Air Pollution',
  'Lack of Waste Segregation',
  'Tree Cutting',
  'Damaged Greenery',
  'Excessive Energy Usage',
  'Other Environmental Issue',
];

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    const ward = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || '';
    const constituency = addr.city_district || addr.county || addr.state_district || '';
    return { address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, ward, constituencyId: constituency };
  } catch {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, ward: '', constituencyId: '' };
  }
}

async function searchAddress(query) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
      { headers: { 'Accept-Language': 'en' } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

export default function ReportIssuePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', description: '', category: ENV_CATEGORIES[0] });
  const [location, setLocation] = useState({ lat: null, lng: null, address: '', ward: '', constituencyId: '' });
  const [addressSearch, setAddressSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(true);
  const suggestTimeout = useRef(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const geo = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, ...geo });
        setAddressSearch(geo.address);
        setLocationLoading(false);
      },
      () => { setLocationLoading(false); setAddressSearch('Location not detected — search below'); }
    );
  }, []);

  const handleAddressInput = (val) => {
    setAddressSearch(val);
    clearTimeout(suggestTimeout.current);
    if (val.length < 3) { setSuggestions([]); return; }
    suggestTimeout.current = setTimeout(async () => {
      const results = await searchAddress(val);
      setSuggestions(results);
      setShowSuggestions(true);
    }, 400);
  };

  const selectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const addr = item.address || {};
    const ward = addr.suburb || addr.neighbourhood || addr.quarter || '';
    const constituency = addr.city_district || addr.county || '';
    setLocation({ lat, lng, address: item.display_name, ward, constituencyId: constituency });
    setAddressSearch(item.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setErrors(e => ({ ...e, location: '' }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const remaining = 3 - mediaFiles.length;
    const toAdd = files.slice(0, remaining).filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        setErrors(er => ({ ...er, media: `${f.name} exceeds 10MB` }));
        return false;
      }
      return true;
    });
    setMediaFiles(prev => [...prev, ...toAdd]);
    setUploadProgress(prev => [...prev, ...toAdd.map(() => 0)]);
  };

  const removeFile = (idx) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    setUploadProgress(prev => prev.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!location.lat) e.location = 'Please allow location access or search for an address';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setIsSubmitting(true);
    try {
      let mediaUrls = [];
      if (mediaFiles.length > 0) {
        mediaUrls = await uploadMultipleToCloudinary(
          mediaFiles,
          (fileIdx, pct) => setUploadProgress(prev => { const n = [...prev]; n[fileIdx] = pct; return n; })
        );
      }
      setAiAnalyzing(true);
      const res = await api.post('/api/issues', {
        title:       form.title,
        description: form.description,
        category:    form.category,
        mediaUrls,
        location,
        reportedBy:  currentUser.id,
      });
      navigate(`/issues/${res.data.id}`);
    } catch (err) {
      setErrors({ submit: err.response?.data?.detail || err.message || 'Submission failed.' });
    } finally {
      setIsSubmitting(false);
      setAiAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-5 h-5 text-accent" />
            <h1 className="text-2xl font-bold text-primary">Report Environmental Issue</h1>
          </div>
          <p className="text-muted text-sm">AI will analyse your photo, identify the environmental impact, and automatically notify the responsible authority.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="label">Issue Title *</label>
            <input
              className={`input ${errors.title ? 'border-danger' : ''}`}
              placeholder="e.g. Illegal waste dumping near park entrance"
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(er => ({ ...er, title: '' })); }}
            />
            {errors.title && <p className="text-danger text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.title}</p>}
          </div>

          {/* Environmental Category */}
          <div>
            <label className="label">Environmental Category</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {ENV_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea
              className={`input resize-none h-28 ${errors.description ? 'border-danger' : ''}`}
              placeholder="Describe the environmental issue in detail — how long it has been there, scale, visible impacts, etc."
              value={form.description}
              onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setErrors(er => ({ ...er, description: '' })); }}
            />
            {errors.description && <p className="text-danger text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
          </div>

          {/* Location */}
          <div>
            <label className="label flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-accent" /> Location
              {locationLoading && <Loader2 className="w-3 h-3 animate-spin text-muted" />}
            </label>
            <div className="relative">
              <input
                className={`input pr-10 ${errors.location ? 'border-danger' : ''}`}
                placeholder="Auto-detecting your location…"
                value={addressSearch}
                onChange={e => handleAddressInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-surface border border-border rounded-xl shadow-xl mt-1 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-primary hover:bg-bg border-b border-border/50 last:border-0 line-clamp-1"
                      onClick={() => selectSuggestion(s)}
                    >📍 {s.display_name}</button>
                  ))}
                </div>
              )}
            </div>
            {location.lat && (
              <p className="text-xs text-muted mt-1 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-accent" />
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                {location.ward && ` · ${location.ward}`}
              </p>
            )}
            {errors.location && <p className="text-danger text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.location}</p>}
          </div>

          {/* Media Upload */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-accent" /> Photos / Videos (max 3, 10MB each)
            </label>
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent transition-colors cursor-pointer"
              onClick={() => document.getElementById('media-input').click()}
            >
              <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted">Click to upload or drag & drop</p>
              <p className="text-xs text-muted/60 mt-1">Stored on Cloudinary · Free · No billing needed</p>
              <input id="media-input" type="file" multiple accept="image/*,video/*" className="hidden"
                onChange={handleFileChange} disabled={mediaFiles.length >= 3} />
            </div>
            {errors.media && <p className="text-warning text-xs mt-1">{errors.media}</p>}
            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {mediaFiles.map((file, idx) => (
                  <div key={idx} className="relative bg-bg rounded-lg overflow-hidden border border-border">
                    {file.type.startsWith('image') ? (
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-surface text-muted text-xs">🎥 {file.name.slice(0, 12)}…</div>
                    )}
                    {uploadProgress[idx] > 0 && uploadProgress[idx] < 100 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg">
                        <div className="h-1 bg-accent" style={{ width: `${uploadProgress[idx]}%` }} />
                      </div>
                    )}
                    {uploadProgress[idx] === 100 && (
                      <div className="absolute top-1 left-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-bg" />
                      </div>
                    )}
                    <button type="button" onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-danger/80 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI notice */}
          <div className="card flex items-start gap-3 bg-accent/5 border-accent/20">
            <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-accent">AI Environmental Analysis</p>
              <p className="text-xs text-muted mt-0.5">
                Gemini AI will identify the environmental category, assess impact, determine urgency, 
                provide sustainability recommendations, and automatically send a formal complaint to the responsible authority.
              </p>
            </div>
          </div>

          {errors.submit && (
            <div className="card border-danger/30 bg-danger/5 text-danger text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {errors.submit}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />
                {aiAnalyzing ? 'AI is analysing environmental impact…' : 'Uploading photos…'}</>
            ) : (
              <><Leaf className="w-4 h-4" /> Submit Environmental Report</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
