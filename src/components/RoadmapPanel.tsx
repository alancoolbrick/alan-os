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

export default function RoadmapPanel() {
  const [data, setData] = useState<RoadmapData | null>(null);
  const [error, setError] = useState(false);

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
    const id = setInterval(fetchData, 300_000); // 5 min
    return () => clearInterval(id);
  }, [fetchData]);

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

      {/* Summary cards */}
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

      {/* Projects grouped by category */}
      {CATEGORIES.map((cat) => {
        const catProjects = projects.filter((p) => p.category === cat);
        if (!catProjects.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div className="sec">{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {catProjects.map((p) => (
                <div key={p.id} className="prow" style={{ gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 500 }}>{p.label}</span>
                      <StatusPill status={p.status} color={p.color} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {p.lastCommitMsg || 'no recent activity'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 8, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' as const }}>
                      {p.commitCount} commits
                    </span>
                    <span style={{ fontSize: 8, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' as const }}>
                      {timeAgo(p.lastCommit) || 'no commits'}
                    </span>
                    {p.deployState && (
                      <span style={{ fontSize: 8, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' as const }}>
                        {p.deployState === 'READY' ? '✓ deployed' : `⚠ ${p.deployState.toLowerCase()}`}
                      </span>
                    )}
                    {p.brainItems > 0 && (
                      <span style={{ fontSize: 8, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace", whiteSpace: 'nowrap' as const }}>
                        {p.brainItems} brain
                      </span>
                    )}
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
