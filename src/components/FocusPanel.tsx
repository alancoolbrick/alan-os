import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Item, SidebarKey, SidebarItem, SidebarSection, SIDEBAR_ITEMS, SECTION_LABELS } from '@/lib/types';
import ItemPanel from './focus/ItemPanel';
import ItemModal from './focus/ItemModal';
import CommandBar from './CommandBar';
import ContextWing from './ContextWing';

export default function FocusPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<SidebarKey>('focus');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [relatedItemId, setRelatedItemId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('position', { ascending: true });
    if (error) {
      console.error('Failed to fetch items:', error);
      return;
    }
    setItems(data || []);

    // Collect unique tags
    const allTags = new Set<string>();
    (data || []).forEach((item: Item) => {
      if (item.tags) item.tags.forEach((t) => allTags.add(t));
    });
    setTags(Array.from(allTags).sort());

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = (key: SidebarKey) => {
    setView(key);
    setSidebarOpen(false);
  };

  const handleItemSelect = (itemId: string, sidebarKey: SidebarKey) => {
    setView(sidebarKey);
    setSidebarOpen(false);
  };

  // Count items per sidebar view
  const getCounts = () => {
    const counts: Record<string, number> = {};
    const statusMap: Record<string, string> = {
      inbox: 'inbox', focus: 'focus', next: 'next',
      waiting: 'waiting', scheduled: 'scheduled', someday: 'someday',
    };
    const typeMap: Record<string, string> = {
      projects: 'project', people: 'people', ideas: 'idea',
      admin: 'admin', areas: 'area',
    };

    items.forEach((item) => {
      if (item.archived) {
        counts['trash'] = (counts['trash'] || 0) + 1;
        return;
      }
      if (item.status === 'done') {
        counts['logbook'] = (counts['logbook'] || 0) + 1;
        return;
      }
      // Status counts
      Object.entries(statusMap).forEach(([key, status]) => {
        if (item.status === status) counts[key] = (counts[key] || 0) + 1;
      });
      // Type counts
      Object.entries(typeMap).forEach(([key, type]) => {
        if (item.type === type) counts[key] = (counts[key] || 0) + 1;
      });
    });
    return counts;
  };

  const counts = getCounts();

  // Group sidebar items by section
  const sections = SIDEBAR_ITEMS.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<SidebarSection, SidebarItem[]>);

  if (loading) {
    return (
      <div className="focus-loading">
        <div className="spinner" />
        <span>Loading Brain...</span>
      </div>
    );
  }

  return (
    <div className="focus-layout">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`focus-sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">🧠</span>
          <span className="sidebar-brand-text">Focus</span>
        </div>

        <nav className="sidebar-nav">
          {(Object.entries(sections) as [SidebarSection, SidebarItem[]][]).map(([section, sectionItems]) => (
            <div key={section} className="sidebar-section">
              <div className="sidebar-section-label">{SECTION_LABELS[section]}</div>
              {sectionItems.map((item) => (
                <button
                  key={item.key}
                  className={`sidebar-item ${view === item.key ? 'sidebar-item-active' : ''}`}
                  onClick={() => handleNavigate(item.key)}
                >
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span className="sidebar-item-label">{item.label}</span>
                  {counts[item.key] ? (
                    <span className="sidebar-item-count">{counts[item.key]}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}

          {/* Tag filters */}
          {tags.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">TAGS</div>
              <div className="sidebar-tags">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    className={`sidebar-tag ${view === `tag:${tag}` ? 'sidebar-tag-active' : ''}`}
                    onClick={() => handleNavigate(`tag:${tag}`)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Main content */}
      <div className={`focus-main ${relatedItemId ? 'wing-open' : ''}`}>
        <div className="main-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <CommandBar
            onNavigate={handleNavigate}
            onItemCreated={fetchItems}
            onItemSelect={handleItemSelect}
          />
          <button className="header-create-btn" onClick={() => setShowModal(true)}>
            + New
          </button>
          <button className="refresh-btn" onClick={fetchItems} title="Refresh">
            ↻
          </button>
        </div>

        <div className="main-panel">
          <ItemPanel
            items={items}
            view={view}
            search={search}
            onUpdate={fetchItems}
            onShowRelated={(id) => setRelatedItemId(id)}
          />
        </div>
      </div>

      {/* Context Wing */}
      <ContextWing
        itemId={relatedItemId}
        onClose={() => setRelatedItemId(null)}
        onNavigate={(id) => {
          setRelatedItemId(id);
        }}
      />

      {/* Create modal */}
      {showModal && (
        <ItemModal
          onSaved={fetchItems}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
