export default function FinancePanel() {
  return (
    <>
      <div className="mode-header">
        <div className="mode-title">Finance</div>
        <div className="mode-sub">PKS · Roomy · Solo Wave · Personal</div>
      </div>

      <div className="g3">
        <div className="card">
          <div className="card-lbl">Target (full occ)</div>
          <div className="card-val gold">£31,000</div>
          <div className="card-note">fully occupied</div>
        </div>
        <div className="card">
          <div className="card-lbl">Actual Rent Roll</div>
          <div className="card-val teal">£23,100</div>
          <div className="card-note">current month</div>
        </div>
        <div className="card">
          <div className="card-lbl">Vacancy Drag</div>
          <div className="card-val rose">−£7,900</div>
          <div className="card-note">biggest lever</div>
        </div>
      </div>

      <div className="g2">
        <div>
          <div className="sec">Company performance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div className="fco">
              <div className="fco-row"><div className="fco-name">PKS Properties Ltd</div><div className="fco-val" style={{ color: 'var(--blue)' }}>£11,200/mo</div></div>
              <div className="bar"><div className="bar-fill" style={{ width: '72%', background: 'var(--blue)' }} /></div>
              <div className="fco-sub">25% Alan · 25% Nicole · 50% Lukasz</div>
            </div>
            <div className="fco">
              <div className="fco-row"><div className="fco-name">Roomy Properties Ltd</div><div className="fco-val" style={{ color: 'var(--teal)' }}>£6,800/mo</div></div>
              <div className="bar"><div className="bar-fill" style={{ width: '55%', background: 'var(--teal)' }} /></div>
              <div className="fco-sub">50% Alan · 50% Nicole</div>
            </div>
            <div className="fco">
              <div className="fco-row"><div className="fco-name">Solo Wave Ltd</div><div className="fco-val" style={{ color: 'var(--gold)' }}>£3,600/mo</div></div>
              <div className="bar"><div className="bar-fill" style={{ width: '100%', background: 'var(--gold)' }} /></div>
              <div className="fco-sub">50% Alan · 50% Jacob Barnett</div>
            </div>
            <div className="fco">
              <div className="fco-row"><div className="fco-name">Personal</div><div className="fco-val" style={{ color: 'var(--mid)' }}>£1,500/mo</div></div>
              <div className="bar"><div className="bar-fill" style={{ width: '100%', background: 'rgba(237,233,228,.35)' }} /></div>
              <div className="fco-sub">100% Alan · Taunton Rd + Willow Grove</div>
            </div>
          </div>
        </div>
        <div>
          <div className="sec">Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="sig"><div className="sdot r" /><div className="sig-txt">CGT calc — Brockley Rd sold 6 Mar</div><div className="sig-meta">Kieran · Gorilla</div></div>
            <div className="sig"><div className="sdot r" /><div className="sig-txt">42 Friarn — sell vs re-let</div><div className="sig-meta">£130k mortgage</div></div>
            <div className="sig"><div className="sdot a" /><div className="sig-txt">Hinkley demand window — 18–24mo</div><div className="sig-meta">Review Q2</div></div>
            <div className="sig"><div className="sdot g" /><div className="sig-txt">NK&AS Ltd closed 6 Mar 2026</div><div className="sig-meta">Complete ✓</div></div>
          </div>
          <div className="sec" style={{ marginTop: 10 }}>Systems</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="sig"><div className="sdot g" /><div className="sig-txt">FreeAgent — Gorilla Accounting</div><div className="sig-meta">Live</div></div>
            <div className="sig"><div className="sdot g" /><div className="sig-txt">Hammock — landlord accounts</div><div className="sig-meta">Live</div></div>
          </div>
        </div>
      </div>

      <div className="brain-item-loading" style={{ marginTop: 10 }}>
        Finance panel — waiting on Hammock API integration
      </div>
    </>
  );
}
