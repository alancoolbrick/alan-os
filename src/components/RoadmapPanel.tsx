import { useState, useEffect, useCallback } from 'react';

/* ── Types ── */
interface Project {
  id: string; label: string; category: string; repo: string; status: string; color: string;
  commitCount: number; lastCommit: string | null; deployState: string | null;
  brainItems: number; description: string;
  milestoneSummary: { done: number; active: number; planned: number; total: number };
}

interface Milestone { title: string; detail: string; status: 'done' | 'active' | 'planned'; date?: string; }
interface CommitInfo { sha: string; message: string; date: string; author: string; }
interface BrainItem { id: string; title: string; status: string; type: string; updated_at: string; }

interface ProjectDetail {
  id: string; label: string; category: string; repo: string; description: string;
  status: string; color: string; commitCount: number; lastCommit: string | null;
  deployState: string | null; deployUrl: string | null; brainItems: number; blockedTasks: number;
  decision: string | null; milestones: Milestone[];
  commits: CommitInfo[]; brainItemList: BrainItem[]; githubUrl: string;
}

interface RoadmapData { projects: Project[]; fetchedAt: string; }

const CATEGORIES = ['Core', 'Tools', 'Experimental'];

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ════════════════════════════════════════════
   Main Panel
   ════════════════════════════════════════════ */
export default function RoadmapPanel() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/roadmap');
      if (!res.ok) throw new Error('API ' + res.status);
      setData(await res.json()); setError(false);
    } catch { setError(true); }
  }, []);

  useEffect(() => { fetchData(); const id = setInterval(fetchData, 300_000); return () => clearInterval(id); }, [fetchData]);

  useEffect(() => {
    if (!selectedProject) { setDetail(null); return; }
    let x = false; setDetailLoading(true);
    fetch(`/api/roadmap?project=${selectedProject}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!x) { setDetail(d); setDetailLoading(false); } })
      .catch(() => { if (!x) setDetailLoading(false); });
    return () => { x = true; };
  }, [selectedProject]);

  if (selectedProject) return <DetailView detail={detail} loading={detailLoading} onBack={() => setSelectedProject(null)} />;

  if (error && !data) return (
    <>
      <div className="mode-header"><div className="mode-title">Roadmap</div><div className="mode-sub">auto-derived from GitHub + Vercel + Brain</div></div>
      <div style={emptyStyle}>Failed to load roadmap — check API keys</div>
    </>
  );

  if (!data) return (
    <>
      <div className="mode-header"><div className="mode-title">Roadmap</div><div className="mode-sub">loading...</div></div>
      <div style={emptyStyle}>Loading roadmap data...</div>
    </>
  );

  const projects = data.projects;
  const active = projects.filter((p) => p.status === 'Active').length;
  const totalCommits = projects.reduce((s, p) => s + p.commitCount, 0);
  const blocked = projects.filter((p) => p.status === 'Blocked' || p.status === 'Stale').length;

  return (
    <>
      <div className="mode-header">
        <div className="mode-title">Roadmap</div>
        <div className="mode-sub">{projects.length} projects · {active} active</div>
      </div>

      <div className="g3">
        <div className="card"><div className="card-lbl">Active</div><div className="card-val teal">{active}</div><div className="card-note">commits in last 7d</div></div>
        <div className="card"><div className="card-lbl">Commits</div><div className="card-val gold">{totalCommits}</div><div className="card-note">last 7 days</div></div>
        <div className="card"><div className="card-lbl">Blocked / Stale</div><div className={`card-val ${blocked > 0 ? 'rose' : 'teal'}`}>{blocked}</div><div className="card-note">need attention</div></div>
      </div>

      {CATEGORIES.map((cat) => {
        const cp = projects.filter((p) => p.category === cat);
        if (!cp.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div className="sec">{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cp.map((p) => (
                <div key={p.id} className="prow" style={{ gap: 10, alignItems: 'center' }} onClick={() => setSelectedProject(p.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 500 }}>{p.label}</span>
                      <StatusPill status={p.status} color={p.color} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: mono, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {p.description}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                    {/* Milestone progress */}
                    <span style={{ fontSize: 8, color: 'var(--teal)', fontFamily: mono }}>{p.milestoneSummary.done}✓</span>
                    {p.milestoneSummary.active > 0 && <span style={{ fontSize: 8, color: 'var(--gold)', fontFamily: mono }}>{p.milestoneSummary.active} active</span>}
                    <span style={{ fontSize: 8, color: 'var(--dim)', fontFamily: mono }}>{p.milestoneSummary.total} total</span>
                    <span style={{ fontSize: 10, color: 'var(--dim)' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ════════════════════════════════════════════
   Detail View — editorial style
   ════════════════════════════════════════════ */
function DetailView({ detail, loading, onBack }: { detail: ProjectDetail | null; loading: boolean; onBack: () => void }) {
  const [showCommits, setShowCommits] = useState(false);

  if (loading || !detail) return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <button onClick={onBack} style={backBtn}>← Back</button>
      </div>
      <div style={emptyStyle}>Loading project detail...</div>
    </>
  );

  const done = detail.milestones.filter((m) => m.status === 'done').length;
  const total = detail.milestones.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  // Group milestones by phase status
  const doneMs = detail.milestones.filter((m) => m.status === 'done');
  const activeMs = detail.milestones.filter((m) => m.status === 'active');
  const plannedMs = detail.milestones.filter((m) => m.status === 'planned');

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <button onClick={onBack} style={backBtn}>←</button>
        <div className="mode-header" style={{ marginBottom: 0 }}>
          <div className="mode-title">{detail.label}</div>
          <StatusPill status={detail.status} color={detail.color} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: mono, marginBottom: 10, paddingLeft: 40 }}>
        {detail.description}
      </div>

      {/* Stats */}
      <div className="g3">
        <div className="card">
          <div className="card-lbl">Progress</div>
          <div className="card-val teal">{pct}%</div>
          <div className="card-note">{done} of {total} milestones</div>
          <div className="bar" style={{ marginTop: 6 }}><div className="bar-fill" style={{ width: pct + '%', background: 'var(--teal)' }} /></div>
        </div>
        <div className="card">
          <div className="card-lbl">Commits (7d)</div>
          <div className={`card-val ${detail.commitCount > 0 ? 'gold' : 'rose'}`}>{detail.commitCount}</div>
          <div className="card-note">{timeAgo(detail.lastCommit) || 'none'}</div>
        </div>
        <div className="card">
          <div className="card-lbl">Brain Items</div>
          <div className="card-val gold">{detail.brainItems}</div>
          <div className="card-note">{detail.blockedTasks} focus/next</div>
        </div>
      </div>

      {/* Decision callout */}
      {detail.decision && (
        <div style={decisionBox}>
          <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--gold)', marginBottom: 4 }}>Decision made 30 March:</div>
          <div style={{ fontSize: 11, color: 'var(--mid)', lineHeight: 1.5 }}>{detail.decision}</div>
        </div>
      )}

      {/* Links */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <a href={detail.githubUrl} target="_blank" rel="noopener noreferrer" style={linkBtn}>GitHub →</a>
        {detail.deployUrl && <a href={`https://${detail.deployUrl}`} target="_blank" rel="noopener noreferrer" style={linkBtn}>Live site →</a>}
      </div>

      {/* Milestones — Done */}
      {doneMs.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <PhaseLabel label="COMPLETE" color="var(--teal)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {doneMs.map((m, i) => <MilestoneCard key={i} m={m} />)}
          </div>
        </>
      )}

      {/* Milestones — Active */}
      {activeMs.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <PhaseLabel label="IN PROGRESS" color="var(--gold)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {activeMs.map((m, i) => <MilestoneCard key={i} m={m} />)}
          </div>
        </>
      )}

      {/* Milestones — Planned */}
      {plannedMs.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <PhaseLabel label="PLANNED" color="var(--dim)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {plannedMs.map((m, i) => <MilestoneCard key={i} m={m} />)}
          </div>
        </>
      )}

      {/* Brain items */}
      {detail.brainItemList.length > 0 && (
        <>
          <div className="sec" style={{ marginTop: 4 }}>Brain items</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 14 }}>
            {detail.brainItemList.map((item) => (
              <div key={item.id} className="task">
                <div className="tcheck" />
                <div className="task-body">
                  <div className="task-txt">{item.title}<span className={`tag ${item.type === 'project' ? 'f' : 'o'}`}>{item.type}</span></div>
                  <div className="task-meta">{item.status} · {timeAgo(item.updated_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Commits — collapsible */}
      {detail.commits.length > 0 && (
        <>
          <div className="sec" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowCommits(!showCommits)}>
            <span>{showCommits ? '▾' : '▸'}</span>
            Activity — {detail.commits.length} commits (7d)
          </div>
          {showCommits && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {detail.commits.map((c, i) => (
                <div key={c.sha + i} style={commitRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={shaTag}>{c.sha}</span>
                    <span style={{ fontSize: 11, color: 'var(--mid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.message}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                    <span style={cmeta}>{c.author}</span>
                    <span style={cmeta}>{formatDate(c.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════ */

function MilestoneCard({ m }: { m: Milestone }) {
  const icon = m.status === 'done' ? '✅' : m.status === 'active' ? '🔵' : '○';
  const opacity = m.status === 'done' ? 0.7 : 1;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
      borderRadius: 7, background: 'var(--s1)', border: '1px solid var(--b1)',
      opacity,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 500, lineHeight: 1.4 }}>{m.title}</div>
        <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: mono, marginTop: 2, lineHeight: 1.4 }}>
          {m.detail}{m.date ? ` · ${m.date}` : ''}
        </div>
      </div>
    </div>
  );
}

function PhaseLabel({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 9,
      fontFamily: mono, fontWeight: 700, letterSpacing: '.08em',
      background: color === 'var(--teal)' ? 'rgba(61,232,176,.1)' : color === 'var(--gold)' ? 'rgba(232,176,75,.1)' : 'var(--s2)',
      color, border: `1px solid ${color === 'var(--teal)' ? 'rgba(61,232,176,.2)' : color === 'var(--gold)' ? 'rgba(232,176,75,.2)' : 'var(--b2)'}`,
    }}>
      {label}
    </span>
  );
}

function StatusPill({ status, color }: { status: string; color: string }) {
  const s: Record<string, { bg: string; border: string; text: string }> = {
    teal: { bg: 'rgba(61,232,176,.09)', border: 'rgba(61,232,176,.2)', text: 'var(--teal)' },
    rose: { bg: 'rgba(232,75,106,.09)', border: 'rgba(232,75,106,.2)', text: 'var(--rose)' },
    gold: { bg: 'rgba(232,176,75,.09)', border: 'rgba(232,176,75,.2)', text: 'var(--gold)' },
    dim:  { bg: 'var(--s1)', border: 'var(--b1)', text: 'var(--dim)' },
  };
  const st = s[color] || s.dim;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 8, fontFamily: mono, background: st.bg, border: `1px solid ${st.border}`, color: st.text, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

/* ── Shared styles ── */
const mono = "'IBM Plex Mono', monospace";
const emptyStyle: React.CSSProperties = { padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 11, fontFamily: mono };
const backBtn: React.CSSProperties = { background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--mid)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontFamily: mono, cursor: 'pointer', flexShrink: 0 };
const linkBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 5, fontSize: 9, fontFamily: mono, background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--gold)', textDecoration: 'none', cursor: 'pointer' };
const commitRow: React.CSSProperties = { padding: '8px 10px', borderRadius: 5, background: 'var(--s1)', border: '1px solid var(--b1)' };
const shaTag: React.CSSProperties = { fontSize: 9, fontFamily: mono, color: 'var(--gold)', background: 'rgba(232,176,75,.08)', padding: '1px 5px', borderRadius: 3, flexShrink: 0 };
const cmeta: React.CSSProperties = { fontSize: 8, color: 'var(--dim)', fontFamily: mono };
const decisionBox: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 8, marginBottom: 8,
  background: 'rgba(232,176,75,.06)', border: '1px solid rgba(232,176,75,.18)',
};
