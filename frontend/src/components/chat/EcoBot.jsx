import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Leaf, X, Send, Bot, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const WELCOME = {
  role: 'model',
  content: `Hi! I'm EcoBot 🌱 Your sustainability assistant. I can help you:
• [Report an environmental issue](/report)
• Understand waste segregation and recycling
• Share water and energy conservation tips
• Find [community activities](/actions) near you
• Explain the [environmental impact](/analytics) of reported issues
• Answer questions about sustainable living

How can I help you today?`,
};

export default function EcoBot() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/api/agent/chat', {
        messages: newMessages,
        user_location: userLocation,
        current_page: location.pathname,
      });
      setMessages(prev => [...prev, { role: 'model', content: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I had trouble connecting. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (content) => {
    if (!content) return null;
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) parts.push(textBefore);
      const label = match[1];
      const route = match[2];
      if (route.startsWith('/')) {
        parts.push(
          <Link
            key={match.index}
            to={route}
            className="text-accent underline hover:text-accent/80 font-semibold mx-1 cursor-pointer"
          >{label}</Link>
        );
      } else {
        parts.push(
          <a key={match.index} href={route} target="_blank" rel="noopener noreferrer"
            className="text-accent underline hover:text-accent/80 font-semibold mx-1">{label}</a>
        );
      }
      lastIndex = regex.lastIndex;
    }
    const textAfter = content.substring(lastIndex);
    if (textAfter) parts.push(textAfter);
    return parts.length > 0 ? parts : content;
  };

  const QUICK_PROMPTS = [
    'How do I segregate waste?',
    'Water conservation tips',
    'Report an issue near me',
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-accent rounded-full shadow-2xl shadow-accent/30 flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Open EcoBot"
      >
        {open ? <X className="w-6 h-6 text-bg" /> : <Leaf className="w-6 h-6 text-bg" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-80 h-[520px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up eco-glow">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg">
            <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
              <Leaf className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-sm text-primary">EcoBot</p>
              <p className="text-xs text-accent">Sustainability Assistant</p>
            </div>
            <div className="ml-auto w-2 h-2 bg-accent rounded-full animate-pulse" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-accent/20 border border-accent/30 text-primary rounded-bl-2xl rounded-tl-2xl rounded-tr-2xl'
                      : 'bg-bg border border-border text-primary rounded-br-2xl rounded-tr-2xl rounded-tl-2xl'
                  }`}
                >
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-bg border border-border px-4 py-3 rounded-br-2xl rounded-tr-2xl rounded-tl-2xl flex gap-1.5 items-center">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts (show when only welcome message) */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="whitespace-nowrap text-xs bg-bg border border-border text-muted hover:border-accent hover:text-accent px-2.5 py-1.5 rounded-full transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2">
            <input
              className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent"
              placeholder="Ask about sustainability…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 text-bg animate-spin" /> : <Send className="w-4 h-4 text-bg" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
