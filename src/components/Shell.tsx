import { useState, useEffect, useCallback } from 'react';
import FocusPanel from './FocusPanel';
import ActionStream from './ActionStream';
import PropertyPanel from './property/PropertyPanel';
import PeoplePanel from './people/PeoplePanel';
import FinancePanel from './finance/FinancePanel';
import BrainPanel from './brain/BrainPanel';
import RoadmapPanel from './RoadmapPanel';
import RoomsPanel from './rooms/RoomsPanel';
import ClaudePanel from './claude/ClaudePanel';
import EyesPanel from './EyesPanel';
import CommandBar from './CommandBar';

type Mode = 'property' | 'finance' | 'focus' | 'people' | 'brain' | 'eyes' | 'roadmap' | 'rooms' | 'claude';

const NAV_ITEMS: { icon: string; label: string; mode: Mode }[] = [
  { icon: '⬡', label: 'Property', mode: 'property' },
  { icon: '🚪', label: 'Rooms', mode: 'rooms' },
  { icon: '◈', label: 'Finance', mode: 'finance' },
  { icon: '◎', label: 'Focus', mode: 'focus' },
  { icon: '✦', label: 'People', mode: 'people' },
  { icon: '⊛', label: 'Brain', mode: 'brain' },
  { icon: '👁', label: 'Eyes', mode: 'eyes' },
  { icon: '📊', label: 'Roadmap', mode: 'roadmap' },
];

export default function Shell() {
  const [activeMode, setActiveMode] = useState<Mode>('property');
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [clock, setClock] = useState('');

  // Live clock — HH:MM + day
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const day = now.toLocaleDateString('en-GB', { weekday: 'short' });
      setClock(`${time} ${day}`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen((v) => !v);
      }
      if (e.key === 'Escape') setCommandBarOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const quickSend = useCallback((question: string) => {
    setActiveMode('claude');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('claude-quick-send', { detail: question }));
    }, 100);
  }, []);

  return (
    <>
      {/* TOPBAR */}
      <div className="topbar">
        <div className="brand">
          ALAN<span className="brand-ver">OS v0.4</span>
        </div>
        <div className="topbar-mid">
          <div className="cmd-bar" onClick={() => setCommandBarOpen(true)}>
            <span style={{ color: 'var(--dim)', fontSize: 10, fontFamily: 'monospace' }}>⌘</span>
            <span className="cmd-bar-text">Search or /command...</span>
            <span className="cmd-hint">⌘K</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="pills">
            <div className="pill green"><div className="dot" />Coho</div>
            <div className="pill green"><div className="dot" />Brain</div>
          </div>
          <div className="clock">{clock}</div>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="workspace">
        {/* SIDEBAR */}
        <div className="sidebar">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.mode}
              className={`nav-item ${activeMode === item.mode ? 'active' : ''}`}
              onClick={() => setActiveMode(item.mode)}
            >
              {item.icon}
              <div className="nav-label">{item.label}</div>
            </div>
          ))}
          <div className="nav-div" />
          <div
            className={`nav-item ${activeMode === 'claude' ? 'active' : ''}`}
            onClick={() => setActiveMode('claude')}
          >
            💬
            <div className="nav-label">Claude</div>
          </div>
        </div>

        {/* ACTION STREAM */}
        <ActionStream onAskClaude={quickSend} />

        {/* NUCLEUS */}
        <div className="nucleus">
          <div className={`mode-panel ${activeMode === 'property' ? 'active' : ''}`}>
            <PropertyPanel />
          </div>
          <div className={`mode-panel ${activeMode === 'rooms' ? 'active' : ''}`}>
            <RoomsPanel />
          </div>
          <div className={`mode-panel ${activeMode === 'finance' ? 'active' : ''}`}>
            <FinancePanel />
          </div>
          <div className={`mode-panel ${activeMode === 'focus' ? 'active' : ''}`}>
            <FocusPanel />
          </div>
          <div className={`mode-panel ${activeMode === 'people' ? 'active' : ''}`}>
            <PeoplePanel onAskClaude={quickSend} />
          </div>
          <div className={`mode-panel ${activeMode === 'brain' ? 'active' : ''}`}>
            <BrainPanel />
          </div>
          <div className={`mode-panel ${activeMode === 'eyes' ? 'active' : ''}`}>
            <EyesPanel />
          </div>
          <div className={`mode-panel ${activeMode === 'roadmap' ? 'active' : ''}`}>
            <RoadmapPanel />
          </div>
          <div className={`mode-panel ${activeMode === 'claude' ? 'active' : ''}`}>
            <ClaudePanel />
          </div>
        </div>
      </div>

      {/* COMMAND BAR OVERLAY */}
      {commandBarOpen && (
        <div className="cmd-overlay open" onClick={(e) => {
          if (e.target === e.currentTarget) setCommandBarOpen(false);
        }}>
          <div className="cmd-modal">
            <CommandBar
              onNavigate={(key) => {
                const modeMap: Record<string, Mode> = {
                  property: 'property', finance: 'finance', focus: 'focus',
                  people: 'people', brain: 'brain', eyes: 'eyes', claude: 'claude',
                  rooms: 'rooms', roadmap: 'roadmap',
                  inbox: 'focus', next: 'focus', waiting: 'focus',
                  scheduled: 'focus', someday: 'focus', projects: 'focus',
                  reference: 'focus', logbook: 'focus',
                };
                const mode = modeMap[key] || 'focus';
                setActiveMode(mode);
                setCommandBarOpen(false);
              }}
              onItemCreated={() => {}}
              onItemSelect={() => { setCommandBarOpen(false); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
