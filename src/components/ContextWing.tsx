

import { useState, useRef, useEffect, useCallback } from 'react';
import { RelatedEntry, TYPE_COLOURS } from '@/lib/types';

interface ContextWingProps {
  itemId: string | null;
  onClose: () => void;
  onNavigate: (itemId: string) => void;
}

export default function ContextWing({ itemId, onClose, onNavigate }: ContextWingProps) {
  const [results, setResults] = useState<RelatedEntry[]>([]);
  const [sourceTitle, setSourceTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, { results: RelatedEntry[]; title: string }>>(new Map());
  const wingRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number | null>(null);

  const fetchRelated = useCallback(async (id: string) => {
    // Check cache
    if (cacheRef.current.has(id)) {
      const cached = cacheRef.current.get(id)!;
      setResults(cached.results);
      setSourceTitle(cached.title);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/related?item_id=${id}`);
      const data = await res.json();
      const entries = data.results || [];
      const title = data.source_title || '';
      setResults(entries);
      setSourceTitle(title);
      cacheRef.current.set(id, { results: entries, title });
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (itemId) fetchRelated(itemId);
  }, [itemId, fetchRelated]);

  // Swipe to close
  useEffect(() => {
    const el = wingRef.current;
    if (!el || !itemId) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartRef.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartRef.current === null) return;
      const diff = e.changedTouches[0].clientX - touchStartRef.current;
      if (diff > 80) onClose();
      touchStartRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [itemId, onClose]);

  const isOpen = itemId !== null;

  return (
    <>
      {/* Backdrop (mobile only, controlled via CSS) */}
      {isOpen && (
        <div className="context-wing-backdrop" onClick={onClose} />
      )}

      <div ref={wingRef} className={`context-wing ${isOpen ? 'context-wing-open' : ''}`}>
        <div className="context-wing-header">
          <span className="context-wing-title">Related to: {sourceTitle}</span>
          <button className="context-wing-close" onClick={onClose}>&times;</button>
        </div>

        <div className="context-wing-body">
          {loading && (
            <div className="context-wing-skeleton-list">
              {[0, 1, 2].map((i) => (
                <div key={i} className="context-wing-skeleton" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          )}

          {!loading && results.length === 0 && isOpen && (
            <div className="context-wing-empty">No related entries found.</div>
          )}

          {!loading && results.map((r) => {
            const col = TYPE_COLOURS[r.type];
            return (
              <div
                key={r.id}
                className="context-wing-card"
                onClick={() => onNavigate(r.id)}
              >
                <div className="context-wing-card-top">
                  <span className="context-wing-card-badge" style={{ background: col?.bg, color: col?.text }}>{r.type}</span>
                  <span className="context-wing-card-title">{r.title}</span>
                </div>
                <div className="context-wing-card-snippet">
                  {r.summary || r.content?.slice(0, 120) || ''}
                </div>
                <div className="context-wing-card-meta">
                  {r.relevance === 'semantic' && (
                    <span className="context-wing-relevance context-wing-relevance-semantic">Similar content</span>
                  )}
                  {r.relevance === 'tags' && r.shared_tags && (
                    <span className="context-wing-relevance context-wing-relevance-tags">Shared tags: {r.shared_tags.join(', ')}</span>
                  )}
                  {r.relevance === 'both' && r.shared_tags && (
                    <span className="context-wing-relevance context-wing-relevance-both">Similar + tags: {r.shared_tags.join(', ')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
