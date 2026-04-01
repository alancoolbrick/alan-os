import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM = `You are Claude, the intelligence layer of ALAN OS — Alan's personal universal operating system.

Alan's full context:
PORTFOLIO: 10 HMO properties, 32 rooms. Bridgwater (TA6) and Trowbridge (BA14). Current rent roll £23,100/mo vs £31,000/mo target. Vacancy drag: £7,900/mo from 8 empty rooms.
CRITICAL PROPERTIES: 42 Friarn Street (1/5 rooms, £130k mortgage, losing ~£2,650/mo net), 44 Cranleigh Gardens (2/5 rooms, -£2,100/mo).
COMPANIES: PKS Properties Ltd (25% Alan, 25% Nicole, 50% Lukasz), Roomy Properties Ltd (50% Alan, 50% Nicole), Solo Wave Ltd (50% Alan, 50% Jake Barnett), plus Alan's personal holdings (60 Taunton Rd, 14 Willow Grove).
SOLD: Brockley Road sold 6 March 2026. CGT calculation outstanding with Kieran Whelan at Gorilla Accounting.
TEAM: Lena (VA — handles Coho, SpareRoom, Hammock, Asana), John (House Manager — maintenance, viewings), Kieran Whelan (Gorilla Accounting — FreeAgent, payroll, tax).
SYSTEMS: Coho (property mgmt, live), Hammock (landlord accounting, live), FreeAgent (bookkeeping), SpareRoom (room listings), Asana (team tasks).
BRAIN: Coolbrick Brain — WhatsApp via Wispr Flow → persistent agent on Railway → Claude API + OpenAI embeddings → Supabase pgvector. Dashboard: coolbrick-brain-app.vercel.app.
ALAN OS: This interface replaces NirvanaHQ as task/GTD system. It is Alan's daily operating environment.
HINKLEY: Hinkley Point C nearby — 18-24 month key worker demand window. Major portfolio opportunity if vacancy resolved.
CLOSED: NK&AS Ltd closed 6 March 2026.

Be sharp, direct, commercially minded. No fluff. You know the full picture — connect dots Alan hasn't asked about when relevant. You are mission control intelligence, not a chatbot.`;

const QUICK_BTNS = [
  { label: '42 Friarn?', msg: 'What should I do about 42 Friarn Street?' },
  { label: 'Finance', msg: 'Summarise my financial position' },
  { label: 'Risks', msg: 'What are my biggest risks right now?' },
  { label: 'Brief Lena', msg: 'Draft a brief for Lena on the SpareRoom enquiries' },
];

export default function ClaudePanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Good morning Alan. You have 3 unanswered SpareRoom enquiries in Bridgwater, a CGT calculation outstanding with Kieran, and £4,750/mo bleeding from Friarn and Cranleigh combined. What do you want to tackle first?',
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;
    setInput('');
    setStreaming(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);

    // Add placeholder
    setMessages([...newMessages, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, system: SYSTEM }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const p = JSON.parse(data);
                if (p.type === 'content_block_delta' && p.delta?.text) {
                  fullText += p.delta.text;
                  setMessages([...newMessages, { role: 'assistant', content: fullText }]);
                }
              } catch {}
            }
          }
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: fullText || 'Connection error.' }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Connection error.' }]);
    }

    setStreaming(false);
  }, [input, messages, streaming]);

  // Listen for quick-send events from Shell
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) sendMessage(detail);
    };
    window.addEventListener('claude-quick-send', handler);
    return () => window.removeEventListener('claude-quick-send', handler);
  }, [sendMessage]);

  useEffect(scrollToBottom, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-header">
        <div className="chat-badge">✦</div>
        <div>
          <div className="chat-title">Claude</div>
          <div className="chat-sub">Context-aware · Your portfolio · Live</div>
        </div>
        <div className="chat-status">
          <div className="dot" style={{ animation: 'pulse 2s infinite' }} />
          live
        </div>
      </div>

      <div className="chat-msgs" ref={msgsRef}>
        {messages.map((msg, i) => (
          <div className={`msg ${msg.role}`} key={i}>
            <div className="msg-role">{msg.role === 'user' ? 'You' : 'Claude'}</div>
            <div className="msg-bubble">
              {msg.role === 'assistant' && !msg.content && streaming ? (
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-area">
        <div className="quick-btns">
          {QUICK_BTNS.map((btn) => (
            <div className="qbtn" key={btn.label} onClick={() => sendMessage(btn.msg)}>
              {btn.label}
            </div>
          ))}
        </div>
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask anything..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="send-btn" disabled={streaming} onClick={() => sendMessage()}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
