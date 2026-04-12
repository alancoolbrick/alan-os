// ============================================================
// Unified Items Schema
// ============================================================

export type ItemType = 'task' | 'people' | 'project' | 'idea' | 'admin' | 'area';
export type ItemStatus = 'inbox' | 'next' | 'focus' | 'waiting' | 'scheduled' | 'someday' | 'done' | 'archived' | 'reference';

export interface NextAction {
  text: string;
  done: boolean;
}

export interface Item {
  id: string;
  title: string;
  content: string | null;
  type: ItemType;
  status: ItemStatus;
  next_actions: NextAction[];
  ai_suggested_type: ItemType | null;
  ai_suggested_status: ItemStatus | null;
  ai_confidence: number | null;
  summary: string | null;
  due_date: string | null;
  defer_until: string | null;
  area: string | null;
  project: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  source: string;
  raw_input: string | null;
  position: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  doer: 'human' | 'ai' | null;
  execution_status: 'pending' | 'claimed' | 'done' | 'dry_run_complete' | 'needs_human' | null;
}

// ── Sidebar Navigation ─────────────────────────────────────

export type SidebarSection = 'collect' | 'actions' | 'organise' | 'archive';

export type SidebarKey =
  | 'inbox'
  | 'focus'
  | 'next'
  | 'waiting'
  | 'scheduled'
  | 'someday'
  | 'projects'
  | 'reference'
  | 'logbook'
  | `tag:${string}`;

export interface SidebarItem {
  key: SidebarKey;
  label: string;
  icon: string;
  section: SidebarSection;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'inbox',     label: 'Inbox',     icon: '📥', section: 'collect' },
  { key: 'focus',     label: 'Focus',     icon: '★',  section: 'actions' },
  { key: 'next',      label: 'Next',      icon: '»',  section: 'actions' },
  { key: 'waiting',   label: 'Waiting',   icon: '◻',  section: 'actions' },
  { key: 'scheduled', label: 'Scheduled', icon: '📅', section: 'actions' },
  { key: 'someday',   label: 'Someday',   icon: '◇',  section: 'actions' },
  { key: 'projects',  label: 'Projects',  icon: '📁', section: 'organise' },
  { key: 'reference', label: 'Reference', icon: '📚', section: 'organise' },
  { key: 'logbook',   label: 'Logbook',   icon: '✓',  section: 'archive' },
];

export const SECTION_LABELS: Record<SidebarSection, string> = {
  collect:  'COLLECT',
  actions:  'ACTIONS',
  organise: 'ORGANISE',
  archive:  'ARCHIVE',
};

export const TYPE_COLOURS: Record<ItemType, { bg: string; text: string }> = {
  task:    { bg: '#E0F2FE', text: '#0369A1' },
  people:  { bg: '#FCE7F3', text: '#9D174D' },
  project: { bg: '#ECFDF5', text: '#065F46' },
  idea:    { bg: '#FEF9C3', text: '#854D0E' },
  admin:   { bg: '#F3E8FF', text: '#6B21A8' },
  area:    { bg: '#E0E7FF', text: '#3730A3' },
};

export const AREA_COLOURS: Record<string, { bg: string; text: string }> = {
  property: { bg: '#E6F1FB', text: '#0C447C' },
  finance:  { bg: '#EAF3DE', text: '#27500A' },
  business: { bg: '#FAEEDA', text: '#633806' },
  personal: { bg: '#EEEDFE', text: '#3C3489' },
};

export const ITEM_TYPES: ItemType[] = ['task', 'people', 'project', 'idea', 'admin', 'area'];
export const ITEM_STATUSES: ItemStatus[] = ['inbox', 'next', 'focus', 'waiting', 'scheduled', 'someday', 'reference'];
export const AREAS = ['property', 'finance', 'business', 'personal'];

// ── Command Bar Types ─────────────────────────────────────

export interface SearchResult {
  id: string;
  type: ItemType;
  title: string;
  content: string | null;
  summary: string | null;
  status: ItemStatus;
  tags: string[];
  similarity: number;
  created_at: string;
}

export interface CommandIntent {
  intent: 'search' | 'create' | 'navigate' | 'command';
  query?: string;
  filter_type?: ItemType | null;
  title?: string;
  type?: ItemType;
  status?: ItemStatus;
  content?: string;
  target?: SidebarKey;
  command?: string;
  args?: string;
}

export interface RelatedEntry {
  id: string;
  type: ItemType;
  title: string;
  content: string | null;
  summary?: string | null;
  status: ItemStatus;
  tags: string[];
  similarity: number;
  relevance: 'semantic' | 'tags' | 'both';
  shared_tags?: string[];
  created_at: string;
}
