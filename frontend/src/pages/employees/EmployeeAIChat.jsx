import { useState, useEffect, useRef, useCallback } from 'react';
import api, { API_BASE_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const API = '/api/ai-chat';

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginRight: 8, flexShrink: 0 }}>
          🤖
        </div>
      )}
      <div style={{ maxWidth: '72%' }}>
        <div style={{
          background: isUser ? 'var(--accent-color)' : 'var(--card-bg)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: isUser ? 'none' : '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textAlign: isUser ? 'right' : 'left' }}>
          {formatTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '18px 18px 18px 4px', padding: '10px 16px', display: 'flex', gap: 4 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: `bounce 1s ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

export default function EmployeeAIChat() {
  const { user }                       = useAuth();
  const [sessions, setSessions]        = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages]        = useState([]);
  const [input, setInput]              = useState('');
  const [loading, setLoading]          = useState(false);
  const [streaming, setStreaming]      = useState(false);
  const [streamText, setStreamText]    = useState('');
  const [sidebarOpen, setSidebarOpen]  = useState(true);
  const messagesEndRef                 = useRef(null);
  const textareaRef                    = useRef(null);

  const scrollBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollBottom(); }, [messages, streamText]);

  const loadSessions = useCallback(async () => {
    const r = await api.get(API);
    setSessions(r.data.data || []);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const openSession = async (s) => {
    setActiveSession(s);
    setStreamText('');
    const r = await api.get(`${API}/${s.id}/messages`);
    setMessages(r.data.data || []);
  };

  const newSession = async () => {
    const r = await api.post(API, { title: 'New Chat' });
    await loadSessions();
    const sess = { id: r.data.data.id, title: 'New Chat' };
    setActiveSession(sess);
    setMessages([]);
    setStreamText('');
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    await api.delete(`${API}/${id}`);
    if (activeSession?.id === id) { setActiveSession(null); setMessages([]); }
    loadSessions();
  };

  const send = async () => {
    if (!input.trim() || streaming || !activeSession) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg, created_at: new Date().toISOString() }]);
    setStreaming(true);
    setStreamText('');

    try {
      const response = await fetch(`${API_BASE_URL}${API}/${activeSession.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'X-Tenant-Id': (() => { try { return String(JSON.parse(localStorage.getItem('user'))?.tenant_id || ''); } catch { return ''; } })(),
        },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!response.ok) throw new Error('Request failed');

      const reader   = response.body.getReader();
      const decoder  = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              accumulated += data.content;
              setStreamText(accumulated);
            } else if (data.type === 'done') {
              setMessages(m => [...m, { role: 'assistant', content: accumulated, created_at: new Date().toISOString() }]);
              setStreamText('');
              loadSessions();
            } else if (data.type === 'error') {
              setMessages(m => [...m, { role: 'assistant', content: `Error: ${data.message}`, created_at: new Date().toISOString() }]);
              setStreamText('');
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', created_at: new Date().toISOString() }]);
      setStreamText('');
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const roleLabel = (pos) => {
    const map = { admin: 'Admin', super_admin: 'Admin', hr: 'HR Manager', team_lead: 'Team Lead', employee: 'Employee' };
    return map[pos] || 'Employee';
  };

  const suggestions = [
    'How many employees are absent today?',
    'Show me pending leave requests',
    'What is the WFH policy?',
    'Give me an attendance summary for this week',
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .ai-session-item:hover { background: var(--bg-hover) !important; }
        .ai-send-btn:hover:not(:disabled) { filter: brightness(1.1); }
      `}</style>

      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{ width: 240, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--sidebar-bg, var(--card-bg))', flexShrink: 0 }}>
          <div style={{ padding: '16px 12px', borderBottom: '1px solid var(--border-color)' }}>
            <button onClick={newSession} style={{ width: '100%', padding: '9px 14px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              + New Chat
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
            {sessions.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 8px' }}>No conversations yet</p>}
            {sessions.map(s => (
              <div key={s.id} className="ai-session-item" onClick={() => openSession(s)}
                style={{ padding: '9px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeSession?.id === s.id ? 'var(--accent-light, rgba(99,102,241,0.1))' : 'transparent', marginBottom: 2 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                <button onClick={(e) => deleteSession(s.id, e)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, padding: '0 2px', flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Role: <b style={{ color: 'var(--text-secondary)' }}>{roleLabel(user?.position)}</b>
            </div>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card-bg)', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, padding: 4 }}>☰</button>
          <div style={{ fontSize: 22 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>HR AI Assistant</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Powered by Claude · {roleLabel(user?.position)} view</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {!activeSession && (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>HR AI Assistant</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
                Your intelligent HR helper — ask about attendance, leave, policies, and more.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 560, margin: '0 auto' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={async () => { await newSession(); setInput(s); }}
                    style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSession && messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {streamText && <MessageBubble msg={{ role: 'assistant', content: streamText, created_at: new Date().toISOString() }} />}
          {streaming && !streamText && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--card-bg)', flexShrink: 0 }}>
          {!activeSession && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <button onClick={newSession} style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--accent-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Start New Chat</button>
            </div>
          )}
          {activeSession && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about HR, attendance, leave, policies…"
                rows={1}
                disabled={streaming}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, resize: 'none', minHeight: 42, maxHeight: 120, overflow: 'auto', lineHeight: 1.5, fontFamily: 'inherit' }}
              />
              <button onClick={send} disabled={!input.trim() || streaming} className="ai-send-btn"
                style={{ width: 42, height: 42, borderRadius: 10, background: !input.trim() || streaming ? 'var(--bg-secondary)' : 'var(--accent-color)', color: !input.trim() || streaming ? 'var(--text-muted)' : '#fff', border: 'none', cursor: !input.trim() || streaming ? 'default' : 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                ↑
              </button>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            Press Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
