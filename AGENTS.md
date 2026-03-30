# Brain Dashboard → ALAN OS Migration Plan

**Date:** 30 March 2026
**Scope:** Migrate Brain Dashboard `/tasks` functionality into ALAN OS as the Focus panel
**Approach:** Convert ALAN OS from static HTML + patches to a proper Next.js/React app

---

## Executive Summary

The Brain Dashboard (`coolbrick-brain-app`) has all the working features: Supabase queries, GTD filtering, drag-to-triage, item creation, ⌘K command bar with AI intent parsing, context wing with semantic + tag-based related items, and 4 API routes (search, embed, related, command).

ALAN OS (`alan-os`) has the better UX vision — dark theme, 5 panel modes, action stream, Claude chat panel — but currently runs as a single `index.html` with JavaScript patches injecting live data.

**The migration:** ALAN OS becomes a proper Next.js/TypeScript app that absorbs the Brain Dashboard's components wholesale. The Brain Dashboard stays alive as a fallback/admin view.

---

## What Moves Where

### Files from `coolbrick-brain-app` → `alan-os`

| Source | Lines | Target | Notes |
|---|---|---|---|
| `src/lib/types.ts` | 152 | `src/lib/types.ts` | Copy verbatim — all types, sidebar keys, colour maps |
| `src/lib/supabase.ts` | 6 | `src/lib/supabase.ts` | Copy verbatim — anon key client |
| `src/lib/supabase-server.ts` | 6 | `src/lib/supabase-server.ts` | Copy verbatim — service role client |
| `src/components/ItemPanel.tsx` | 308 | `src/components/focus/ItemPanel.tsx` | Copy verbatim — drag-and-drop, filtering, status zones |
| `src/components/ItemCard.tsx` | 249 | `src/components/focus/ItemCard.tsx` | Copy verbatim — inline editing, AI suggestions, badges |
| `src/components/ContextWing.tsx` | 132 | `src/components/ContextWing.tsx` | Global — any panel can open it |
| `src/components/CommandBar.tsx` | 394 | `src/components/CommandBar.tsx` | Global — replaces the static ⌘K shell |
| `src/components/ItemModal.tsx` | 130 | `src/components/focus/ItemModal.tsx` | Create new items |
| `src/components/Sidebar.tsx` | 92 | Replaced | ALAN OS has its own sidebar — this becomes a sub-nav inside Focus panel |
| `src/components/Roadmap.tsx` | 153 | `src/components/focus/Roadmap.tsx` | Optional — lower priority |
| `src/app/api/search/route.ts` | 41 | `pages/api/search.ts` | Convert from App Router to Pages Router (alan-os uses Pages Router) |
| `src/app/api/command/route.ts` | 69 | `pages/api/command.ts` | Convert from App Router to Pages Router |
| `src/app/api/related/route.ts` | 89 | `pages/api/related.ts` | Convert from App Router to Pages Router |
| `src/app/api/embed/route.ts` | 27 | `pages/api/embed.ts` | Convert from App Router to Pages Router |
| `src/app/globals.css` | 2615 | `src/styles/focus.css` | Extract only the Focus/ItemPanel/CommandBar/ContextWing styles |

**Total lines moving: ~2,463** (components + lib + API routes + relevant CSS)

### Files that stay in ALAN OS but get refactored

| File | Current | Becomes |
|---|---|---|
| `public/index.html` (1039 lines) | The entire app | Deleted — replaced by React pages |
| `public/focus-patch.js` (174 lines) | Injects basic Supabase items | Deleted — replaced by FocusPanel component |
| `public/property-patch.js` (245 lines) | COHO API fetch | Converted to `src/components/property/PropertyPanel.tsx` |
| `public/people-patch.js` (208 lines) | Supabase people fetch | Converted to `src/components/people/PeoplePanel.tsx` |
| `public/action-stream-patch.js` (225 lines) | Live action stream | Converted to `src/components/ActionStream.tsx` |
| `pages/api/claude.js` (215 lines) | Claude streaming proxy | Keep as `pages/api/claude.ts` (TypeScript conversion) |
| `pages/api/coho.js` (28 lines) | COHO CORS proxy | Keep as `pages/api/coho.ts` |
| `inject-scripts.js` (30 lines) | Build-time patch injection | Deleted — no longer needed |

---

## Architecture: Before and After

### Before (current)

```
alan-os/
├── public/
│   ├── index.html          ← entire app (1039 lines of HTML/CSS/JS)
│   ├── focus-patch.js       ← monkey-patches the Focus panel DOM
│   ├── property-patch.js    ← monkey-patches the Property panel DOM
│   ├── people-patch.js      ← monkey-patches the People panel DOM
│   └── action-stream-patch.js ← monkey-patches the Action Stream DOM
├── pages/
│   └── api/
│       ├── claude.js        ← Claude streaming proxy
│       └── coho.js          ← COHO CORS proxy
├── inject-scripts.js        ← build hook: injects patches into HTML
└── package.json             ← Next.js 14, React 18, no other deps
```

### After (target)

```
alan-os/
├── src/
│   ├── app/                 ← or pages/ (see Decision below)
│   │   └── page.tsx         ← main ALAN OS shell
│   ├── components/
│   │   ├── Shell.tsx        ← top bar, sidebar, panel switcher
│   │   ├── CommandBar.tsx   ← ⌘K with AI intent (from Brain)
│   │   ├── ContextWing.tsx  ← related items slide-out (from Brain)
│   │   ├── ActionStream.tsx ← left sidebar action feed
│   │   ├── ClaudePanel.tsx  ← Claude chat (existing, wired to API)
│   │   ├── focus/
│   │   │   ├── FocusPanel.tsx    ← wraps Sidebar + ItemPanel + ItemModal
│   │   │   ├── FocusSidebar.tsx  ← GTD sub-nav (inbox/focus/next/waiting/etc)
│   │   │   ├── ItemPanel.tsx     ← from Brain (verbatim)
│   │   │   ├── ItemCard.tsx      ← from Brain (verbatim)
│   │   │   ├── ItemModal.tsx     ← from Brain (verbatim)
│   │   │   └── Roadmap.tsx       ← from Brain (optional)
│   │   ├── property/
│   │   │   └── PropertyPanel.tsx ← COHO API data (converted from patch)
│   │   ├── people/
│   │   │   └── PeoplePanel.tsx   ← Supabase people (converted from patch)
│   │   ├── finance/
│   │   │   └── FinancePanel.tsx  ← hardcoded (blocked on Hammock API)
│   │   └── brain/
│   │       └── BrainPanel.tsx    ← simplified Brain items view
│   ├── lib/
│   │   ├── types.ts         ← from Brain (verbatim)
│   │   ├── supabase.ts      ← from Brain (verbatim)
│   │   └── supabase-server.ts ← from Brain (verbatim)
│   └── styles/
│       ├── alan-os.css      ← ALAN OS dark theme (extracted from index.html)
│       └── focus.css        ← Focus panel styles (extracted from Brain globals.css)
├── pages/
│   └── api/
│       ├── claude.ts        ← Claude streaming proxy (TS conversion)
│       ├── coho.ts          ← COHO CORS proxy (TS conversion)
│       ├── search.ts        ← semantic search (from Brain, converted to Pages Router)
│       ├── command.ts       ← AI intent parsing (from Brain, converted to Pages Router)
│       ├── related.ts       ← related items (from Brain, converted to Pages Router)
│       └── embed.ts         ← embedding generation (from Brain, converted to Pages Router)
└── package.json             ← upgraded deps (see below)
```

---

## Decision: App Router vs Pages Router

The current `alan-os` repo uses **Pages Router** (has `pages/api/` directory). The Brain Dashboard uses **App Router** (has `src/app/` directory).

**Recommendation: Stick with Pages Router for alan-os.** Reasons:
- The existing API routes (`claude.js`, `coho.js`) use Pages Router already
- Simpler mental model — Alan isn't a developer
- The API route conversions from App Router → Pages Router are mechanical (change function signature, use `req.query` / `req.body` instead of `NextRequest`)
- The main page can still use React components with hooks — Pages Router supports `'use client'` components fine

This means:
- Main page lives at `pages/index.tsx` (not `src/app/page.tsx`)
- API routes stay at `pages/api/*.ts`
- Components live at `src/components/` (imported by the page)

---

## Dependencies to Add

Current `alan-os` package.json has only `next`, `react`, `react-dom`.

**Add these (from Brain Dashboard):**

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@anthropic-ai/sdk": "^0.52.0",
    "@supabase/supabase-js": "^2.99.1",
    "openai": "^4.98.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "typescript": "^5"
  }
}
```

Also upgrade Next.js and React to match Brain Dashboard:
- `next`: `^14.2.0` → `16.1.6`
- `react` / `react-dom`: `^18.3.0` → `19.2.3`

**Note:** Tailwind is NOT required. The ALAN OS dark theme uses custom CSS, not Tailwind. The Brain Dashboard's Tailwind classes in `globals.css` need to be converted to plain CSS when extracting focus styles.

---

## Vercel Environment Variables Needed

ALAN OS's Vercel project needs these env vars (copy from Brain Dashboard's Vercel project):

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://etpadjoejybmgezkfhdz.supabase.co` | Public, client-side |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...1ArI` | Public, client-side (the anon key from supabase.ts) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...WfpA` | Server-side only — for API routes |
| `OPENAI_API_KEY` | (from Railway) | For `/api/search` and `/api/embed` |
| `ANTHROPIC_API_KEY` | (from Railway) | For `/api/command` and `/api/claude` |

---

## Phased Execution Plan

### Session 1: Foundation (~2 hrs)

1. **Upgrade package.json** — add all dependencies, upgrade Next.js + React
2. **Add TypeScript config** — `tsconfig.json` with `@/` path alias
3. **Copy lib files verbatim** — `types.ts`, `supabase.ts`, `supabase-server.ts`
4. **Convert API routes** — Brain's 4 App Router routes → Pages Router format
5. **Keep existing API routes** — `claude.ts` and `coho.ts` stay
6. **Copy Focus components verbatim** — `ItemPanel.tsx`, `ItemCard.tsx`, `ItemModal.tsx`, `CommandBar.tsx`, `ContextWing.tsx`
7. **Create FocusPanel wrapper** — new component that combines the GTD sub-sidebar + ItemPanel + state management (this is essentially `page.tsx` from the Brain Dashboard, wrapped as a component)
8. **Extract CSS** — pull the relevant styles from Brain's `globals.css` into `src/styles/focus.css`
9. **Test Focus panel standalone** — verify it renders and queries Supabase

### Session 2: Shell Integration (~1.5 hrs)

1. **Build Shell.tsx** — the ALAN OS chrome (topbar, sidebar, panel area) as React, ported from `index.html`
2. **Extract ALAN OS CSS** — pull styles from `index.html` `<style>` block into `src/styles/alan-os.css`
3. **Convert patch files to React components:**
   - `property-patch.js` → `PropertyPanel.tsx` (COHO API via `/api/coho`)
   - `people-patch.js` → `PeoplePanel.tsx` (Supabase REST)
   - `action-stream-patch.js` → `ActionStream.tsx` (Supabase + COHO)
   - `FinancePanel.tsx` — keep hardcoded for now
4. **Wire panel switching** — sidebar clicks swap which panel renders in the main area
5. **Wire ⌘K globally** — CommandBar at top of shell, works across all panels
6. **Wire ContextWing globally** — slide-out available from any panel

### Session 3: Polish & Deploy (~1 hr)

1. **Delete old files** — `public/index.html`, all `*-patch.js`, `inject-scripts.js`
2. **Set Vercel env vars**
3. **Push to main** → Vercel auto-deploys
4. **Smoke test all 5 panels + ⌘K + ContextWing + Action Stream**
5. **Update AGENTS.md** in both repos
6. **Update Brain entry** with new architecture

---

## API Route Conversion Pattern

Brain Dashboard uses Next.js App Router (`src/app/api/search/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ results: data });
}
```

ALAN OS uses Pages Router (`pages/api/search.ts`):

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body; // already parsed
  return res.status(200).json({ results: data });
}
```

The conversion is mechanical — same logic, different wrapper.

---

## CSS Strategy

**Problem:** Brain Dashboard uses Tailwind + 2,615 lines of custom CSS with light theme. ALAN OS uses a dark theme with custom CSS variables and no Tailwind.

**Solution:** Two separate CSS files loaded together.

1. `alan-os.css` — the dark theme shell styles (extracted from `index.html`'s `<style>` block). Covers: topbar, sidebar, action stream, panel containers, command bar chrome, Claude panel.

2. `focus.css` — the Focus panel styles (extracted from Brain's `globals.css`). Covers: item cards, item panel, drag zones, sidebar nav, context wing, command bar dropdown, modals. **Must be adapted to work with the dark theme** — the Brain Dashboard is light-on-white, ALAN OS is light-on-dark. Key changes:
   - Card backgrounds: `#FFFFFF` → `var(--s2)` (subtle dark surface)
   - Text: `#111827` → `var(--text)` (cream on dark)
   - Borders: `#E5E7EB` → `var(--b1)` (subtle dark border)
   - Accent colours stay the same (blue, gold, green etc)

This is the most labour-intensive part of the migration. The logic is trivial to port; making it look right in the dark theme takes care.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CSS conflicts between two style systems | High | Medium | Namespace Focus styles under `.focus-panel` class |
| `@dnd-kit` version conflicts with React 19 | Medium | High | Pin exact versions from working Brain Dashboard |
| Vercel env vars missing → API routes fail silently | Medium | High | Add startup health check that tests Supabase + OpenAI connectivity |
| Next.js 16 + Pages Router quirks | Low | Medium | Brain Dashboard already runs Next.js 16 — proven compatible |
| COHO API proxy CORS on new domain | Low | Low | Same proxy pattern as existing `coho.js` |
| Brain Dashboard features regress during migration | None | None | Brain Dashboard stays untouched — separate repo, separate deploy |

---

## What NOT to Touch

- **Brain Dashboard repo** — leave it completely alone. It stays as a working fallback.
- **Railway agent** — no changes needed. It talks to Supabase, not to the frontend.
- **Supabase schema** — no changes needed. Same tables, same RPC functions.
- **Finance panel wiring** — stays hardcoded. Don't waste time on this until Hammock has an API.

---

## Success Criteria

- [ ] ALAN OS at `alan-os-gamma.vercel.app` renders the dark theme shell
- [ ] Focus panel shows live Supabase items with GTD filtering
- [ ] Drag-to-triage works (drag item to status zone → updates in Supabase)
- [ ] ⌘K command bar searches semantically and creates items
- [ ] Context Wing shows related items when clicked
- [ ] Property panel shows COHO data (same as current patch)
- [ ] People panel shows Supabase people (same as current patch)
- [ ] Action Stream shows live signals (same as current patch)
- [ ] All 4 API routes work (`/api/search`, `/api/command`, `/api/related`, `/api/embed`)
- [ ] Brain Dashboard continues to work independently at its own URL

---

## Antigravity Kickoff Prompt

**Copy everything below this line and paste it into Antigravity to start Session 1.**

---

# ANTIGRAVITY: Brain Dashboard → ALAN OS Migration — Session 1

Read `AGENTS.md` first for full system context.

## Context

You're converting the `alan-os` repo from a static HTML app with JavaScript patches into a proper Next.js/TypeScript app. The goal is to absorb the Focus/Tasks functionality from the `coolbrick-brain-app` repo (the Brain Dashboard) into ALAN OS as the Focus panel.

Both repos are at `github.com/AlanCoolbrick/`. You have access to both.

## What to do in this session

### Step 1: Upgrade alan-os foundations

In the `alan-os` repo:

1. Update `package.json` — add these dependencies:
```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2",
"@anthropic-ai/sdk": "^0.52.0",
"@supabase/supabase-js": "^2.99.1",
"openai": "^4.98.0"
```
Also add devDependencies: `"@types/node": "^20", "@types/react": "^19", "typescript": "^5"`

Upgrade `next` to `16.1.6`, `react` and `react-dom` to `19.2.3`.

2. Create `tsconfig.json` with `@/` path alias pointing to `src/`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

3. Create `next.config.js` (replace existing):
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
module.exports = nextConfig;
```

### Step 2: Copy lib files from coolbrick-brain-app

Create these files in `alan-os/src/lib/` — copy verbatim from the `coolbrick-brain-app` repo:

- `src/lib/types.ts` — from `coolbrick-brain-app/src/lib/types.ts`
- `src/lib/supabase.ts` — from `coolbrick-brain-app/src/lib/supabase.ts`
- `src/lib/supabase-server.ts` — from `coolbrick-brain-app/src/lib/supabase-server.ts`

### Step 3: Copy Focus components from coolbrick-brain-app

Create these files in `alan-os/src/components/focus/` — copy verbatim:

- `src/components/focus/ItemPanel.tsx` — from `coolbrick-brain-app/src/components/ItemPanel.tsx`
- `src/components/focus/ItemCard.tsx` — from `coolbrick-brain-app/src/components/ItemCard.tsx`
- `src/components/focus/ItemModal.tsx` — from `coolbrick-brain-app/src/components/ItemModal.tsx`
- `src/components/focus/Roadmap.tsx` — from `coolbrick-brain-app/src/components/Roadmap.tsx`

Fix the import paths in each file: change `@/lib/supabase` to `@/lib/supabase`, `@/lib/types` to `@/lib/types`, and `./ItemCard` to `./ItemCard` — they should all resolve correctly with the `@/` alias.

### Step 4: Copy global components

- `src/components/CommandBar.tsx` — from `coolbrick-brain-app/src/components/CommandBar.tsx`
- `src/components/ContextWing.tsx` — from `coolbrick-brain-app/src/components/ContextWing.tsx`

### Step 5: Convert API routes to Pages Router

Create these in `alan-os/pages/api/`:

**`pages/api/search.ts`** — convert from Brain's `src/app/api/search/route.ts`:
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase-server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { query, filter_type } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing query' });
    }
    const embResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      dimensions: 512,
      encoding_format: 'float',
    });
    const embedding = embResponse.data[0].embedding;
    const { data, error } = await supabaseAdmin.rpc('search_brain', {
      query_embedding: embedding,
      match_count: 10,
      filter_type: filter_type || null,
      similarity_threshold: 0.3,
    });
    if (error) {
      console.error('search_brain RPC error:', error);
      return res.status(500).json({ error: 'Search failed', detail: error.message });
    }
    return res.status(200).json({ results: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Search failed', detail: message });
  }
}
```

**`pages/api/command.ts`** — convert from Brain's `src/app/api/command/route.ts`. Same pattern: change `NextRequest`/`NextResponse` to `NextApiRequest`/`NextApiResponse`, use `req.body` instead of `await req.json()`.

**`pages/api/related.ts`** — convert from Brain's `src/app/api/related/route.ts`. For the GET handler, use `req.query.item_id` instead of `req.nextUrl.searchParams.get('item_id')`.

**`pages/api/embed.ts`** — convert from Brain's `src/app/api/embed/route.ts`. Same pattern.

Keep the existing `pages/api/claude.js` and `pages/api/coho.js` — rename to `.ts` if you want but not required.

### Step 6: Create FocusPanel wrapper

Create `src/components/focus/FocusPanel.tsx` — this is essentially the Brain Dashboard's `page.tsx` wrapped as a component:

```typescript
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Item, SidebarKey } from '@/lib/types';
import ItemPanel from './ItemPanel';
import ItemModal from './ItemModal';
import Roadmap from './Roadmap';

interface FocusPanelProps {
  onShowRelated?: (itemId: string) => void;
}

export default function FocusPanel({ onShowRelated }: FocusPanelProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [activeKey, setActiveKey] = useState<SidebarKey>('inbox');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('items')
      .select('*')
      .order('position', { ascending: true });
    if (data) setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const counts = useMemo(() => {
    const c: Partial<Record<SidebarKey, number>> = {};
    c.inbox = items.filter((i) => i.status === 'inbox' && !i.archived).length;
    c.focus = items.filter((i) => i.status === 'focus' && !i.archived).length;
    c.next = items.filter((i) => i.status === 'next' && !i.archived).length;
    c.waiting = items.filter((i) => i.status === 'waiting' && !i.archived).length;
    c.scheduled = items.filter((i) => i.status === 'scheduled' && !i.archived).length;
    c.someday = items.filter((i) => i.status === 'someday' && !i.archived).length;
    c.logbook = items.filter((i) => i.status === 'done').length;
    c.trash = items.filter((i) => i.archived).length;
    return c;
  }, [items]);

  // GTD sub-navigation tabs
  const GTD_TABS: { key: SidebarKey; label: string; icon: string }[] = [
    { key: 'inbox', label: 'Inbox', icon: '📥' },
    { key: 'focus', label: 'Focus', icon: '★' },
    { key: 'next', label: 'Next', icon: '»' },
    { key: 'waiting', label: 'Waiting', icon: '◻' },
    { key: 'scheduled', label: 'Scheduled', icon: '📅' },
    { key: 'someday', label: 'Someday', icon: '◇' },
    { key: 'logbook', label: 'Done', icon: '✓' },
  ];

  return (
    <div className="focus-panel">
      {/* GTD sub-nav tabs */}
      <div className="focus-tabs">
        {GTD_TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            className={`focus-tab ${activeKey === key ? 'focus-tab-active' : ''}`}
            onClick={() => setActiveKey(key)}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {(counts[key] || 0) > 0 && (
              <span className="focus-tab-count">{counts[key]}</span>
            )}
          </button>
        ))}
        <button className="focus-tab-add" onClick={() => setShowModal(true)}>+ New</button>
      </div>

      {/* Item list */}
      <div className="focus-content">
        {activeKey === 'roadmap' ? (
          <Roadmap />
        ) : loading ? (
          <div style={{ padding: '2rem', opacity: 0.5 }}>Loading...</div>
        ) : (
          <ItemPanel
            items={items}
            view={activeKey}
            search=""
            onUpdate={fetchItems}
            onShowRelated={onShowRelated}
          />
        )}
      </div>

      {showModal && (
        <ItemModal onSaved={fetchItems} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
```

### Step 7: Extract CSS

This is the most tedious part. From Brain's `globals.css` (2615 lines), extract only the classes used by the copied components:

**Classes needed:** `.panel`, `.panel-header`, `.panel-title`, `.panel-count`, `.panel-empty`, `.panel-loading`, `.spinner`, `.item-list`, `.item-card`, `.item-card-*`, `.type-pill`, `.ai-suggestion`, `.ai-accept-btn`, `.next-actions-list`, `.next-action-*`, `.item-edit-*`, `.item-meta`, `.item-badge`, `.item-badge-*`, `.item-checkbox`, `.item-action-btn`, `.status-drop-*`, `.drag-overlay`, `.command-bar`, `.command-bar-*`, `.context-wing`, `.context-wing-*`

Adapt all colour values to work on ALAN OS's dark background. Key mappings:
- `--bg: #FAFBFC` → transparent (inherits dark bg)
- `--bg-card: #FFFFFF` → `rgba(255,255,255,0.048)` (var `--s2`)
- `--text-primary: #111827` → `var(--text)` (#ede9e4)
- `--border: #E5E7EB` → `var(--b1)` (rgba(255,255,255,0.065))

Save as `src/styles/focus.css`.

### Step 8: Verify

Do NOT build the full Shell yet — that's Session 2. For now, create a minimal `pages/index.tsx` that renders just the FocusPanel + CommandBar to verify everything works:

```tsx
import FocusPanel from '@/components/focus/FocusPanel';
import CommandBar from '@/components/CommandBar';
import '@/styles/focus.css';

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#ede9e4' }}>
      <FocusPanel />
    </div>
  );
}
```

Push to main. Vercel deploys preview. Test that:
- Items load from Supabase
- GTD tabs filter correctly
- Drag-to-triage updates status
- ⌘K searches semantically

If all 4 work, Session 1 is done. Don't proceed to Session 2 in the same sitting.

---

**END OF ANTIGRAVITY KICKOFF PROMPT**
