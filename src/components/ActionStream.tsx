import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface Signal {
  priority: 'urgent' | 'today' | 'watching';
  src: string;
  srcLbl: string;
  age: string;
  txt: string;
  detail: string;
}

interface ActionStreamProps {
  onAskClaude?: (question: string) => void;
}

const COHO_PROXY = '/api/coho';

function timeAgo(iso: string): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0) return 'upcoming';
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd ago';
  const mo = Math.floor(d / 30);
  return mo + 'mo ago';
}

export default function ActionStream({ onAskClaude }: ActionStreamProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [meta, setMeta] = useState('Loading...');

  const fetchData = useCallback(async () => {
    const allSignals: Signal[] = [];

    // 1. Brain items
    try {
      const { data: items } = await supabase
        .from('items')
        .select('id,title,type,status,doer,execution_status,tags,due_date,created_at,updated_at')
        .neq('archived', true)
        .order('updated_at', { ascending: false })
        .limit(80);

      if (items) {
        const inbox = items.filter((i: any) => i.status === 'inbox');
        const focus = items.filter((i: any) => i.status === 'focus');
        const next = items.filter((i: any) => i.status === 'next');
        const scheduled = items.filter((i: any) => i.status === 'scheduled');
        const aiFailed = items.filter((i: any) => i.doer === 'ai' && i.execution_status === 'failed');

        if (inbox.length > 0) {
          allSignals.push({
            priority: 'urgent', src: 'focus', srcLbl: 'Brain',
            age: inbox.length > 1 ? inbox.length + ' items' : '1 item',
            txt: `Inbox needs triage — ${inbox.length} item${inbox.length > 1 ? 's' : ''}`,
            detail: inbox.slice(0, 3).map((i: any) => i.title).join(' · '),
          });
        }

        const today = new Date().toISOString().slice(0, 10);
        const overdue = scheduled.filter((i: any) => i.due_date && i.due_date < today);
        overdue.forEach((i: any) => {
          allSignals.push({
            priority: 'urgent', src: 'focus', srcLbl: 'Brain',
            age: timeAgo(i.due_date + 'T00:00:00Z'),
            txt: 'Overdue: ' + i.title,
            detail: 'Due ' + i.due_date,
          });
        });

        if (aiFailed.length > 0) {
          allSignals.push({
            priority: 'urgent', src: 'focus', srcLbl: 'AI Queue',
            age: aiFailed.length + ' failed',
            txt: `AI executor — ${aiFailed.length} failed task${aiFailed.length > 1 ? 's' : ''}`,
            detail: aiFailed.slice(0, 2).map((i: any) => i.title).join(' · '),
          });
        }

        focus.forEach((i: any) => {
          allSignals.push({
            priority: 'today', src: 'focus', srcLbl: 'Focus',
            age: timeAgo(i.updated_at),
            txt: i.title,
            detail: (i.tags?.length) ? i.tags.join(' · ') : (i.type || 'task'),
          });
        });

        next.slice(0, 5).forEach((i: any) => {
          allSignals.push({
            priority: 'watching', src: 'focus', srcLbl: 'Next',
            age: timeAgo(i.updated_at),
            txt: i.title,
            detail: (i.tags?.length) ? i.tags.join(' · ') : 'ready to do',
          });
        });
      }
    } catch (e) {
      console.warn('Stream: brain fetch failed', e);
    }

    // 2. COHO maintenance
    try {
      const r = await fetch(COHO_PROXY + '?path=/maintenance&pageSize=100');
      if (r.ok) {
        const data = await r.json();
        const open = (data.items || []).filter((i: any) => i.publicStatus !== 'completed' && i.publicStatus !== 'closed');
        open.forEach((i: any) => {
          const isUrgent = i.severity === 'high' || i.severity === 'emergency';
          allSignals.push({
            priority: isUrgent ? 'urgent' : 'today',
            src: 'coho', srcLbl: 'Maintenance',
            age: timeAgo(i.created),
            txt: (i.title?.split(' > ').pop() || i.title) + ' — ' + i.propertyName,
            detail: (i.tenantName ? i.tenantName + ' · ' : '') + i.publicStatus + (i.severity ? ' · ' + i.severity : ''),
          });
        });
      }
    } catch (e) {
      console.warn('Stream: COHO maintenance fetch failed', e);
    }

    // 3. COHO vacancy
    try {
      const r = await fetch(COHO_PROXY + '?path=/properties&includeRooms=true&pageSize=50');
      if (r.ok) {
        const data = await r.json();
        (data.items || []).forEach((p: any) => {
          const total = p.totalRooms || 0;
          const occ = p.roomsOccupied || 0;
          if (total === 0) return;
          const pct = Math.round((occ / total) * 100);
          if (pct < 60 && total >= 3) {
            const vacant = total - occ;
            allSignals.push({
              priority: pct < 30 ? 'urgent' : 'today',
              src: 'coho', srcLbl: 'Vacancy',
              age: pct + '% occ',
              txt: `${p.name} — ${occ}/${total} occupied`,
              detail: `${vacant} vacant room${vacant > 1 ? 's' : ''} · needs attention`,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Stream: COHO properties fetch failed', e);
    }

    // Sort
    const order: Record<string, number> = { urgent: 0, today: 1, watching: 2 };
    allSignals.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));

    setSignals(allSignals);
    setMeta(`${allSignals.length} signals · live from Brain + COHO · auto-refreshes`);
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 300_000); // 5 min
    return () => clearInterval(id);
  }, [fetchData]);

  const groups: { key: Signal['priority']; label: string }[] = [
    { key: 'urgent', label: 'Urgent' },
    { key: 'today', label: 'Today' },
    { key: 'watching', label: 'Watching' },
  ];

  return (
    <div className="action-stream">
      <div className="stream-head">
        <div className="stream-title">Action Stream</div>
        <div className="stream-meta">{meta}</div>
      </div>
      <div className="stream-body">
        {signals.length === 0 && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--dim)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
            No active signals — all clear
          </div>
        )}
        {groups.map(({ key, label }) => {
          const items = signals.filter((s) => s.priority === key);
          if (!items.length) return null;
          return (
            <div className="stream-group" key={key}>
              <div className="stream-group-lbl">{label}</div>
              {items.map((item, i) => (
                <div className={`ablock ${item.priority}`} key={i}>
                  <div className="ablock-src">
                    <span className={`src-badge sb-${item.src}`}>{item.srcLbl}</span>
                    {item.age && <span className="ablock-age">{item.age}</span>}
                  </div>
                  <div className="ablock-txt">{item.txt}</div>
                  <div className="ablock-detail">{item.detail}</div>
                  <div className="ablock-actions">
                    <div
                      className="ab-btn primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAskClaude?.('What should I do about: ' + item.txt);
                      }}
                    >
                      Ask Claude
                    </div>
                    <div className="ab-btn">Snooze</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
