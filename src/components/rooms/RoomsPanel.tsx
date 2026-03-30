import { useState, useEffect, useCallback } from 'react';

/* ── Types ── */
interface Room {
  reference: string;
  name: string;
  propertyName: string;
  propertyRef: string;
  postcode: string;
  rent: number;
  paymentFrequency: string;
  availableFrom: string | null;
  occupied: boolean;
  tenantName: string | null;
  tenancyEnd: string | null;
  tenancyStatus: string | null;
}

const mono = "'IBM Plex Mono', monospace";

function daysEmpty(from: string | null): number {
  if (!from) return 0;
  const d = new Date(from);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function monthlyRent(amount: number, freq: string): number {
  if (!amount) return 0;
  if (freq === 'weekly') return amount * 52 / 12;
  if (freq === 'fortnightly') return amount * 26 / 12;
  return amount;
}

function formatRent(amount: number, freq: string): string {
  const m = monthlyRent(amount, freq);
  return `£${Math.round(m)}/mo`;
}

/* ════════════════════════════════════════════
   Main Panel
   ════════════════════════════════════════════ */
export default function RoomsPanel() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'vacant' | 'occupied'>('vacant');

  const fetchData = useCallback(async () => {
    try {
      // Fetch properties + rooms AND tenancies in parallel
      const [propRes, tenRes] = await Promise.all([
        fetch('/api/coho?path=/properties&includeRooms=true&pageSize=50'),
        fetch('/api/coho?path=/tenancies&pageSize=200'),
      ]);
      if (!propRes.ok) throw new Error('COHO properties HTTP ' + propRes.status);
      if (!tenRes.ok) throw new Error('COHO tenancies HTTP ' + tenRes.status);

      const propData = await propRes.json();
      const tenData = await tenRes.json();

      // Build tenancy lookup by room reference
      const tenancyByRoom: Record<string, { name: string; end: string | null; status: string }> = {};
      (tenData.items || []).forEach((t: any) => {
        const status = t.status || '';
        if (status === 'active' || status === 'rolling' || status === 'upcoming') {
          const roomRef = t.roomReference || '';
          if (roomRef) {
            tenancyByRoom[roomRef] = {
              name: t.tenantName || t.tenantFirstName || 'Tenant',
              end: t.endDate || null,
              status,
            };
          }
        }
      });

      const allRooms: Room[] = [];
      (propData.items || []).forEach((prop: any) => {
        (prop.rooms || []).forEach((room: any) => {
          const ref = room.reference || '';
          const tenancy = tenancyByRoom[ref] || null;
          // Also check activeTenancy from the property endpoint as fallback
          const apiTenancy = room.activeTenancy;
          const isOccupied = !!(tenancy || apiTenancy);

          allRooms.push({
            reference: ref,
            name: room.name || 'Room',
            propertyName: prop.name || '',
            propertyRef: prop.reference || '',
            postcode: prop.postcode || '',
            rent: room.rent || 0,
            paymentFrequency: room.paymentFrequency || 'monthly',
            availableFrom: room.availableFrom || null,
            occupied: isOccupied,
            tenantName: tenancy?.name || apiTenancy?.tenantName || null,
            tenancyEnd: tenancy?.end || apiTenancy?.endDate || null,
            tenancyStatus: tenancy?.status || (apiTenancy ? 'active' : null),
          });
        });
      });

      // Sort: vacant first, then by property name
      allRooms.sort((a, b) => {
        if (a.occupied !== b.occupied) return a.occupied ? 1 : -1;
        return a.propertyName.localeCompare(b.propertyName) || a.name.localeCompare(b.name);
      });

      setRooms(allRooms);
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? rooms : rooms.filter((r) => filter === 'vacant' ? !r.occupied : r.occupied);
  const vacant = rooms.filter((r) => !r.occupied);
  const occupied = rooms.filter((r) => r.occupied);
  const totalRent = occupied.reduce((s, r) => s + monthlyRent(r.rent, r.paymentFrequency), 0);
  const lostRent = vacant.reduce((s, r) => s + monthlyRent(r.rent, r.paymentFrequency), 0);

  // Group by property
  const grouped: Record<string, Room[]> = {};
  filtered.forEach((r) => {
    if (!grouped[r.propertyName]) grouped[r.propertyName] = [];
    grouped[r.propertyName].push(r);
  });

  if (error) {
    return (
      <>
        <div className="mode-header"><div className="mode-title">Rooms</div><div className="mode-sub" style={{ color: 'var(--rose)' }}>COHO connection failed</div></div>
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--rose)', fontSize: 11, fontFamily: mono }}>COHO failed: {error}</div>
      </>
    );
  }

  return (
    <>
      <div className="mode-header">
        <div className="mode-title">Rooms</div>
        <div className="mode-sub">
          {loading ? 'Loading from COHO...' : `${rooms.length} rooms · ${vacant.length} vacant · Live from COHO`}
        </div>
      </div>

      {/* Stats */}
      <div className="g3">
        <div className="card">
          <div className="card-lbl">Vacant</div>
          <div className={`card-val ${vacant.length > 3 ? 'rose' : vacant.length > 0 ? 'gold' : 'teal'}`}>{vacant.length}</div>
          <div className="card-note">{rooms.length ? Math.round((occupied.length / rooms.length) * 100) : 0}% occupied</div>
          <div className="bar" style={{ marginTop: 6 }}><div className="bar-fill" style={{ width: rooms.length ? (occupied.length / rooms.length * 100) + '%' : '0%', background: 'var(--teal)' }} /></div>
        </div>
        <div className="card">
          <div className="card-lbl">Rent Roll</div>
          <div className="card-val gold">£{Math.round(totalRent).toLocaleString()}</div>
          <div className="card-note">occupied rooms/mo</div>
        </div>
        <div className="card">
          <div className="card-lbl">Vacancy Loss</div>
          <div className={`card-val ${lostRent > 0 ? 'rose' : 'teal'}`}>−£{Math.round(lostRent).toLocaleString()}</div>
          <div className="card-note">potential revenue lost/mo</div>
        </div>
      </div>

      {/* Filter pills */}
      <div className="chip-row">
        {(['vacant', 'occupied', 'all'] as const).map((f) => (
          <div key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'vacant' ? `Vacant (${vacant.length})` : f === 'occupied' ? `Occupied (${occupied.length})` : `All (${rooms.length})`}
          </div>
        ))}
      </div>

      {/* Room list grouped by property */}
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 11, fontFamily: mono }}>Loading rooms from COHO...</div>
      ) : (
        Object.entries(grouped).map(([propName, propRooms]) => (
          <div key={propName} style={{ marginBottom: 12 }}>
            <div className="sec">{propName} · {propRooms[0].postcode}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {propRooms.map((r) => (
                <RoomRow key={r.reference} room={r} />
              ))}
            </div>
          </div>
        ))
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 11, fontFamily: mono }}>
          {filter === 'vacant' ? 'No vacant rooms — full occupancy!' : 'No rooms match this filter'}
        </div>
      )}
    </>
  );
}

/* ── Room Row ── */
function RoomRow({ room }: { room: Room }) {
  const days = room.occupied ? 0 : daysEmpty(room.availableFrom);
  // If days > 180 and room is vacant, it's likely stale COHO data
  const staleData = !room.occupied && days > 180;
  const urgency = staleData ? 'gold' : days > 30 ? 'rose' : days > 14 ? 'gold' : days > 0 ? 'teal' : '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
      borderRadius: 6, background: 'var(--s1)', border: '1px solid var(--b1)',
      borderLeft: !room.occupied ? `3px solid var(--${urgency || 'gold'})` : '3px solid var(--teal)',
    }}>
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: room.occupied ? 'var(--teal)' : `var(--${urgency || 'gold'})`,
        animation: !room.occupied && days > 30 && !staleData ? 'pulse 1.8s infinite' : undefined,
      }} />

      {/* Room info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--mid)', fontWeight: 500 }}>{room.name}</span>
          <span style={{ fontSize: 9, fontFamily: mono, color: 'var(--dim)' }}>{formatRent(room.rent, room.paymentFrequency)}</span>
        </div>
        <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: mono, marginTop: 2 }}>
          {room.occupied
            ? `${room.tenantName || 'Tenant'}${room.tenancyStatus === 'rolling' ? ' · rolling' : room.tenancyEnd ? ` · ends ${new Date(room.tenancyEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`
            : staleData ? `Vacant · COHO date needs updating`
            : days > 0 ? `Empty ${days}d`
            : room.availableFrom ? `Available from ${new Date(room.availableFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
            : 'Vacant'
          }
        </div>
      </div>

      {/* Status badge */}
      <span style={{
        fontSize: 8, fontFamily: mono, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' as const,
        background: room.occupied ? 'rgba(61,232,176,.09)' : urgency === 'rose' ? 'rgba(232,75,106,.09)' : 'rgba(232,176,75,.09)',
        border: `1px solid ${room.occupied ? 'rgba(61,232,176,.2)' : urgency === 'rose' ? 'rgba(232,75,106,.2)' : 'rgba(232,176,75,.2)'}`,
        color: room.occupied ? 'var(--teal)' : `var(--${urgency || 'gold'})`,
      }}>
        {room.occupied ? (room.tenancyStatus === 'rolling' ? 'Rolling' : 'Occupied')
          : staleData ? 'Check COHO'
          : days > 30 ? 'Critical'
          : days > 14 ? 'Overdue'
          : days > 0 ? 'Empty'
          : 'Available'}
      </span>
    </div>
  );
}
