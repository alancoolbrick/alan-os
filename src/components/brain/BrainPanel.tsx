import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface BrainItem {
  id: string;
  title: string;
  type: string;
  status: string;
  doer: string;
  execution_status: string;
}

const EXEC_BADGES: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'exec-pending', label: '⏳ Pending' },
  claimed: { cls: 'exec-claimed', label: '🔄 Running' },
  done: { cls: 'exec-done', label: '✅ Done' },
  dry_run_complete: { cls: 'exec-dry_run_complete', label: '🧪 Dry Run' },
  needs_human: { cls: 'exec-needs_human', label: '🚨 Needs Human' },
};

const TYPE_TAG: Record<string, string> = { task: 'o', people: 'p', project: 'f', idea: 'o', admin: 'p', area: 'o' };

export default function BrainPanel() {
  const [items, setItems] = useState<BrainItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [doer, setDoer] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('id,title,type,status,doer,execution_status')
      .neq('archived', true)
      .order('created_at', { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Counts
  const typeCounts: Record<string, number> = {};
  items.forEach((i) => {
    const t = i.type || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const humanCount = items.filter((i) => i.doer === 'human').length;
  const aiCount = items.filter((i) => i.doer === 'ai').length;

  // Filter items
  let filtered = items;
  if (doer !== 'all') filtered = filtered.filter((i) => i.doer === doer);

  const CHIP_MAP: Record<string, string> = {
    areas: 'area', people: 'people', projects: 'project', systems: 'admin', ideas: 'idea',
  };

  return (
    <>
      <div className="mode-header">
        <div className="mode-title">Brain</div>
        <div className="mode-sub">Coolbrick Knowledge Graph · Supabase pgvector</div>
      </div>

      <div className="doer-bar">
        {(['all', 'human', 'ai'] as const).map((d) => (
          <div
            key={d}
            className={`doer-btn ${doer === d ? 'active' : ''}`}
            onClick={() => setDoer(d)}
          >
            {d === 'human' ? '👤 ' : d === 'ai' ? '🤖 ' : ''}
            {d.charAt(0).toUpperCase() + d.slice(1)}
            <span className="doer-count">
              ({d === 'all' ? items.length : d === 'human' ? humanCount : aiCount})
            </span>
          </div>
        ))}
      </div>

      <div className="chip-row">
        {['all', 'areas', 'people', 'projects', 'systems', 'ideas'].map((c) => (
          <div
            key={c}
            className={`chip ${filter === c ? 'active' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="g3" style={{ marginBottom: 10 }}>
        {Object.entries(typeCounts).slice(0, 6).map(([type, count]) => (
          <div className="card" key={type}>
            <div className="card-lbl">{type}</div>
            <div className="card-val gold">{count}</div>
          </div>
        ))}
      </div>

      <div className="sec">Items</div>
      <div className="brain-items">
        {loading && <div className="brain-item-loading">Loading items from Supabase...</div>}
        {!loading && filtered.length === 0 && <div className="brain-item-loading">No items</div>}
        {filtered
          .filter((item) => filter === 'all' || item.type === CHIP_MAP[filter] || item.type === filter)
          .map((item) => {
            const showBadge = (doer === 'ai' || (doer === 'all' && item.doer === 'ai'));
            const badge = showBadge && item.execution_status && EXEC_BADGES[item.execution_status];
            const tagCls = TYPE_TAG[item.type] || 'o';
            return (
              <div className="task" key={item.id}>
                <div className="tcheck" />
                <div className="task-body">
                  <div className="task-txt">
                    {item.title}
                    {badge && <span className={`exec-badge ${badge.cls}`}>{badge.label}</span>}
                    <span className={`tag ${tagCls}`}>{item.type}</span>
                  </div>
                  <div className="task-meta">
                    {item.status}{item.doer === 'ai' ? ' · ai doer' : ''}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
