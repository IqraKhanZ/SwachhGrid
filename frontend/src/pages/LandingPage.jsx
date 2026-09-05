import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight, Zap, Shield, BarChart2, Users } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'AI Issue Analysis',     desc: 'Gemini AI identifies environmental category, impact, urgency, and recommended action from your photos.' },
  { icon: Shield, title: 'Before/After Verify', desc: 'AI verifies that environmental problems are genuinely resolved — reopening issues if suspicious.' },
  { icon: BarChart2, title: 'Hotspot Prediction', desc: 'Predictive engine identifies waste, drainage, water, and pollution hotspots before they become crises.' },
  { icon: Users, title: 'Community Actions',    desc: 'Join local clean-ups, tree plantations, recycling drives, and water conservation initiatives.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-bg to-bg" />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="w-20 h-20 bg-accent/10 border border-accent/30 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-leaf-float">
            <Leaf className="w-12 h-12 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-3">
            Community Hero <span className="text-accent">Green</span>
          </h1>
          <p className="text-xl text-muted mb-2">From reporting problems to building sustainable communities.</p>
          <p className="text-sm text-muted/70 mb-10 max-w-xl mx-auto">
            AI-powered environmental issue reporting. Spot, report, and resolve waste, water, drainage, 
            pollution, and greenery problems — together.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="btn-primary flex items-center justify-center gap-2 px-8 py-3 text-base"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="btn-secondary flex items-center justify-center gap-2 px-8 py-3 text-base"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-xl font-bold text-primary text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card flex gap-4">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-1">{title}</h3>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center text-xs text-muted">
        Community Hero Green — AI + Climate Action + Sustainability + Community Participation
      </div>
    </div>
  );
}
