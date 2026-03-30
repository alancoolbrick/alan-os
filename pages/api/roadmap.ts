import type { NextApiRequest, NextApiResponse } from 'next';

interface ProjectConfig {
  id: string;
  repo: string;
  category: 'Core' | 'Tools' | 'Experimental';
  label: string;
  tags: string[];
}

const PROJECTS: ProjectConfig[] = [
  { id: 'alan-os', repo: 'AlanCoolbrick/alan-os', category: 'Core', label: 'ALAN OS', tags: ['alan-os', 'os'] },
  { id: 'coolbrick-brain', repo: 'AlanCoolbrick/coolbrick-brain', category: 'Core', label: 'Coolbrick Brain', tags: ['brain', 'coolbrick-brain'] },
  { id: 'coolbrick-brain-app', repo: 'AlanCoolbrick/coolbrick-brain-app', category: 'Core', label: 'Brain Dashboard', tags: ['brain-app', 'dashboard'] },
  { id: 'coho-skill', repo: 'AlanCoolbrick/coho-skill', category: 'Tools', label: 'COHO Skill', tags: ['coho', 'coho-skill'] },
  { id: 'hammock-skill', repo: 'AlanCoolbrick/hammock-skill', category: 'Tools', label: 'Hammock Skill', tags: ['hammock', 'hammock-skill'] },
  { id: 'hinkley-model', repo: 'AlanCoolbrick/hinkley-model', category: 'Experimental', label: 'Hinkley Model', tags: ['hinkley', 'hinkley-model'] },
];

interface CommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface DeployInfo {
  state: string;
  url?: string;
  created?: number;
}

interface ProjectResult {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [commitResults, deployResults, brainItems] = await Promise.all([
    fetchAllCommits(GITHUB_TOKEN, since),
    fetchDeploys(VERCEL_TOKEN),
    fetchBrainItems(SUPABASE_URL, SUPABASE_KEY),
  ]);

  const projects: ProjectResult[] = PROJECTS.map((p) => {
    const commits = commitResults[p.repo] || [];
    const deploy = deployResults[p.repo] || null;
    const brain = brainItems.filter((i: any) => i.tags && p.tags.some((t) => i.tags.includes(t)));
    const blockedTasks = brain.filter((i: any) => i.status === 'focus' || i.status === 'next');
    const hasRecentCommits = commits.length > 0;
    const deployFailing = deploy && deploy.state === 'ERROR';
    const deployOk = !deploy || deploy.state === 'READY';

    let status: string, color: string;
    if (deployFailing) {
      status = 'Failing'; color = 'rose';
    } else if (hasRecentCommits && deployOk) {
      status = 'Active'; color = 'teal';
    } else if (blockedTasks.length > 0 && !hasRecentCommits) {
      status = 'Blocked'; color = 'gold';
    } else if (!hasRecentCommits && brain.length === 0) {
      status = 'Parked'; color = 'dim';
    } else if (!hasRecentCommits) {
      status = 'Stale'; color = 'gold';
    } else {
      status = 'Active'; color = 'teal';
    }

    return {
      id: p.id,
      label: p.label,
      category: p.category,
      repo: p.repo,
      status,
      color,
      commitCount: commits.length,
      lastCommit: commits.length > 0 ? commits[0].date : null,
      lastCommitMsg: commits.length > 0 ? commits[0].message : null,
      deployState: deploy ? deploy.state : null,
      brainItems: brain.length,
      blockedTasks: blockedTasks.length,
    };
  });

  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  return res.status(200).json({ projects, fetchedAt: new Date().toISOString() });
}

async function fetchAllCommits(token: string, since: string): Promise<Record<string, CommitInfo[]>> {
  if (!token) return {};
  const results: Record<string, CommitInfo[]> = {};
  await Promise.all(
    PROJECTS.map(async (p) => {
      try {
        const r = await fetch(`https://api.github.com/repos/${p.repo}/commits?since=${since}&per_page=30`, {
          headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
        });
        if (r.ok) {
          const data = await r.json();
          results[p.repo] = data.map((c: any) => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split('\n')[0].slice(0, 80),
            date: c.commit.committer.date,
            author: c.commit.author.name,
          }));
        } else {
          results[p.repo] = [];
        }
      } catch {
        results[p.repo] = [];
      }
    })
  );
  return results;
}

async function fetchDeploys(token: string): Promise<Record<string, DeployInfo>> {
  if (!token) return {};
  const results: Record<string, DeployInfo> = {};
  try {
    const r = await fetch('https://api.vercel.com/v6/deployments?limit=20&state=READY,ERROR', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const data = await r.json();
      (data.deployments || []).forEach((d: any) => {
        const repoUrl = d.meta?.githubRepo;
        if (repoUrl && !results[repoUrl]) {
          results[repoUrl] = { state: d.state || d.readyState, url: d.url, created: d.created };
        }
      });
    }
  } catch { /* graceful skip */ }
  return results;
}

async function fetchBrainItems(url: string, key: string): Promise<any[]> {
  if (!url || !key) return [];
  try {
    const r = await fetch(
      `${url}/rest/v1/items?select=id,title,status,tags,updated_at&archived=not.eq.true&order=updated_at.desc&limit=100`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (r.ok) return await r.json();
  } catch { /* graceful skip */ }
  return [];
}
