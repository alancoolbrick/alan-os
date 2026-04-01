import { useState, useEffect, useRef } from 'react';

interface Mission {
  id: string;
  name: string;
  skill: string;
  status: string;
  current_step: number;
  steps: { index: number; action: string; description: string }[];
  updated_at: string;
}

interface RelayMessage {
  id: string;
  mission_id: string;
  role: 'eyes' | 'brain' | 'hands';
  message_type: string;
  content: string;
  step_index: number;
  processed: boolean;
  created_at: string;
}

interface EyesData {
  missions: Mission[];
  relay: RelayMessage[];
  stats: {
    totalRelayMessages: number;
    eyesObservations: number;
    brainCommands: number;
    handsResults: number;
    unprocessed: number;
  };
  gateway: {
    url: string | null;
    online: boolean;
    eyesLastSeen: string | null;
  };
}

const ROLE_COLORS: Record<string, string> = {
  eyes: '#c9a84c',   // gold
  brain: '#6ea8d9',  // blue
  hands: '#5aaa9c',  // teal
};

const ROLE_ICONS: Record<string, string> = {
  eyes: '👁',
  brain: '🧠',
  hands: '🤲',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function EyesPanel() {
  const [data, setData] = useState<EyesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/eyes');
        const json = await res.json();
        setData(json);
        if (!selectedMission && json.missions?.length > 0) {
          setSelectedMission(json.missions[0].id);
        }
      } catch (err) {
        console.error('Eyes fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10_000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [selectedMission]);

  if (loading) return <div className="mode-header"><h2 className="mode-title">Loading pipeline...</h2></div>;
  if (!data) return <div className="mode-header"><h2 className="mode-title">Pipeline Error</h2></div>;

  const mission = data.missions.find(m => m.id === selectedMission);
  const missionRelay = data.relay
    .filter(r => r.mission_id === selectedMission)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div className="mode-header">
        <h2 className="mode-title">Three-Agent Pipeline</h2>
        <p className="mode-sub">Eyes (observe) → Brain (decide) → Hands (execute)</p>
      </div>

      {/* Status strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        <StatusCard label="Gateway" value={data.gateway.online ? 'Online' : 'Offline'} color={data.gateway.online ? '#5aaa9c' : '#c06a56'} />
        <StatusCard label="Eyes" value={String(data.stats.eyesObservations)} sub="observations" />
        <StatusCard label="Brain" value={String(data.stats.brainCommands)} sub="commands" />
        <StatusCard label="Hands" value={String(data.stats.handsResults)} sub="results" />
        <StatusCard label="Queued" value={String(data.stats.unprocessed)} sub="unprocessed" color={data.stats.unprocessed > 0 ? '#c9a84c' : undefined} />
      </div>

      {/* Mission selector */}
      {data.missions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.missions.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMission(m.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: m.id === selectedMission ? '1px solid var(--gold, #c9a84c)' : '1px solid var(--b2, #2a2d35)',
                background: m.id === selectedMission ? 'rgba(201,168,76,0.1)' : 'var(--s1, #1e2028)',
                color: m.id === selectedMission ? 'var(--gold, #c9a84c)' : 'var(--t2, #8b8d98)',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              {m.status === 'active' ? '● ' : '○ '}{m.name}
            </button>
          ))}
        </div>
      )}

      {/* Mission steps */}
      {mission && (
        <div style={{
          background: 'var(--s1, #1e2028)',
          borderRadius: 10,
          border: '1px solid var(--b2, #2a2d35)',
          padding: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1, #e4e5ea)', marginBottom: 12 }}>
            {mission.name}
            <span style={{
              marginLeft: 8,
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 4,
              background: mission.status === 'active' ? 'rgba(90,170,156,0.15)' : 'rgba(255,255,255,0.05)',
              color: mission.status === 'active' ? '#5aaa9c' : '#666',
            }}>
              {mission.status} · step {mission.current_step}/{mission.steps.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mission.steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '6px 0',
                opacity: i < mission.current_step ? 0.5 : 1,
              }}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: i === mission.current_step
                    ? '2px solid var(--gold, #c9a84c)'
                    : i < mission.current_step
                      ? '2px solid #5aaa9c'
                      : '1px solid var(--b2, #2a2d35)',
                  background: i < mission.current_step ? 'rgba(90,170,156,0.15)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: i < mission.current_step ? '#5aaa9c' : 'var(--t3, #555)',
                  flexShrink: 0,
                }}>
                  {i < mission.current_step ? '✓' : i}
                </div>
                <div>
                  <div style={{
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: i === mission.current_step ? 'var(--gold, #c9a84c)' : 'var(--t2, #8b8d98)',
                  }}>
                    [{step.action}]
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t1, #e4e5ea)' }}>
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relay feed */}
      <div style={{
        background: 'var(--s1, #1e2028)',
        borderRadius: 10,
        border: '1px solid var(--b2, #2a2d35)',
        padding: 16,
        flex: 1,
        overflow: 'auto',
        minHeight: 200,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t2, #8b8d98)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Relay Feed {missionRelay.length > 0 && `(${missionRelay.length})`}
        </div>
        <div ref={feedRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {missionRelay.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--t3, #555)', fontStyle: 'italic' }}>
              No relay messages for this mission. Start Eyes to begin observing.
            </div>
          ) : (
            missionRelay.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${ROLE_COLORS[msg.role] || '#444'}`,
              }}>
                <div style={{ fontSize: 16, flexShrink: 0 }}>
                  {ROLE_ICONS[msg.role] || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: ROLE_COLORS[msg.role] || '#888',
                      textTransform: 'uppercase',
                    }}>
                      {msg.role} · {msg.message_type}
                      {msg.step_index !== null && ` · step ${msg.step_index}`}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--t3, #555)' }}>
                      {timeAgo(msg.created_at)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--t1, #e4e5ea)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    maxHeight: 80,
                    overflow: 'hidden',
                  }}>
                    {msg.content.length > 300 ? msg.content.slice(0, 300) + '…' : msg.content}
                  </div>
                  {!msg.processed && (
                    <div style={{
                      marginTop: 4,
                      fontSize: 10,
                      color: '#c9a84c',
                      fontFamily: 'monospace',
                    }}>
                      ● awaiting processing
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Eyes last seen */}
      {data.gateway.eyesLastSeen && (
        <div style={{ fontSize: 11, color: 'var(--t3, #555)', textAlign: 'center', fontFamily: 'monospace' }}>
          Eyes last active: {timeAgo(data.gateway.eyesLastSeen)} · Gateway: {data.gateway.url || 'not configured'}
        </div>
      )}
    </div>
  );
}

function StatusCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--s1, #1e2028)',
      borderRadius: 8,
      border: '1px solid var(--b2, #2a2d35)',
      padding: '10px 12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: color || 'var(--t1, #e4e5ea)' }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: 'var(--t3, #555)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 9, color: 'var(--t3, #555)' }}>{sub}</div>}
    </div>
  );
}
