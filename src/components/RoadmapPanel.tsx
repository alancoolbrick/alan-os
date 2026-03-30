import { useState, useEffect } from 'react';

type ItemStatus = 'done' | 'active' | 'planned';
type PhaseStatus = 'complete' | 'active' | 'next' | 'future';

interface RoadmapItem { title: string; meta: string; status: ItemStatus }
interface Phase { badge: PhaseStatus; title: string; items: RoadmapItem[] }
interface Stats { brainItems: number; embedded: number; aiTasks: number; liveApps: number }

const PHASES: Phase[] = [
  {
    badge: 'complete', title: 'Foundation',
    items: [
      { title: 'WhatsApp agent on Railway', meta: 'Twilio webhook · persistent Node.js · ~$5/mo · 17 Mar', status: 'done' },
      { title: '/save /brief /zoom /audit commands', meta: 'Classify + embed · semantic search · Cosmic Zoom · corpus audit · 17–23 Mar', status: 'done' },
      { title: '512-dim embedding migration', meta: '1536 → 512 · 66% storage saving · HNSW index · 19 Mar', status: 'done' },
      { title: 'Brain Dashboard + ALAN OS deployed', meta: 'Vercel · Next.js · Two separate apps · 17–19 Mar', status: 'done' },
      { title: 'Daily digest + weekly review + meta-review crons', meta: '7am daily · Sun 9am weekly · Sun 9:30am meta-review · 17–24 Mar', status: 'done' },
      { title: 'Doer classification (human/ai)', meta: 'Column + CHECK · classifier prompt · flag_ai_tasks trigger · 19 Mar', status: 'done' },
      { title: 'Chat mode (conversational RAG)', meta: 'Vector search + keyword fallback · 3-turn history · 22 Mar', status: 'done' },
      { title: 'Voice note transcription (Whisper)', meta: 'Audio → transcript → chat mode · 22 Mar', status: 'done' },
    ],
  },
  {
    badge: 'complete', title: 'AI Executor',
    items: [
      { title: '6 executor handlers live on Railway', meta: 'research · draft · embed · notify · cleanup · generic · 60s poll · 23 Mar', status: 'done' },
      { title: 'AI Queue dashboard page', meta: '/ai-queue · grouped by status · 30s refresh · 23 Mar', status: 'done' },
      { title: 'Executor tag routing in classifier', meta: 'Auto-assigned on /save based on task type · 23 Mar', status: 'done' },
    ],
  },
  {
    badge: 'complete', title: 'Self-Improving Brain',
    items: [
      { title: '/audit command — corpus + security audit', meta: '12 diagnostics · Claude analysis · health score · security posture check · 23 Mar', status: 'done' },
      { title: 'Security hardening — RLS + RPC lockdown', meta: 'Removed anon DELETE · restricted INSERT · column protection · locked RPCs · 23 Mar', status: 'done' },
      { title: 'revision_count + diagnostic views', meta: 'v_brain_health · v_tag_health · v_stale_items · v_most_revised · 23 Mar', status: 'done' },
      { title: 'Brain control manual', meta: 'All commands · architecture diagram · full system reference · 23 Mar', status: 'done' },
    ],
  },
  {
    badge: 'complete', title: 'Memory + Identity Layer',
    items: [
      { title: 'Mem0 Platform identity layer seeded', meta: '42 core_memory entries → Mem0 user alan-coolbrick · 25 Mar', status: 'done' },
      { title: 'Mem0 weekly backup wired to scheduler', meta: 'Sunday 10:00 UTC · auto-commit to GitHub · 25 Mar', status: 'done' },
      { title: 'Watchdog system (daily self-healing)', meta: '6:45am UTC · logs to Brain inbox · WhatsApp only when human needed · 24 Mar', status: 'done' },
    ],
  },
  {
    badge: 'complete', title: 'Tooling + MCP Connections',
    items: [
      { title: 'Antigravity fully MCP\'d', meta: 'Supabase (20 tools) + GitHub (26 tools) + Context7 (2 tools) · 29 Mar', status: 'done' },
      { title: 'Claude.ai: Supabase + GitHub MCP', meta: 'Connected in this project · Mar 2026', status: 'done' },
      { title: 'Claude Desktop: Railway + Supabase + GitHub + Context7 MCP', meta: 'Config at ~/Library/Application Support/Claude/ · Mar 2026', status: 'done' },
      { title: 'COHO API integrated (direct REST)', meta: 'Properties + rooms + tenancies + maintenance + rent · Bearer auth · Mar 2026', status: 'done' },
    ],
  },
  {
    badge: 'complete', title: 'ALAN OS Live Data',
    items: [
      { title: 'Property panel — live from COHO API', meta: 'PropertyPanel.tsx · occupancy, rent, room grid · 29 Mar', status: 'done' },
      { title: 'Focus panel — live from Supabase', meta: 'FocusPanel.tsx · inbox/next/waiting/done + doer filter · 29 Mar', status: 'done' },
      { title: 'People panel — live from Supabase', meta: 'PeoplePanel.tsx · contact cards from items · 29 Mar', status: 'done' },
      { title: 'Action Stream — live signals', meta: 'ActionStream.tsx · Supabase + COHO combined · 29 Mar', status: 'done' },
    ],
  },
  {
    badge: 'active', title: 'ALAN OS ← Brain Dashboard Migration',
    items: [
      { title: 'Session 1: Foundation — convert alan-os to Next.js/TypeScript', meta: 'Upgrade deps · copy 10 components + 4 API routes from Brain · FocusPanel wrapper · ~2 hrs', status: 'done' },
      { title: 'Session 2: Shell integration — build ALAN OS chrome as React', meta: 'Convert patch files to components · wire panel switching · global Cmd+K + ContextWing · ~1.5 hrs', status: 'done' },
      { title: 'Session 3: Polish + deploy', meta: 'Delete old files · Vercel env vars · smoke test all panels · update AGENTS.md · ~1 hr', status: 'active' },
      { title: 'CSS dark-theme adaptation', meta: 'Brain light theme → ALAN OS dark theme · biggest risk in the migration', status: 'active' },
    ],
  },
  {
    badge: 'active', title: 'Three-Agent Pipeline',
    items: [
      { title: 'Architecture spec + agent_relay table + missions table', meta: 'Gemini Eyes + Claude Brain + Cowork Hands · Supabase coordination · 29 Mar', status: 'done' },
      { title: '2 missions seeded', meta: 'Hammock Morning Check (8 steps) · COHO Occupancy Check (7 steps) · 29 Mar', status: 'done' },
      { title: 'Wire Gemini agent code to agent_relay', meta: 'OpenClaw repo · reads missions · posts observations · awaits decisions', status: 'planned' },
      { title: 'Wire Cowork as Hands executor', meta: 'Reads action commands from relay · drives browser + terminal', status: 'planned' },
      { title: 'First end-to-end autonomous mission', meta: 'Hammock morning arrears check without Alan touching anything', status: 'planned' },
    ],
  },
  {
    badge: 'active', title: 'Data Hygiene',
    items: [
      { title: 'Embeddings nearly complete', meta: '157 of 158 embedded · 1 remaining · was 20 missing on 22 Mar', status: 'done' },
      { title: '39 untagged items', meta: '25% of corpus · degrading filters and automation', status: 'planned' },
      { title: 'Inbox at 1 — maintain inbox zero habit', meta: 'Was 26 on 23 Mar · weekly 20-min triage pass', status: 'done' },
    ],
  },
  {
    badge: 'next', title: 'Brain Intelligence',
    items: [
      { title: '/brief uses items + core_memory together', meta: 'Currently only searches items · core_memory has identity/property/contact context', status: 'planned' },
      { title: 'Cross-reference People → Areas → Projects', meta: 'Surface related context across types automatically', status: 'planned' },
      { title: 'Classification feedback loop', meta: 'High revision_count → auto-adjust classifier prompt', status: 'planned' },
      { title: 'Auto-execute trivial audit fixes', meta: 'Singleton cleanup · archive stale items · needs WhatsApp confirmation', status: 'planned' },
    ],
  },
  {
    badge: 'next', title: 'New Capabilities',
    items: [
      { title: 'PDF ingestion pipeline', meta: 'Extract → Claude structures to JSON → embed → store', status: 'planned' },
      { title: 'YouTube auto-vectorise on /save with URL', meta: 'Detect YouTube URLs · youtube-transcript.io · embed', status: 'planned' },
      { title: '/remind command', meta: 'Natural language date parsing · scheduled WhatsApp notifications', status: 'planned' },
      { title: 'Burkeman Mode (/burkeman)', meta: 'Anti-optimisation weekly review · Sun 6pm · Opus model · spec ready', status: 'planned' },
      { title: 'Custom domain for ALAN OS', meta: 'os.coolbrick.com · Vercel custom domain setup', status: 'planned' },
    ],
  },
  {
    badge: 'future', title: 'Knowledge Layer',
    items: [
      { title: 'Gmail + Calendar + transactions ingestion', meta: 'knowledge_chunks + transactions tables · architecture doc ready', status: 'planned' },
      { title: 'Screenpipe for persistent visual memory', meta: 'Phase 2 of three-agent pipeline · screen observation context', status: 'planned' },
      { title: 'Tenant triage bot via COHO messaging', meta: 'Awaiting COHO messaging API response · RAG against property manuals', status: 'planned' },
      { title: 'COHO maintenance auto-triage via API', meta: 'Classify requests · route to John · scheduled in Brain', status: 'planned' },
    ],
  },
  {
    badge: 'future', title: 'Infrastructure',
    items: [
      { title: 'Build COHO MCP server', meta: 'Wrap REST API · replace browser automation · faster + more reliable', status: 'planned' },
      { title: 'Hammock API access', meta: 'No public API · Finance panel blocked until this exists', status: 'planned' },
    ],
  },
];

const BADGE_STYLES: Record<PhaseStatus, { bg: string; color: string; label: string }> = {
  complete: { bg: 'rgba(61,232,176,0.12)', color: 'var(--teal)', label: 'Complete' },
  active:   { bg: 'rgba(232,176,75,0.12)', color: 'var(--gold)', label: 'In Progress' },
  next:     { bg: 'rgba(100,160,255,0.12)', color: '#85B7EB', label: 'Next Up' },
  future:   { bg: 'rgba(255,255,255,0.05)', color: 'var(--dim)', label: 'Future' },
};

export default function RoadmapPanel() {
  const [stats, setStats] = useState<Stats>({ brainItems: 0, embedded: 0, aiTasks: 0, liveApps: 5 });

  useEffect(() => {
    const SU = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const SK = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!SU || !SK) return;
    fetch(`${SU}/rest/v1/items?select=id,embedding,doer,archived&archived=not.eq.true&limit=500`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((items: any[]) => {
        setStats({
          brainItems: items.length,
          embedded: items.filter((i) => i.embedding).length,
          aiTasks: items.filter((i) => i.doer === 'ai').length,
          liveApps: 5,
        });
      })
      .catch(() => {});
  }, []);

  const totalDone = PHASES.reduce((s, p) => s + p.items.filter((i) => i.status === 'done').length, 0);
  const totalItems = PHASES.reduce((s, p) => s + p.items.length, 0);

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mode-header">
        <div className="mode-title">Roadmap</div>
        <div className="mode-sub">updated 30 March 2026</div>
      </div>

      <div style={statsGrid}>
        <StatCard value={stats.brainItems} label="Brain items" />
        <StatCard value={stats.embedded} label="Embedded" />
        <StatCard value={stats.aiTasks} label="AI tasks" />
        <StatCard value={stats.liveApps} label="Live apps" />
      </div>

      <div style={decisionStyle}>
        <strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Decision made 30 March:</strong>
        ALAN OS absorbs the Brain Dashboard. The Brain Dashboard stays alive as a fallback/admin view. ALAN OS becomes the daily driver. Migration underway — 3 sessions planned.
      </div>

      <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 20, fontFamily: "'IBM Plex Mono', monospace" }}>
        {totalDone} of {totalItems} milestones complete
      </div>

      {PHASES.map((phase, pi) => (
        <div key={pi} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <PhaseBadge status={phase.badge} />
            <span style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>{phase.title}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {phase.items.map((item, ii) => (
              <div key={ii} style={{ ...itemStyle, opacity: item.status === 'done' ? 0.6 : 1 }}>
                <CheckCircle done={item.status === 'done'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mid)', lineHeight: 1.4 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, lineHeight: 1.4, fontFamily: "'IBM Plex Mono', monospace" }}>{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'var(--dim)', fontFamily: "'IBM Plex Mono', monospace" }}>
        Coolbrick Brain + ALAN OS Roadmap<br />Last updated: 30 March 2026
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '10px 12px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PhaseBadge({ status }: { status: PhaseStatus }) {
  const s = BADGE_STYLES[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
      textTransform: 'uppercase' as const, letterSpacing: '0.8px',
      background: s.bg, color: s.color,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {s.label}
    </span>
  );
}

function CheckCircle({ done }: { done: boolean }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: done ? '2px solid var(--teal)' : '2px solid var(--b2)',
      background: done ? 'var(--teal)' : 'transparent',
    }}>
      {done && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

const statsGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16,
};

const decisionStyle: React.CSSProperties = {
  background: 'rgba(61,232,176,0.08)', border: '1px solid rgba(61,232,176,0.2)',
  borderRadius: 10, padding: '14px 18px', marginBottom: 16,
  fontSize: 13, color: 'var(--teal)', lineHeight: 1.6,
};

const itemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '10px 14px', background: 'var(--s1)', borderRadius: 8,
};
