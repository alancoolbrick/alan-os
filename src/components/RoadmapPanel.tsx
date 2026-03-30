import { useState, useEffect, useCallback } from 'react';

interface Project {
  id: string;
  label: string;
  category: string;
  repo: string;
  status: string;
  color: string;
  commitCount: number;
  lastCommit: string | null;
  lastCommitMsg: string | null;
  deployState: string | null;
  brainItems: number;
  blockedTasks: number;
  description: string;
}

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface BrainItem {
  id: string;
  title: string;
  status: string;
  type: string;
  updated_at: string;
}

interface ProjectDetail extends Project {
  commits: CommitInfo[];
  brainItemList: BrainItem[];
  deployUrl: string | null;
  deployCreated: number | null;
  githubUrl: string;
}

interface RoadmapData {
  projects: Project[];
  fetchedAt: string;
}

const CATEGORIES = ['Core', 'Tools', 'Experimental'];

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

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
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 300_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Fetch detail when a project is selected
  useEffect(() => {
    if (!selectedProject) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/roadmap?project=${selectedProject}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled) { setDetail(d); setDetailLoading(false); } })
      .catch(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedProject]);

  // ── Detail view ──
  if (selectedProject) {
    return <DetailView detail={detail} loading={detailLoading} onBack={() => setSelectedProject(null)} />;
  }

  // ── Error state ──
  if (error && !data) {
    return (
      <>
        <div className="mode-header">
          <div className="mode-title">Roadmap</div>
          <div className="mode-sub">auto-derived from GitHub + Vercel + Brain</div>
        </div>
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          Failed to load roadmap — check API keys
        </div>
      </>
    );
  }

  // ── Loading state ──
  if (!data) {
    return (
      <>
        <div className="mode-header">
          <div className="mode-title">Roadmap</div>
          <div className="mode-sub">loading...</div>
        </div>
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          Loading roadmap data...
        </div>
      </>
    );
  }

  // ── Summary view ──
  const projects = data.projects;
  const active = projects.filter((p) => p.status === 'Active').length;
  const totalCommits = projects.reduce((s, p) => s + p.commitCount, 0);
  const blocked = projects.filter((p) => p.status === 'Blocked' || p.status === 'Stale').length;
  const fetchedAt = new Date(data.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="mode-header">
        <div className="mode-title">Roadmap</div>
        <div className="mode-sub">{projects.length} projects &middot; {active} active &middot; updated {fetchedAt}</div>
      </div>

      <div className="g3">
        <div className="card">
          <div className="card-lbl">Active Projects</div>
          <div className="card-val teal">{active}</div>
          <div className="card-note">commits in last 7d</div>
        </div>
        <div className="card">
          <div className="card-lbl">Total Commits</div>
          <div className="card-val gold">{totalCommits}</div>
          <div className="card-note">last 7 days</div>
        </div>
        <div className="card">
          <div className="card-lbl">Blocked / Stale</div>
          <div className={`card-val ${blocked > 0 ? 'rose' : 'teal'}`}>{blocked}</div>
          <div className="card-note">need attention</div>
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const catProjects = projects.filter((p) => p.category === cat);
        if (!catProjects.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div className="sec">{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {catProjects.map((p) => (
                <div
                  key={p.id}
                  className="prow"
                  style={{ gap: 10, alignItems: 'center' }}
                  onClick={() => setSelectedProject(p.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 500 }}>{p.label}</span>
                      <StatusPill status={p.status} color={p.color} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {p.description}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    <Stat label={`${p.commitCount}`} suffix="commits" />
                    <Stat label={timeAgo(p.lastCommit) || '—'} />
                    {p.brainItems > 0 && <Stat label={`${p.brainItems}`} suffix="brain" />}
                    <span style={{ fontSize: 10, color: 'var(--dim)', transition: 'color .15s' }}>→</span>
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

/* ──────────────────── Detail View ──────────────────── */

function DetailView({ detail, loading, onBack }: { detail: ProjectDetail | null; loading: boolean; onBack: () => void }) {
  if (loading || !detail) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={onBack} style={backBtnStyle}>← Back</button>
        </div>
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
          Loading project detail...
        </div>
      </>
    );
  }

  const STATUS_LABELS: Record<string, string> = {
    focus: '⚡', next: '→', inbox: '📥', waiting: '⏳', scheduled: '📅', someday: '💭', done: '✓',
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <button onClick={onBack} style={backBtnStyle}>←</button>
        <div className="mode-header" style={{ marginBottom: 0 }}>
          <div className="mode-title">{detail.label}</div>
          <StatusPill status={detail.status} color={detail.color} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8, paddingLeft: 40 }}>
        {detail.description}
      </div>

      {/* Stats row */}
      <div className="g3">
        <div className="card">
          <div className="card-lbl">Commits (7d)</div>
          <div className={`card-val ${detail.commitCount > 0 ? 'teal' : 'rose'}`}>{detail.commitCount}</div>
          <div className="card-note">{timeAgo(detail.lastCommit) || 'none'}</div>
        </div>
        <div className="card">
          <div className="card-lbl">Brain Items</div>
          <div className="card-val gold">{detail.brainItems}</div>
          <div className="card-note">{detail.blockedTasks} focus/next</div>
        </div>
        <div className="card">
          <div className="card-lbl">Deploy</div>
          <div className={`card-val ${detail.deployState === 'READY' ? 'teal' : detail.deployState === 'ERROR' ? 'rose' : 'gold'}`}>
            {detail.deployState || '—'}
          </div>
          <div className="card-note">{detail.deployUrl ? 'vercel' : 'no deploy'}</div>
        </div>
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <a href={detail.githubUrl} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
          GitHub →
        </a>
        {detail.deployUrl && (
          <a href={`https://${detail.deployUrl}`} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
            Live site →
          </a>
        )}
        <span style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--dim)', alignSelf: 'center', marginLeft: 'auto' }}>
          {detail.repo}
        </span>
      </div>

      {/* Commit timeline */}
      <div className="sec">Commits — last 7 days</div>
      {detail.commits.length === 0 ? (
        <div style={{ padding: '16px 0', color: 'var(--dim)', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
          No commits in the last 7 days
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {detail.commits.map((c, i) => (
            <div key={c.sha + i} style={commitRowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={shaStyle}>{c.sha}</span>
                <span style={{ fontSize: 11, color: 'var(--mid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {c.message}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <span style={commitMetaStyle}>{c.author}</span>
                <span style={commitMetaStyle}>{formatDate(c.date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brain items */}
      {detail.brainItemList.length > 0 && (
        <>
          <div className="sec" style={{ marginTop: 12 }}>Brain items tagged to this project</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {detail.brainItemList.map((item) => (
              <div key={item.id} className="task">
                <div className="tcheck" />
                <div className="task-body">
                  <div className="task-txt">
                    {item.title}
                    <span className={`tag ${item.type === 'project' ? 'f' : item.type === 'people' ? 'p' : 'o'}`}>{item.type}</span>
                  </div>
                  <div className="task-meta">
                    {STATUS_LABELS[item.status] || ''} {item.status} · {timeAgo(item.updated_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ──────────────────── Shared components ──────────────────── */

function StatusPill({ status, color }: { status: string; color: string }) {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    teal: { bg: 'rgba(61,232,176,.09)', border: 'rgba(61,232,176,.2)', text: 'var(--teal)' },
    rose: { bg: 'rgba(232,75,106,.09)', border: 'rgba(232,75,106,.2)', text: 'var(--rose)' },
    gold: { bg: 'rgba(232,176,75,.09)', border: 'rgba(232,176,75,.2)', text: 'var(--gold)' },
    dim:  { bg: 'var(--s1)', border: 'var(--b1)', text: 'var(--dim)' },
  };
  const s = styles[color] || styles.dim;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 8, fontFamily: "'IBM Plex Mono', monospace",
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

function Stat({ label, suffix }: { label: string; suffix?: string }) {
  return (
    <span style={{ fontSize: 8, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' as const }}>
      {label}{suffix ? ` ${suffix}` : ''}
    </span>
  );
}

/* ──────────────────── Inline styles ──────────────────── */

const backBtnStyle: React.CSSProperties = {
  background: 'var(--s2)',
  border: '1px solid var(--b2)',
  color: 'var(--mid)',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 11,
  fontFamily: "'IBM Plex Mono', monospace",
  cursor: 'pointer',
  flexShrink: 0,
};

const linkBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 5,
  fontSize: 9,
  fontFamily: "'IBM Plex Mono', monospace",
  background: 'var(--s1)',
  border: '1px solid var(--b1)',
  color: 'var(--gold)',
  textDecoration: 'none',
  cursor: 'pointer',
};

const commitRowStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 5,
  background: 'var(--s1)',
  border: '1px solid var(--b1)',
};

const shaStyle: React.CSSProperties = {
  fontSize: 9,
  fontFamily: "'IBM Plex Mono', monospace",
  color: 'var(--gold)',
  background: 'rgba(232,176,75,.08)',
  padding: '1px 5px',
  borderRadius: 3,
  flexShrink: 0,
};

const commitMetaStyle: React.CSSProperties = {
  fontSize: 8,
  color: 'var(--dim)',
  fontFamily: "'IBM Plex Mono', monospace",
};
