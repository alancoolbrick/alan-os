

interface Feature {
  name: string;
  description: string;
  status: 'live' | 'building' | 'planned' | 'idea';
}

interface FeatureGroup {
  title: string;
  features: Feature[];
}

const STATUS_STYLES: Record<Feature['status'], { label: string; bg: string; text: string }> = {
  live:     { label: 'Live',     bg: '#DCFCE7', text: '#166534' },
  building: { label: 'Building', bg: '#FEF9C3', text: '#854D0E' },
  planned:  { label: 'Planned',  bg: '#E0F2FE', text: '#0369A1' },
  idea:     { label: 'Idea',     bg: '#F3E8FF', text: '#6B21A8' },
};

const ROADMAP: FeatureGroup[] = [
  {
    title: 'Capture',
    features: [
      { name: 'WhatsApp message capture', description: 'Send any message via WhatsApp and it lands in your inbox automatically', status: 'live' },
      { name: 'AI classification', description: 'Every incoming message is classified by type (task, person, project, idea, admin, area) with AI-suggested status', status: 'live' },
      { name: 'AI next actions', description: '3 suggested next actions generated per item, shown as tickable checkboxes', status: 'live' },
      { name: 'Quick add from dashboard', description: 'Type into the quick-add bar to create items directly from the app', status: 'live' },
      { name: 'Full item creation modal', description: 'Create items with type, status, content, due date, and area via the + New button', status: 'live' },
      { name: '/save command', description: 'Bulk-save Claude session outputs to your brain via WhatsApp', status: 'live' },
      { name: 'Email capture', description: 'Forward emails to an inbox address and have them classified automatically', status: 'planned' },
      { name: 'Fireflies meeting capture', description: 'Auto-import action items and key points from Fireflies meeting transcripts', status: 'planned' },
      { name: 'Voice note capture', description: 'Send voice notes via WhatsApp, transcribe and classify them', status: 'idea' },
      { name: 'Photo/document capture', description: 'Send photos of documents, receipts, or notes — extract text and classify', status: 'idea' },
    ],
  },
  {
    title: 'Organisation & Triage',
    features: [
      { name: 'Unified inbox', description: 'Everything lands in inbox first — you decide where it goes', status: 'live' },
      { name: 'Status-based views', description: 'Inbox, Focus, Next, Waiting, Scheduled, Someday, Logbook, Trash', status: 'live' },
      { name: 'Type-based views', description: 'Filter by Projects, People, Ideas, Admin, Areas', status: 'live' },
      { name: 'Tag views', description: 'Auto-collected tags shown in sidebar, click to filter', status: 'live' },
      { name: 'AI suggestion banner', description: 'Inbox items show AI-suggested type and status — accept with one click', status: 'live' },
      { name: 'Drag-and-drop reordering', description: 'Drag cards to reorder within a view', status: 'live' },
      { name: 'Drag to change status', description: 'Drag cards onto status drop zones to move between inbox/focus/next/etc.', status: 'live' },
      { name: 'Inline editing', description: 'Click any card to edit title, notes, type, status, due date, and area', status: 'live' },
      { name: 'Bulk actions', description: 'Select multiple items and move, tag, or archive them at once', status: 'planned' },
      { name: 'Smart lists', description: 'Auto-generated views like "overdue", "stale items", "due this week"', status: 'planned' },
      { name: 'Subtasks & dependencies', description: 'Nest items under parent items, track blocking relationships', status: 'idea' },
    ],
  },
  {
    title: 'Search & Retrieval',
    features: [
      { name: 'Text search', description: 'Search across titles, content, and next actions from the header bar', status: 'live' },
      { name: '/brief command', description: 'Semantic vector search via WhatsApp — ask a question, get relevant context', status: 'live' },
      { name: 'Semantic search in dashboard', description: 'Vector-powered search in the app — find items by meaning, not just keywords', status: 'planned' },
      { name: 'Saved searches', description: 'Save frequent searches as sidebar shortcuts', status: 'idea' },
    ],
  },
  {
    title: 'Digests & Automation',
    features: [
      { name: 'Daily digest', description: 'Morning WhatsApp summary of focus items, due dates, and stale items (7am)', status: 'live' },
      { name: 'Weekly review', description: 'Sunday summary of wins, open items, and suggested actions (9am)', status: 'live' },
      { name: 'Recurring tasks', description: 'Daily, weekly, monthly, yearly recurrence with auto-generated instances', status: 'live' },
      { name: 'Deferred items', description: 'Set a defer date — item hides until that date, then promotes to inbox', status: 'live' },
      { name: 'Calendar integration', description: 'Sync scheduled items with Google Calendar, show calendar events in dashboard', status: 'planned' },
      { name: 'Reminders', description: 'Get a WhatsApp nudge at a specific time for an item', status: 'planned' },
      { name: 'Auto-archive stale items', description: 'Items untouched for 30+ days get flagged or auto-archived', status: 'idea' },
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
      { name: 'Twilio WhatsApp', description: 'WhatsApp sandbox for message capture (upgradeable to Business)', status: 'live' },
      { name: 'WhatsApp Business number', description: 'Dedicated number — no more 72-hour sandbox expiry', status: 'planned' },
      { name: 'Row-level security', description: 'Lock down Supabase tables with proper RLS policies', status: 'planned' },
      { name: 'Automated backups', description: 'Scheduled exports of all items data', status: 'idea' },
    ],
  },
];

export default function Roadmap() {
  const totals = { live: 0, building: 0, planned: 0, idea: 0 };
  ROADMAP.forEach(g => g.features.forEach(f => totals[f.status]++));

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Roadmap</h2>
      </div>

      <div className="roadmap-summary">
        {(Object.entries(totals) as [Feature['status'], number][]).map(([status, count]) => (
          <div key={status} className="roadmap-stat">
            <span
              className="roadmap-stat-dot"
              style={{ background: STATUS_STYLES[status].bg, color: STATUS_STYLES[status].text }}
            >
              {count}
            </span>
            <span className="roadmap-stat-label">{STATUS_STYLES[status].label}</span>
          </div>
        ))}
      </div>

      <div className="roadmap-groups">
        {ROADMAP.map((group) => (
          <div key={group.title} className="roadmap-group">
            <h3 className="roadmap-group-title">{group.title}</h3>
            <div className="roadmap-features">
              {group.features.map((feature) => {
                const style = STATUS_STYLES[feature.status];
                return (
                  <div key={feature.name} className="roadmap-feature">
                    <div className="roadmap-feature-header">
                      <span className="roadmap-feature-name">{feature.name}</span>
                      <span
                        className="roadmap-status-pill"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>
                    </div>
                    <p className="roadmap-feature-desc">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
