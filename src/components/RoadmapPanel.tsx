import { useState, useEffect } from 'react';

type ItemStatus = 'done' | 'active' | 'planned';
type PhaseStatus = 'complete' | 'active' | 'next' | 'future';
type FeatureStatus = 'live' | 'building' | 'planned' | 'idea';

interface RoadmapItem { title: string; meta: string; status: ItemStatus }
interface Phase { badge: PhaseStatus; title: string; items: RoadmapItem[] }
interface Feature { name: string; description: string; status: FeatureStatus }
interface FeatureGroup { title: string; features: Feature[] }
interface Stats { brainItems: number; embedded: number; aiTasks: number; liveApps: number }

/* ═══ TAB: Delivery Phases (Hub-style) ═══ */
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
    badge: 'complete', title: 'ALAN OS ← Brain Dashboard Migration',
    items: [
      { title: 'Session 1: Foundation — convert alan-os to Next.js/TypeScript', meta: 'Upgrade deps · copy 10 components + 4 API routes from Brain · FocusPanel wrapper · ~2 hrs', status: 'done' },
      { title: 'Session 2: Shell integration — build ALAN OS chrome as React', meta: 'Convert patch files to components · wire panel switching · global Cmd+K + ContextWing · ~1.5 hrs', status: 'done' },
      { title: 'Session 3: Polish + deploy', meta: 'Delete old files · Vercel env vars · smoke test all panels · update AGENTS.md · shipped 30 Mar', status: 'done' },
      { title: 'CSS dark-theme adaptation', meta: 'Audit hardcoded colours → CSS variables · prefers-color-scheme · needs Alan visual review', status: 'planned' },
    ],
  },
  {
    badge: 'next', title: 'Three-Agent Pipeline',
    items: [
      { title: 'Architecture spec + agent_relay table + missions table', meta: 'Gemini Eyes + Claude Brain + Cowork Hands · Supabase coordination · 29 Mar', status: 'done' },
      { title: '2 missions seeded', meta: 'Hammock Morning Check (8 steps) · COHO Occupancy Check (7 steps) · 29 Mar', status: 'done' },
      { title: '/mission command — WhatsApp mission control', meta: 'Start/list/check missions · relay loop polling · shipped 31 Mar', status: 'done' },
      { title: 'Wire Gemini agent code to agent_relay', meta: 'OpenClaw repo · reads missions · posts observations · awaits decisions', status: 'planned' },
      { title: 'Wire Cowork as Hands executor', meta: 'Reads action commands from relay · drives browser + terminal', status: 'planned' },
      { title: 'First end-to-end autonomous mission', meta: 'Hammock morning arrears check without Alan touching anything', status: 'planned' },
    ],
  },
  {
    badge: 'complete', title: 'Data Hygiene',
    items: [
      { title: 'Embeddings complete — 0 missing', meta: '42 active items all embedded · watchdog self-heals any gaps · 1 Apr', status: 'done' },
      { title: 'Untagged items cleaned', meta: 'Was 39 untagged (25% of corpus) · all active items now tagged · 30 Mar', status: 'done' },
      { title: 'Inbox at 0 — inbox zero maintained', meta: 'Was 26 on 23 Mar · weekly triage pass · currently 0', status: 'done' },
      { title: 'Scheduler idempotency', meta: 'claim_scheduler_lock() prevents 5x firing on Railway restart · 31 Mar', status: 'done' },
    ],
  },
  {
    badge: 'active', title: 'Brain Intelligence',
    items: [
      { title: '/brief uses items + core_memory together', meta: 'Parallel query · core_memory grouped by category · shipped 25 Mar', status: 'done' },
      { title: 'Auto-archive done items + auto-dedup', meta: 'Watchdog self-heals: archives done-not-archived · deduplicates by title · 31 Mar', status: 'done' },
      { title: 'Stale item detector + auto-archive', meta: 'Watchdog archives items untouched 30+ days · excludes focus/scheduled · 31 Mar', status: 'done' },
      { title: 'Embedding quality audit RPC', meta: 'Flags short-content + stale embeddings · wired into watchdog · 1 Apr', status: 'done' },
      { title: 'Occupancy trend tracking', meta: 'Daily COHO snapshots to occupancy_log table · 7:30am cron · 1 Apr', status: 'done' },
      { title: 'Weekly HTML recap digest', meta: 'Styled report stored as Brain item · Sun 11am UTC · 1 Apr', status: 'done' },
      { title: 'Cross-reference People → Areas → Projects', meta: 'Surface related context across types automatically', status: 'planned' },
      { title: 'Classification feedback loop', meta: 'High revision_count → auto-adjust classifier prompt · needs more override data', status: 'planned' },
    ],
  },
  {
    badge: 'active', title: 'New Capabilities',
    items: [
      { title: 'YouTube auto-vectorise on /save with URL', meta: 'Detect YouTube URLs · fetch transcript · embed · shipped 30 Mar', status: 'done' },
      { title: '/remind command', meta: 'Natural language date parsing · 15-min cron check · WhatsApp delivery · shipped 30 Mar', status: 'done' },
      { title: '/burkeman — Sunday philosophical reflection', meta: 'Queries week activity + focus + core_memory · Sun 6pm UTC cron · shipped 31 Mar', status: 'done' },
      { title: '/status — instant brain health snapshot', meta: 'No Claude call · item counts, inbox, embeddings, AI queue · shipped 31 Mar', status: 'done' },
      { title: '/coho — instant COHO portfolio snapshot', meta: 'Occupancy %, voids, open maintenance via API · no Claude call · shipped 31 Mar', status: 'done' },
      { title: '/help — command discoverability', meta: 'Lists all 11 available commands · shipped 31 Mar', status: 'done' },
      { title: '/mission — three-agent mission control', meta: 'Start/list/check missions via WhatsApp · agent_relay table · shipped 31 Mar', status: 'done' },
      { title: '/focus — daily focus digest', meta: 'Returns focus items with next actions · wired into daily digest · shipped 1 Apr', status: 'done' },
      { title: '/tag — tag browsing and management', meta: 'List all tags · search by tag · add/remove tags · shipped 1 Apr', status: 'done' },
      { title: '/find — fast keyword search', meta: 'Instant ILIKE search · no Claude call · <1 second · shipped 1 Apr', status: 'done' },
      { title: 'PDF auto-vectorise on /save', meta: 'Detect PDF URLs · Claude text extraction · 10MB limit · shipped 31 Mar', status: 'done' },
      { title: 'Hybrid search for /brief', meta: '30% keyword + 70% vector via search_brain_hybrid RPC · shipped 31 Mar', status: 'done' },
      { title: 'Command dedup guard', meta: 'check_brain_command_dedup() prevents duplicate processing · shipped 31 Mar', status: 'done' },
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
      { title: 'COHO MCP server built', meta: '14 tools wrapping REST API · installable in Claude Desktop/Antigravity · shipped 30 Mar', status: 'done' },
      { title: 'Roadmap stats auto-updater', meta: '6:50am daily cron · auto-commits to repo if changed · 31 Mar', status: 'done' },
      { title: 'Mem0 weekly backup', meta: 'Sunday 10am UTC · auto-commits mem0-backup.json to GitHub · 31 Mar', status: 'done' },
      { title: 'Hammock API access', meta: 'No public API · Finance panel blocked until this exists', status: 'planned' },
    ],
  },
];

/* ═══ TAB: Product Features (Brain Dashboard style) ═══ */
const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'Capture',
    features: [
      { name: 'WhatsApp message capture', description: 'Send any message via WhatsApp and it lands in your inbox automatically', status: 'live' },
      { name: 'AI classification', description: 'Every incoming message is classified by type with AI-suggested status', status: 'live' },
      { name: 'AI next actions', description: '3 suggested next actions generated per item', status: 'live' },
      { name: 'Quick add from dashboard', description: 'Type into the quick-add bar to create items directly', status: 'live' },
      { name: '/save command', description: 'Bulk-save Claude session outputs to your brain via WhatsApp', status: 'live' },
      { name: 'Voice note capture', description: 'Send voice notes via WhatsApp, transcribe and classify them', status: 'live' },
      { name: 'YouTube auto-vectorise', description: 'Send a YouTube URL via /save — transcript extracted and embedded', status: 'live' },
      { name: 'PDF auto-vectorise', description: 'Send a PDF URL via /save — text extracted via Claude and embedded', status: 'live' },
      { name: 'Email capture', description: 'Forward emails to an inbox address and have them classified', status: 'planned' },
      { name: 'Fireflies meeting capture', description: 'Auto-import action items from meeting transcripts', status: 'planned' },
      { name: 'Photo/document capture', description: 'Send photos of documents — extract text and classify', status: 'idea' },
    ],
  },
  {
    title: 'Organisation & Triage',
    features: [
      { name: 'Unified inbox', description: 'Everything lands in inbox first — you decide where it goes', status: 'live' },
      { name: 'Status-based views', description: 'Inbox, Focus, Next, Waiting, Scheduled, Someday, Logbook', status: 'live' },
      { name: 'Type-based views', description: 'Filter by Projects, People, Ideas, Admin, Areas', status: 'live' },
      { name: 'Tag views', description: 'Auto-collected tags in sidebar, click to filter', status: 'live' },
      { name: 'Drag-and-drop triage', description: 'Drag cards onto status drop zones', status: 'live' },
      { name: 'Inline editing', description: 'Click any card to edit title, notes, type, status, due date', status: 'live' },
      { name: 'Bulk actions', description: 'Select multiple items and move, tag, or archive at once', status: 'planned' },
      { name: 'Smart lists', description: 'Auto-generated views: overdue, stale items, due this week', status: 'planned' },
      { name: 'Subtasks & dependencies', description: 'Nest items under parents, track blocking relationships', status: 'idea' },
    ],
  },
  {
    title: 'Search & Retrieval',
    features: [
      { name: 'Text search', description: 'Search across titles, content, and next actions', status: 'live' },
      { name: '/brief command', description: 'Hybrid semantic + keyword search via WhatsApp (30% keyword + 70% vector)', status: 'live' },
      { name: '/find command', description: 'Instant keyword search — no Claude call, <1 second', status: 'live' },
      { name: '/tag command', description: 'Browse all tags, search by tag, add/remove tags from WhatsApp', status: 'live' },
      { name: 'Semantic search in dashboard', description: 'Vector-powered search — find items by meaning', status: 'live' },
      { name: 'Context Wing', description: 'Slide-out panel showing related items for any selection', status: 'live' },
      { name: 'Saved searches', description: 'Save frequent searches as sidebar shortcuts', status: 'idea' },
    ],
  },
  {
    title: 'Digests & Automation',
    features: [
      { name: 'Daily digest', description: 'Morning WhatsApp summary of focus items and due dates (7am)', status: 'live' },
      { name: 'Weekly review', description: 'Sunday summary of wins, open items, suggested actions (9am)', status: 'live' },
      { name: 'Recurring tasks', description: 'Daily, weekly, monthly recurrence with auto-generated instances', status: 'live' },
      { name: 'Deferred items', description: 'Set a defer date — item hides until that date', status: 'live' },
      { name: 'AI executor', description: '6 autonomous handlers running on 60s poll loop', status: 'live' },
      { name: 'Reminders', description: '/remind command with natural language parsing + 15-min cron delivery', status: 'live' },
      { name: 'Auto-archive stale items', description: 'Watchdog auto-archives done-not-archived + stale 30d + deduplicates daily', status: 'live' },
      { name: 'Occupancy trend tracking', description: 'Daily COHO snapshots logged to occupancy_log for trend analysis', status: 'live' },
      { name: 'Embedding quality audit', description: 'Watchdog flags items with weak or stale embeddings', status: 'live' },
      { name: 'Weekly HTML recap', description: 'Styled HTML digest with Brain + COHO stats stored as Brain item', status: 'live' },
    ],
  },
  {
    title: 'Dashboard & UX',
    features: [
      { name: 'Unified card design', description: 'All items look the same — title, type pill, next action checkboxes, meta badges', status: 'live' },
      { name: 'Mobile responsive', description: 'Slide-out sidebar, touch-friendly cards, safe area support', status: 'live' },
      { name: 'Keyboard shortcuts', description: 'Press N to quick-add, Escape to close modals', status: 'live' },
      { name: 'Settings page', description: 'Configure AI behaviour, digest times, default views, and data management', status: 'building' },
      { name: 'Dark mode', description: 'Toggle dark theme for the dashboard', status: 'planned' },
      { name: 'PWA / installable app', description: 'Install the dashboard as a home screen app on mobile', status: 'planned' },
      { name: 'Authentication', description: 'Login to protect your brain — currently open access', status: 'planned' },
      { name: 'Dashboard widgets', description: 'At-a-glance stats: items processed this week, overdue count, focus streak', status: 'idea' },
    ],
  },
  {
    title: 'Infrastructure',
    features: [
      { name: 'Supabase (Postgres + pgvector)', description: 'Unified items table with vector embeddings for semantic search', status: 'live' },
      { name: 'Railway backend', description: 'Node.js/Express agent handling WhatsApp webhooks and AI pipeline', status: 'live' },
      { name: 'Vercel frontend', description: 'Next.js dashboard deployed on Vercel', status: 'live' },
      { name: 'Twilio WhatsApp', description: 'WhatsApp sandbox for message capture', status: 'live' },
      { name: 'WhatsApp Business number', description: 'Dedicated number — no more 72-hour sandbox expiry', status: 'planned' },
      { name: 'Row-level security', description: 'Supabase tables locked down with RLS policies', status: 'live' },
      { name: 'Automated backups', description: 'Scheduled exports of all items data', status: 'idea' },
    ],
  },
];

const FEATURE_BADGE: Record<FeatureStatus, { label: string; bg: string; color: string }> = {
  live:     { label: 'LIVE',     bg: 'rgba(61,232,176,0.12)', color: 'var(--teal)' },
  building: { label: 'BUILDING', bg: 'rgba(232,176,75,0.12)', color: 'var(--gold)' },
  planned:  { label: 'PLANNED',  bg: 'rgba(100,160,255,0.12)', color: '#85B7EB' },
  idea:     { label: 'IDEA',     bg: 'rgba(180,130,255,0.12)', color: '#AFA9EC' },
};

const PHASE_BADGE: Record<PhaseStatus, { bg: string; color: string; label: string }> = {
  complete: { bg: 'rgba(61,232,176,0.12)', color: 'var(--teal)', label: 'Complete' },
  active:   { bg: 'rgba(232,176,75,0.12)', color: 'var(--gold)', label: 'In Progress' },
  next:     { bg: 'rgba(100,160,255,0.12)', color: '#85B7EB', label: 'Next Up' },
  future:   { bg: 'rgba(255,255,255,0.05)', color: 'var(--dim)', label: 'Future' },
};

const mono = "'IBM Plex Mono', monospace";

export default function RoadmapPanel() {
  const [tab, setTab] = useState<'delivery' | 'features'>('delivery');
  const [featureFilter, setFeatureFilter] = useState<FeatureStatus | 'all'>('all');
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
          embedded: items.filter((i: any) => i.embedding).length,
          aiTasks: items.filter((i: any) => i.doer === 'ai').length,
          liveApps: 5,
        });
      })
      .catch(() => {});
  }, []);

  const totalDone = PHASES.reduce((s, p) => s + p.items.filter((i) => i.status === 'done').length, 0);
  const totalItems = PHASES.reduce((s, p) => s + p.items.length, 0);

  const featureTotals = { live: 0, building: 0, planned: 0, idea: 0 };
  FEATURE_GROUPS.forEach((g) => g.features.forEach((f) => { featureTotals[f.status]++; }));

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="mode-header">
        <div className="mode-title">Roadmap</div>
        <div className="mode-sub">updated 30 March 2026</div>
      </div>

      {/* Stats */}
      <div style={statsGrid}>
        <StatCard value={stats.brainItems} label="Brain items" />
        <StatCard value={stats.embedded} label="Embedded" />
        <StatCard value={stats.aiTasks} label="AI tasks" />
        <StatCard value={stats.liveApps} label="Live apps" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <TabBtn active={tab === 'delivery'} onClick={() => setTab('delivery')}>Delivery</TabBtn>
        <TabBtn active={tab === 'features'} onClick={() => setTab('features')}>Features</TabBtn>
      </div>

      {tab === 'delivery' ? (
        <>
          {/* Decision callout */}
          <div style={decisionStyle}>
            <strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Decision made 30 March:</strong>
            ALAN OS absorbs the Brain Dashboard. The Brain Dashboard stays alive as a fallback/admin view. ALAN OS becomes the daily driver. Migration underway — 3 sessions planned.
          </div>

          <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 20, fontFamily: mono }}>
            {totalDone} of {totalItems} milestones complete
          </div>

          {PHASES.map((phase, pi) => (
            <div key={pi} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Badge bg={PHASE_BADGE[phase.badge].bg} color={PHASE_BADGE[phase.badge].color}>{PHASE_BADGE[phase.badge].label}</Badge>
                <span style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>{phase.title}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {phase.items.map((item, ii) => (
                  <div key={ii} style={{ ...itemRow, opacity: item.status === 'done' ? 0.6 : 1 }}>
                    <CheckCircle done={item.status === 'done'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mid)', lineHeight: 1.4 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, lineHeight: 1.4, fontFamily: mono }}>{item.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Feature filter pills — clickable */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
            <FilterBadge active={featureFilter === 'all'} onClick={() => setFeatureFilter('all')}
              bg="rgba(255,255,255,0.05)" color="var(--dim)">All ({Object.values(featureTotals).reduce((a, b) => a + b, 0)})</FilterBadge>
            {(Object.entries(featureTotals) as [FeatureStatus, number][]).map(([status, count]) => (
              <FilterBadge key={status} active={featureFilter === status} onClick={() => setFeatureFilter(status)}
                bg={FEATURE_BADGE[status].bg} color={FEATURE_BADGE[status].color}>{FEATURE_BADGE[status].label} ({count})</FilterBadge>
            ))}
          </div>

          {featureFilter === 'all' ? (
            /* Grouped by category */
            FEATURE_GROUPS.map((group, gi) => (
              <div key={gi} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "'Syne', sans-serif", marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--b1)' }}>
                  {group.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {group.features.map((f, fi) => {
                    const badge = FEATURE_BADGE[f.status];
                    return (
                      <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--s1)', borderRadius: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mid)' }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1, fontFamily: mono }}>{f.description}</div>
                        </div>
                        <Badge bg={badge.bg} color={badge.color}>{badge.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            /* Flat list filtered by status */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {FEATURE_GROUPS.flatMap((g) => g.features.filter((f) => f.status === featureFilter).map((f) => ({...f, group: g.title}))).map((f, fi) => {
                const badge = FEATURE_BADGE[f.status];
                return (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--s1)', borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mid)' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1, fontFamily: mono }}>{f.description}</div>
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--dim)', fontFamily: mono, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{f.group}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'var(--dim)', fontFamily: mono }}>
        Coolbrick Brain + ALAN OS Roadmap<br />Last updated: 1 April 2026
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

function Badge({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
      textTransform: 'uppercase' as const, letterSpacing: '0.8px',
      background: bg, color, fontFamily: mono, whiteSpace: 'nowrap' as const, flexShrink: 0,
    }}>
      {children}
    </span>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
      fontFamily: mono, border: '1px solid ' + (active ? 'var(--gold)' : 'var(--b1)'),
      background: active ? 'rgba(232,176,75,0.1)' : 'transparent',
      color: active ? 'var(--gold)' : 'var(--dim)', cursor: 'pointer',
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

function FilterBadge({ active, onClick, bg, color, children }: { active: boolean; onClick: () => void; bg: string; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 6,
      textTransform: 'uppercase' as const, letterSpacing: '0.6px',
      background: active ? bg : 'transparent',
      color: active ? color : 'var(--dim)',
      border: active ? `1px solid ${color}` : '1px solid var(--b1)',
      fontFamily: mono, cursor: 'pointer', transition: 'all 0.15s',
      opacity: active ? 1 : 0.6,
    }}>
      {children}
    </button>
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

const itemRow: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '10px 14px', background: 'var(--s1)', borderRadius: 8,
};
