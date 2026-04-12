

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SidebarKey, SearchResult, CommandIntent, TYPE_COLOURS, ItemType, ItemStatus } from '@/lib/types';

interface CommandBarProps {
  onNavigate: (key: SidebarKey) => void;
  onItemCreated: () => void;
  onItemSelect?: (id: string, sidebarKey: SidebarKey) => void;
}

/** Map a search result to the correct sidebar view */
function resultToSidebarKey(result: SearchResult): SidebarKey {
  // Projects get their own sidebar view
  if (result.type === 'project') return 'projects';

  // Route by status
  const statusMap: Partial<Record<ItemStatus, SidebarKey>> = {
    inbox: 'inbox',
    focus: 'focus',
    next: 'next',
    waiting: 'waiting',
    scheduled: 'scheduled',
    someday: 'someday',
    reference: 'reference',
    done: 'logbook',
  };
  return statusMap[result.status] || 'inbox';
}

export default function CommandBar({ onNavigate, onItemCreated, onItemSelect }: CommandBarProps) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [confirmCreate, setConfirmCreate] = useState<{ title: string; type: ItemType; content?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [emptyQuery, setEmptyQuery] = useState(false);
  const [briefEntries, setBriefEntries] = useState<SearchResult[] | null>(null);
  const [intentIcon, setIntentIcon] = useState<'search' | 'create'>('search');

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setConfirmCreate(null);
        setBriefEntries(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = useCallback(async (query: string, filterType?: ItemType | null) => {
    setLoading(true);
    setEmptyQuery(false);
    setIsOpen(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filter_type: filterType || undefined }),
      });
      const data = await res.json();
      const items = data.results || [];
      setResults(items);
      setEmptyQuery(items.length === 0);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
      setEmptyQuery(true);
    }
    setLoading(false);
  }, []);

  const handleIntent = useCallback(async (text: string) => {
    if (!text.trim()) {
      setIsOpen(false);
      setResults([]);
      setConfirmCreate(null);
      setBriefEntries(null);
      return;
    }

    setLoading(true);
    setIsOpen(true);
    setEmptyQuery(false);
    setConfirmCreate(null);
    setBriefEntries(null);

    if (text.startsWith('/')) {
      const parts = text.slice(1).split(' ');
      const cmd = parts[0]?.toLowerCase();
      const args = parts.slice(1).join(' ');

      if (cmd === 'find' && args) {
        setIntentIcon('search');
        await handleSearch(args);
      } else if (cmd === 'save' && args) {
        setIntentIcon('create');
        setLoading(false);
        setConfirmCreate({ title: args, type: 'task', content: args });
        setResults([]);
      } else if (cmd === 'brief') {
        setLoading(false);
        const { data } = await supabase
          .from('items')
          .select('id, type, title, content, summary, status, tags, created_at')
          .or('status.eq.next,status.eq.focus,status.eq.waiting,status.eq.scheduled')
          .eq('archived', false)
          .order('updated_at', { ascending: false })
          .limit(10);
        setBriefEntries((data as SearchResult[]) || []);
        setResults([]);
      } else if (cmd === 'zoom') {
        setLoading(false);
        setResults([]);
        setToast('Zoom runs via WhatsApp — send: /zoom ' + args);
        setIsOpen(false);
      } else {
        setLoading(false);
      }
      return;
    }

    let intent: CommandIntent | null = null;
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.intent) intent = data;
      }
    } catch {}

    if (!intent) {
      setIntentIcon('search');
      await handleSearch(text);
      return;
    }

    switch (intent.intent) {
      case 'search':
        setIntentIcon('search');
        await handleSearch(intent.query || text, intent.filter_type);
        break;

      case 'create':
        setIntentIcon('create');
        setLoading(false);
        setConfirmCreate({
          title: intent.title || text,
          type: intent.type || 'task',
          content: intent.content,
        });
        setResults([]);
        break;

      case 'navigate': {
        setLoading(false);
        setIsOpen(false);
        const target = intent.target as SidebarKey;
        onNavigate(target);
        setInput('');
        break;
      }

      case 'command':
        setLoading(false);
        if (intent.command === 'save') {
          setIntentIcon('create');
          setConfirmCreate({
            title: intent.args || text,
            type: 'task',
            content: intent.args,
          });
          setResults([]);
        } else if (intent.command === 'find') {
          setIntentIcon('search');
          await handleSearch(intent.args || text);
        } else if (intent.command === 'brief') {
          const { data } = await supabase
            .from('items')
            .select('id, type, title, content, summary, status, tags, created_at')
            .or('status.eq.next,status.eq.focus,status.eq.waiting,status.eq.scheduled')
            .eq('archived', false)
            .order('updated_at', { ascending: false })
            .limit(10);
          setBriefEntries((data as SearchResult[]) || []);
          setResults([]);
        } else if (intent.command === 'zoom') {
          setResults([]);
          setToast('Zoom runs via WhatsApp — send: /zoom ' + (intent.args || ''));
          setIsOpen(false);
        }
        break;

      default:
        setIntentIcon('search');
        await handleSearch(text);
        break;
    }
  }, [handleSearch, onNavigate]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleIntent(value), 300);
  };

  const selectResult = (result: SearchResult) => {
    setIsOpen(false);
    setInput('');
    const targetKey = resultToSidebarKey(result);
    if (onItemSelect) {
      onItemSelect(result.id, targetKey);
    } else {
      onNavigate(targetKey);
    }
  };

  const confirmCreateItem = async () => {
    if (!confirmCreate) return;
    const { error } = await supabase.from('items').insert({
      title: confirmCreate.title,
      type: confirmCreate.type,
      content: confirmCreate.content || null,
      status: 'inbox',
      source: 'manual',
      next_actions: [],
      tags: [],
      metadata: {},
      position: 0,
      archived: false,
    });
    if (!error) {
      setToast(`Created: ${confirmCreate.title}`);
      onItemCreated();
    }
    setConfirmCreate(null);
    setIsOpen(false);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalResults = briefEntries?.length || results.length;

    if (e.key === 'Escape') {
      setIsOpen(false);
      setConfirmCreate(null);
      setBriefEntries(null);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalResults - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalResults - 1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const activeResults = briefEntries || results;
      if (selectedIndex >= 0 && selectedIndex < activeResults.length) {
        selectResult(activeResults[selectedIndex]);
      } else if (confirmCreate) {
        confirmCreateItem();
      } else if (emptyQuery && input.trim()) {
        setConfirmCreate({ title: input.trim(), type: 'task' });
        setEmptyQuery(false);
      }
    }
  };

  const displayResults = briefEntries || results;
  const showDropdown = isOpen && (loading || displayResults.length > 0 || confirmCreate || emptyQuery);

  return (
    <div className="command-bar" ref={barRef}>
      <span className="command-bar-icon">
        {intentIcon === 'create' ? '+' : '⌕'}
      </span>
      <input
        ref={inputRef}
        className="command-bar-input"
        type="text"
        placeholder="Search, create, or ask..."
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => { if (input.trim()) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      <span className="command-bar-shortcut">⌘K</span>

      {showDropdown && (
        <div className="command-bar-dropdown">
          {loading && (
            <div className="command-bar-shimmer-list">
              {[0, 1, 2].map((i) => (
                <div key={i} className="command-bar-shimmer" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          )}

          {!loading && confirmCreate && (
            <div className="command-bar-confirm">
              <p className="command-bar-confirm-text">
                Create <span className="type-pill" style={{ background: TYPE_COLOURS[confirmCreate.type]?.bg, color: TYPE_COLOURS[confirmCreate.type]?.text }}>{confirmCreate.type}</span> entry: <strong>{confirmCreate.title}</strong>?
              </p>
              <div className="command-bar-confirm-actions">
                <button className="command-bar-confirm-btn" onClick={confirmCreateItem}>Create</button>
                <button className="command-bar-cancel-btn" onClick={() => { setConfirmCreate(null); setIsOpen(false); }}>Cancel</button>
              </div>
            </div>
          )}

          {!loading && !confirmCreate && displayResults.length > 0 && (
            <div className="command-bar-results">
              {briefEntries && <div className="command-bar-section-label">Today&apos;s Brief</div>}
              {displayResults.map((r, i) => {
                const col = TYPE_COLOURS[r.type];
                return (
                  <div
                    key={r.id}
                    className={`command-bar-result ${i === selectedIndex ? 'command-bar-result-selected' : ''}`}
                    style={{ animationDelay: `${i * 50}ms`, cursor: 'pointer' }}
                    onClick={() => selectResult(r)}
                  >
                    <span className="command-bar-result-badge" style={{ background: col?.bg, color: col?.text }}>{r.type}</span>
                    <div className="command-bar-result-body">
                      <span className="command-bar-result-title">{r.title}</span>
                      <span className="command-bar-result-snippet">
                        {r.summary || r.content?.slice(0, 80) || ''}
                      </span>
                    </div>
                    {r.similarity > 0 && (
                      <span className="command-bar-result-sim">{Math.round(r.similarity * 100)}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !confirmCreate && emptyQuery && (
            <div className="command-bar-empty">
              No results found. Press <strong>Enter</strong> to create a new entry from this text.
            </div>
          )}
        </div>
      )}

      {toast && <div className="command-bar-toast">{toast}</div>}
    </div>
  );
}
