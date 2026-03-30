import type { NextApiRequest, NextApiResponse } from 'next';

interface Milestone {
  title: string;
  detail: string;
  status: 'done' | 'active' | 'planned';
  date?: string;
}

interface ProjectConfig {
  id: string;
  repo: string;
  category: 'Core' | 'Tools' | 'Experimental';
  label: string;
  tags: string[];
  description: string;
  decision?: string;
  milestones: Milestone[];
}

const PROJECTS: ProjectConfig[] = [
  {
    id: 'alan-os', repo: 'AlanCoolbrick/alan-os', category: 'Core', label: 'ALAN OS',
    tags: ['alan-os', 'os'],
    description: 'Universal interface — property, finance, focus, people, brain, roadmap panels',
    decision: 'ALAN OS absorbs the Brain Dashboard. Brain Dashboard stays alive as fallback/admin view. ALAN OS becomes the daily driver.',
    milestones: [
      { title: 'Foundation — Next.js/TypeScript conversion', detail: 'Upgrade deps · copy 10 components + 4 API routes from Brain · FocusPanel wrapper', status: 'done', date: '29 Mar' },
      { title: 'Shell integration — multi-panel chrome', detail: 'Topbar · sidebar nav · panel switching · Cmd+K · Action Stream · live clock', status: 'done', date: '30 Mar' },
      { title: 'Live data panels', detail: 'Property (COHO API) · People (Supabase) · Brain (Supabase) · Finance (hardcoded)', status: 'done', date: '30 Mar' },
      { title: 'Roadmap panel — auto-derived from GitHub + Brain', detail: 'API route fetching commits + deploys + Brain items · editorial milestones', status: 'done', date: '30 Mar' },
      { title: 'Rooms Tracker panel', detail: 'Live COHO room data · vacancy status · days empty · grouped by property', status: 'done', date: '30 Mar' },
      { title: 'Polish + deploy', detail: 'Delete old files · Vercel env vars · smoke test all panels · update AGENTS.md', status: 'active' },
      { title: 'CSS dark-theme adaptation', detail: 'Brain light theme → ALAN OS dark theme · biggest risk in the migration', status: 'planned' },
      { title: 'Claude panel — live streaming', detail: 'Wire /api/claude to real Claude API · Brain-aware context · quick-send from other panels', status: 'planned' },
      { title: 'Finance panel — Hammock integration', detail: 'Blocked on Hammock API · currently hardcoded company data', status: 'planned' },
    ],
  },
  {
    id: 'coolbrick-agent', repo: 'AlanCoolbrick/coolbrick-agent', category: 'Core', label: 'Coolbrick Brain',
    tags: ['brain', 'coolbrick-brain', 'coolbrick-agent'],
    description: 'WhatsApp agent, classifier, embeddings, AI executor, scheduler',
    milestones: [
      { title: 'WhatsApp agent on Railway', detail: 'Twilio webhook · persistent Node.js · ~$5/mo', status: 'done', date: '17 Mar' },
      { title: '/save /brief /zoom /audit commands', detail: 'Classify + embed · semantic search · Cosmic Zoom · corpus audit', status: 'done', date: '17–23 Mar' },
      { title: '512-dim embedding migration', detail: '1536 → 512 · 66% storage saving · HNSW index', status: 'done', date: '19 Mar' },
      { title: 'Daily digest + weekly review + meta-review crons', detail: '7am daily · Sun 9am weekly · Sun 9:30am meta-review', status: 'done', date: '17–24 Mar' },
      { title: 'AI executor — 6 autonomous handlers', detail: 'research · draft · embed · notify · cleanup · generic · 60s polling loop', status: 'done', date: '22–24 Mar' },
      { title: 'Watchdog system', detail: '6:45am UTC daily · self-heals · WhatsApp summary only when human needed', status: 'done', date: '24 Mar' },
      { title: 'Mem0 memory layer', detail: 'Platform integration · weekly backup · core_memory seed', status: 'done', date: '25 Mar' },
      { title: 'RLS hardening + security audit', detail: 'No anon DELETE · column protection trigger · 5 views · security_audit() RPC', status: 'done', date: '23 Mar' },
      { title: 'Chat mode — conversational RAG', detail: 'No slash prefix triggers semantic search + Claude synthesis', status: 'active' },
      { title: 'Scheduler dedup guard', detail: 'Fix 5x firing on Railway restart · idempotency lock', status: 'planned' },
    ],
  },
  {
    id: 'coolbrick-brain-app', repo: 'AlanCoolbrick/coolbrick-brain-app', category: 'Core', label: 'Brain Dashboard',
    tags: ['brain-app', 'dashboard'],
    description: 'Next.js dashboard for Brain items, search, AI queue — being absorbed into ALAN OS',
    decision: 'Brain Dashboard becomes fallback/admin view. ALAN OS is the daily driver going forward.',
    milestones: [
      { title: 'Dashboard deployed on Vercel', detail: 'Next.js + Tailwind · items browser · search', status: 'done', date: '17–19 Mar' },
      { title: 'AI Queue page', detail: 'Live view of executor tasks · claim/release status', status: 'done', date: '22 Mar' },
      { title: 'Production branch discipline', detail: 'main = preview · production = live · GitHub Actions auto-merge', status: 'done', date: '20 Mar' },
      { title: 'Migration to ALAN OS', detail: 'Components being copied to alan-os repo · Brain Dashboard kept as admin fallback', status: 'active' },
    ],
  },
  {
    id: 'rooms-tracker', repo: 'AlanCoolbrick/rooms-tracker', category: 'Tools', label: 'Rooms Tracker',
    tags: ['rooms-tracker', 'rooms'],
    description: 'Occupancy tracker pulling live COHO data',
    milestones: [
      { title: 'Static GitHub Pages app', detail: 'Room grid with COHO API · occupancy percentages · vacancy flags', status: 'done', date: 'Mar' },
      { title: 'Absorbed into ALAN OS', detail: 'RoomsPanel.tsx replaces standalone rooms-tracker app', status: 'done', date: '30 Mar' },
    ],
  },
  {
    id: 'coolbrick-hub', repo: 'AlanCoolbrick/coolbrick-hub', category: 'Tools', label: 'Coolbrick Hub',
    tags: ['hub', 'coolbrick-hub'],
    description: 'Central landing page for all Coolbrick tools + roadmap',
    milestones: [
      { title: 'Hub landing page', detail: 'Links to all tools · Brain health stats · live from Supabase', status: 'done', date: 'Mar' },
      { title: 'Roadmap page', detail: 'Editorial milestones for Brain + ALAN OS · decision callouts', status: 'done', date: '30 Mar' },
      { title: 'Hub becomes redundant', detail: 'ALAN OS replaces Hub as the single entry point', status: 'planned' },
    ],
  },
  {
    id: 'openclaw-gemini', repo: 'AlanCoolbrick/openclaw-gemini', category: 'Experimental', label: 'OpenClaw',
    tags: ['openclaw', 'gemini'],
    description: 'Gemini Live multimodal app — Eyes/Brain/Hands three-agent pipeline',
    decision: 'Path 1 (standalone Vercel + Railway WebSocket) vs Path 2 (merge into Brain dashboard) — decision pending.',
    milestones: [
      { title: 'Architecture spec', detail: 'Gemini Eyes + Claude Brain + Cowork Hands · agent_relay table · missions table', status: 'done', date: '29 Mar' },
      { title: 'Missions seeded', detail: 'Hammock Morning Check (8 steps) · COHO Occupancy Check (7 steps)', status: 'done', date: '29 Mar' },
      { title: 'Standalone app vs merge decision', detail: 'Path 1: Vercel + Railway WebSocket gateway · Path 2: merge into Brain dashboard', status: 'planned' },
      { title: 'Screenpipe integration', detail: 'Phase 2 — persistent visual memory for the three-agent pipeline', status: 'planned' },
    ],
  },
];

interface CommitInfo { sha: string; message: string; date: string; author: string; }
interface DeployInfo { state: string; url?: string; created?: number; }

interface ProjectSummary {
  id: string; label: string; category: string; repo: string; status: string; color: string;
  commitCount: number; lastCommit: string | null; deployState: string | null;
  brainItems: number; description: string;
  milestoneSummary: { done: number; active: number; planned: number; total: number };
}

interface ProjectDetail {
  id: string; label: string; category: string; repo: string; description: string;
  status: string; color: string; commitCount: number; lastCommit: string | null;
  deployState: string | null; deployUrl: string | null; brainItems: number; blockedTasks: number;
  decision: string | null; milestones: Milestone[];
  commits: CommitInfo[];
  brainItemList: { id: string; title: string; status: string; type: string; updated_at: string }[];
  githubUrl: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const GH = process.env.GITHUB_TOKEN || '';
  const VT = process.env.VERCEL_TOKEN || '';
  const SU = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SK = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const pid = req.query.project as string | undefined;
  const [commits, deploys, brain] = await Promise.all([
    fetchCommits(GH, since, pid ? 100 : 30), fetchDeploys(VT), fetchBrain(SU, SK),
  ]);
  if (pid) {
    const cfg = PROJECTS.find((p) => p.id === pid);
    if (!cfg) return res.status(404).json({ error: 'Not found' });
    const c = commits[cfg.repo] || []; const d = deploys[cfg.repo] || null;
    const b = brain.filter((i: any) => i.tags && cfg.tags.some((t) => i.tags.includes(t)));
    const bl = b.filter((i: any) => i.status === 'focus' || i.status === 'next');
    const { status, color } = deriveStatus(c, d, bl, b);
    const detail: ProjectDetail = {
      id: cfg.id, label: cfg.label, category: cfg.category, repo: cfg.repo,
      description: cfg.description, status, color, commitCount: c.length,
      lastCommit: c[0]?.date || null, deployState: d?.state || null,
      deployUrl: d?.url || null, brainItems: b.length, blockedTasks: bl.length,
      decision: cfg.decision || null, milestones: cfg.milestones, commits: c,
      brainItemList: b.map((i: any) => ({ id: i.id, title: i.title, status: i.status, type: i.type || 'task', updated_at: i.updated_at })),
      githubUrl: `https://github.com/${cfg.repo}`,
    };
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(detail);
  }
  const projects: ProjectSummary[] = PROJECTS.map((p) => {
    const c = commits[p.repo] || []; const d = deploys[p.repo] || null;
    const b = brain.filter((i: any) => i.tags && p.tags.some((t) => i.tags.includes(t)));
    const bl = b.filter((i: any) => i.status === 'focus' || i.status === 'next');
    const { status, color } = deriveStatus(c, d, bl, b);
    const ms = p.milestones;
    return {
      id: p.id, label: p.label, category: p.category, repo: p.repo, description: p.description,
      status, color, commitCount: c.length, lastCommit: c[0]?.date || null,
      deployState: d?.state || null, brainItems: b.length,
      milestoneSummary: { done: ms.filter((m) => m.status === 'done').length, active: ms.filter((m) => m.status === 'active').length, planned: ms.filter((m) => m.status === 'planned').length, total: ms.length },
    };
  });
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  return res.status(200).json({ projects, fetchedAt: new Date().toISOString() });
}

function deriveStatus(c: CommitInfo[], d: DeployInfo | null, bl: any[], b: any[]) {
  if (d && d.state === 'ERROR') return { status: 'Failing', color: 'rose' };
  if (c.length > 0 && (!d || d.state === 'READY')) return { status: 'Active', color: 'teal' };
  if (bl.length > 0 && c.length === 0) return { status: 'Blocked', color: 'gold' };
  if (c.length === 0 && b.length === 0) return { status: 'Parked', color: 'dim' };
  if (c.length === 0) return { status: 'Stale', color: 'gold' };
  return { status: 'Active', color: 'teal' };
}

async function fetchCommits(token: string, since: string, pp: number): Promise<Record<string, CommitInfo[]>> {
  if (!token) return {};
  const r: Record<string, CommitInfo[]> = {};
  await Promise.all(PROJECTS.map(async (p) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${p.repo}/commits?since=${since}&per_page=${pp}`, { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } });
      if (res.ok) { const d = await res.json(); r[p.repo] = d.map((c: any) => ({ sha: c.sha.slice(0, 7), message: c.commit.message.split('\n')[0].slice(0, 120), date: c.commit.committer.date, author: c.commit.author.name })); }
      else r[p.repo] = [];
    } catch { r[p.repo] = []; }
  }));
  return r;
}

async function fetchDeploys(token: string): Promise<Record<string, DeployInfo>> {
  if (!token) return {};
  const r: Record<string, DeployInfo> = {};
  try {
    const res = await fetch('https://api.vercel.com/v6/deployments?limit=20&state=READY,ERROR', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); (d.deployments || []).forEach((x: any) => { const repo = x.meta?.githubRepo; if (repo && !r[repo]) r[repo] = { state: x.state || x.readyState, url: x.url, created: x.created }; }); }
  } catch {}
  return r;
}

async function fetchBrain(url: string, key: string): Promise<any[]> {
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/items?select=id,title,status,type,tags,updated_at&archived=not.eq.true&order=updated_at.desc&limit=200`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (r.ok) return await r.json();
  } catch {}
  return [];
}
