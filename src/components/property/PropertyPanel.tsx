import { useState, useEffect, useCallback } from 'react';

const COHO_PROXY = '/api/coho';

const OWNERSHIP: Record<string, { co: string; cls: string }> = {
  '34-bristol-road': { co: 'PKS', cls: 'cb-pks' },
  '111-bristol-road': { co: 'PKS', cls: 'cb-pks' },
  '42-friarn-street': { co: 'PKS', cls: 'cb-pks' },
  'flat-1-longfield': { co: 'PKS', cls: 'cb-pks' },
  'flat-2-longfield': { co: 'PKS', cls: 'cb-pks' },
  'flat-3-longfield': { co: 'PKS', cls: 'cb-pks' },
  'flat-4-longfield': { co: 'PKS', cls: 'cb-pks' },
  '63a-st-mary': { co: 'Roomy', cls: 'cb-roomy' },
  '63b-st-mary': { co: 'Roomy', cls: 'cb-roomy' },
  '63c-st-mary': { co: 'Roomy', cls: 'cb-roomy' },
  '44-cranleigh': { co: 'Roomy', cls: 'cb-roomy' },
  '60-taunton-road': { co: 'Alan', cls: 'cb-al' },
  '14-willow-grove': { co: 'Alan', cls: 'cb-al' },
};

function getOwner(ref: string) {
  for (const prefix in OWNERSHIP) {
    if (ref.startsWith(prefix)) return OWNERSHIP[prefix];
  }
  return { co: '?', cls: 'cb-al' };
}

function monthlyRent(amount: number, freq: string): number {
  if (!amount) return 0;
  switch (freq) {
    case 'weekly': return amount * 52 / 12;
    case 'fortnightly': return amount * 26 / 12;
    case 'monthly': return amount;
    default: return amount;
  }
}

interface PropertyData {
  name: string;
  reference: string;
  postcode: string;
  totalRooms: number;
  roomsOccupied: number;
  rooms: { rent: number; paymentFrequency: string }[];
}

export default function PropertyPanel() {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(COHO_PROXY + '?path=/properties&includeRooms=true&pageSize=50');
      if (!r.ok) throw new Error('COHO HTTP ' + r.status);
      const data = await r.json();
      const items = data.items || [];
      // Sort by worst occupancy first
      items.sort((a: any, b: any) => {
        const aRate = a.totalRooms ? (a.roomsOccupied / a.totalRooms) : 1;
        const bRate = b.totalRooms ? (b.roomsOccupied / b.totalRooms) : 1;
        return aRate - bRate;
      });
      setProperties(items);
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute totals
  let totalRooms = 0, totalOcc = 0, totalRent = 0, totalPotential = 0;
  const roomDots: { occupied: boolean; property: string }[] = [];
  const signals: { level: string; txt: string; meta: string }[] = [];

  properties.forEach((p) => {
    const rooms = p.rooms || [];
    const occ = p.roomsOccupied || 0;
    const total = p.totalRooms || rooms.length;
    totalRooms += total;
    totalOcc += occ;

    let propPotential = 0;
    rooms.forEach((r) => { propPotential += monthlyRent(r.rent, r.paymentFrequency); });
    const avgRent = rooms.length ? propPotential / rooms.length : 0;
    const propRent = avgRent * occ;
    totalRent += propRent;
    totalPotential += propPotential;

    for (let i = 0; i < total; i++) {
      roomDots.push({ occupied: i < occ, property: p.name });
    }

    const occPct = total ? (occ / total * 100) : 100;
    if (occPct < 50) {
      signals.push({ level: 'r', txt: `${p.name} — ${occ}/${total} rooms (${Math.round(occPct)}%)`, meta: 'Critical vacancy' });
    } else if (occPct < 80) {
      signals.push({ level: 'a', txt: `${p.name} — ${occ}/${total} rooms`, meta: `${Math.round(occPct)}% occupied` });
    }
  });

  if (totalRooms && (totalOcc / totalRooms) >= 0.9) {
    signals.push({ level: 'g', txt: 'Portfolio above 90% occupancy', meta: 'Strong position' });
  }
  signals.push({ level: 'g', txt: 'COHO — live data', meta: 'Synced just now' });

  const occPct = totalRooms ? Math.round(totalOcc / totalRooms * 100) : 0;
  const vacancyLoss = totalPotential - totalRent;

  if (error) {
    return (
      <div>
        <div className="mode-header">
          <div className="mode-title">Portfolio</div>
          <div className="mode-sub" style={{ color: 'var(--rose)' }}>COHO connection failed</div>
        </div>
        <div className="brain-item-loading" style={{ color: 'var(--rose)' }}>COHO failed: {error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="mode-header">
        <div className="mode-title">Portfolio</div>
        <div className="mode-sub">
          {loading ? 'Loading from COHO...' : `${properties.length} properties · ${totalRooms} rooms · Live from COHO`}
        </div>
      </div>

      <div className="g3">
        <div className="card">
          <div className="card-lbl">Rent Roll</div>
          <div className="card-val gold">£{Math.round(totalRent).toLocaleString()}</div>
          <div className="card-note">actual monthly (occupied rooms)</div>
        </div>
        <div className="card">
          <div className="card-lbl">Vacancy Loss</div>
          <div className="card-val rose">−£{Math.round(vacancyLoss).toLocaleString()}</div>
          <div className="card-note">{totalRooms - totalOcc} rooms vacant</div>
        </div>
        <div className="card">
          <div className="card-lbl">Occupancy</div>
          <div className="card-val teal">{occPct}%</div>
          <div className="card-note">
            {totalOcc} of {totalRooms} rooms
            <div className="bar"><div className="bar-fill" style={{ width: occPct + '%', background: 'var(--teal)' }} /></div>
          </div>
        </div>
      </div>

      <div className="g2">
        <div>
          <div className="sec">Room map — all {totalRooms} rooms</div>
          <div className="room-grid">
            {roomDots.map((dot, i) => (
              <div
                key={i}
                className="rdot"
                style={{ background: dot.occupied ? 'rgba(61,232,176,.25)' : 'rgba(232,75,106,.25)' }}
                title={dot.property + (dot.occupied ? ' (occupied)' : ' (vacant)')}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--dim)', fontFamily: 'monospace' }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: 'rgba(61,232,176,.25)' }} />Occupied
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8, color: 'var(--dim)', fontFamily: 'monospace' }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: 'rgba(232,75,106,.25)' }} />Vacant
            </div>
          </div>
        </div>
        <div>
          <div className="sec">Live signals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {signals.map((s, i) => (
              <div className="sig" key={i}>
                <div className={`sdot ${s.level}`} />
                <div className="sig-txt">{s.txt}</div>
                <div className="sig-meta">{s.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="sec">Properties</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {properties.map((p, i) => {
            const owner = getOwner(p.reference || '');
            const occ = p.roomsOccupied || 0;
            const total = p.totalRooms || 0;
            const occRate = total ? (occ / total) : 1;
            const occCls = occRate >= 0.9 ? 'occ-full' : occRate >= 0.6 ? 'occ-part' : 'occ-low';
            const warn = occRate < 0.5 ? ' ⚠' : '';
            const bolt = occRate < 0.9 && occRate >= 0.5 ? ' ⚡' : '';
            return (
              <div className="prow" key={i}>
                <div className={`cobadge ${owner.cls}`}>{owner.co}</div>
                <div className="prow-name">{p.name}</div>
                <div className="prow-addr">{p.postcode || ''}</div>
                <div className={`prow-occ ${occCls}`}>{occ}/{total}{warn}{bolt}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
