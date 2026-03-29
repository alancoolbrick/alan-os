// Property panel — live from COHO API
// Replaces hardcoded property panel with real-time occupancy data
(function(){
'use strict';

// COHO API config
var COHO_URL='https://api.coho.life/v1/public';
var COHO_KEY='bf7c7e9f-37ab-414a-9267-288fa895817c';

// Ownership mapping (COHO doesn't track company ownership)
// Keys: COHO property reference prefix (before the random suffix)
var OWNERSHIP={
  '34-bristol-road':    {co:'PKS',cls:'cb-pks'},
  '111-bristol-road':   {co:'PKS',cls:'cb-pks'},
  '42-friarn-street':   {co:'PKS',cls:'cb-pks'},
  'flat-1-longfield':   {co:'PKS',cls:'cb-pks'},
  'flat-2-longfield':   {co:'PKS',cls:'cb-pks'},
  'flat-3-longfield':   {co:'PKS',cls:'cb-pks'},
  'flat-4-longfield':   {co:'PKS',cls:'cb-pks'},
  '63a-st-mary':        {co:'Roomy',cls:'cb-roomy'},
  '63b-st-mary':        {co:'Roomy',cls:'cb-roomy'},
  '63c-st-mary':        {co:'Roomy',cls:'cb-roomy'},
  '44-cranleigh':       {co:'Roomy',cls:'cb-roomy'},
  '60-taunton-road':    {co:'Alan',cls:'cb-al'},
  '14-willow-grove':    {co:'Alan',cls:'cb-al'}
};

function getOwner(ref){
  for(var prefix in OWNERSHIP){
    if(ref.startsWith(prefix)) return OWNERSHIP[prefix];
  }
  return {co:'?',cls:'cb-al'};
}

// Normalise rent to monthly
function monthlyRent(amount,freq){
  if(!amount) return 0;
  switch(freq){
    case 'weekly': return amount*52/12;
    case 'fortnightly': return amount*26/12;
    case 'monthly': return amount;
    default: return amount;
  }
}

function init(){
  patchPropertyPanel();
  patchSetMode();
}

function patchPropertyPanel(){
  var panel=document.getElementById('panel-property');
  if(!panel) return;
  panel.innerHTML='\
    <div class="mode-header"><div class="mode-title">Portfolio</div><div class="mode-sub" id="prop-sub">Loading from COHO...</div></div>\
    <div class="g3">\
      <div class="card"><div class="card-lbl">Rent Roll</div><div class="card-val gold" id="prop-rent">—</div><div class="card-note" id="prop-rent-note">monthly (occupied)</div></div>\
      <div class="card"><div class="card-lbl">Vacancy Loss</div><div class="card-val rose" id="prop-vacancy">—</div><div class="card-note" id="prop-vacancy-note">loading</div></div>\
      <div class="card"><div class="card-lbl">Occupancy</div><div class="card-val teal" id="prop-occ">—</div><div class="card-note" id="prop-occ-note">loading<div class="bar"><div class="bar-fill" id="prop-occ-bar" style="width:0%;background:var(--teal)"></div></div></div></div>\
    </div>\
    <div class="g2">\
      <div>\
        <div class="sec">Room map <span id="prop-room-count" style="font-size:8px;color:var(--dim)"></span></div>\
        <div class="room-grid" id="roomGrid"></div>\
        <div style="display:flex;gap:9px;margin-top:7px">\
          <div style="display:flex;align-items:center;gap:4px;font-size:8px;color:var(--dim);font-family:monospace"><div style="width:6px;height:6px;border-radius:2px;background:rgba(61,232,176,.25)"></div>Occupied</div>\
          <div style="display:flex;align-items:center;gap:4px;font-size:8px;color:var(--dim);font-family:monospace"><div style="width:6px;height:6px;border-radius:2px;background:rgba(232,75,106,.25)"></div>Vacant</div>\
        </div>\
      </div>\
      <div>\
        <div class="sec">Live signals</div>\
        <div style="display:flex;flex-direction:column;gap:4px" id="prop-signals">\
          <div class="brain-item-loading">Loading...</div>\
        </div>\
      </div>\
    </div>\
    <div>\
      <div class="sec">Properties</div>\
      <div style="display:flex;flex-direction:column;gap:3px" id="prop-list">\
        <div class="brain-item-loading">Loading from COHO...</div>\
      </div>\
    </div>\
  ';
}

function patchSetMode(){
  var origSetMode=window.setMode;
  window.setMode=function(m){
    origSetMode(m);
    if(m==='property') fetchPropertyData();
  };
  // Also fetch on first load since property is the default panel
  setTimeout(function(){fetchPropertyData()},200);
}

var allProperties=[];

async function fetchPropertyData(){
  try{
    var r=await fetch(COHO_URL+'/properties?includeRooms=true&pageSize=50',{
      headers:{'Authorization':'Bearer '+COHO_KEY}
    });
    if(!r.ok) throw new Error('COHO HTTP '+r.status);
    var data=await r.json();
    allProperties=data.items||[];
    renderProperty();
  }catch(e){
    var el=document.getElementById('prop-list');
    if(el) el.innerHTML='<div class="brain-item-loading" style="color:var(--rose)">COHO failed: '+esc(e.message)+'</div>';
    setText('prop-sub','COHO connection failed');
  }
}

function renderProperty(){
  var totalRooms=0, totalOcc=0, totalRent=0, totalPotential=0;
  var roomDots=[];
  var signals=[];

  // Sort: worst occupancy first
  allProperties.sort(function(a,b){
    var aRate=a.totalRooms?(a.roomsOccupied/a.totalRooms):1;
    var bRate=b.totalRooms?(b.roomsOccupied/b.totalRooms):1;
    return aRate-bRate;
  });

  allProperties.forEach(function(p){
    var rooms=p.rooms||[];
    var occ=p.roomsOccupied||0;
    var total=p.totalRooms||rooms.length;
    totalRooms+=total;
    totalOcc+=occ;

    // Calculate rent from room data
    var propRent=0;
    var propPotential=0;
    rooms.forEach(function(r){
      var mr=monthlyRent(r.rent,r.paymentFrequency);
      propPotential+=mr;
      // Room is occupied if index < roomsOccupied (approximate — API doesn't flag per-room)
      // Better: use occupancy count
    });
    // Approximate: occupied rooms contribute rent, vacant don't
    // Since we can't tell which specific rooms are occupied, use average rent
    var avgRent=rooms.length?propPotential/rooms.length:0;
    propRent=avgRent*occ;
    totalRent+=propRent;
    totalPotential+=propPotential;

    // Room dots
    for(var i=0;i<total;i++){
      roomDots.push({
        occupied:i<occ,
        property:p.name
      });
    }

    // Generate signals for problem properties
    var occPct=total?(occ/total*100):100;
    if(occPct<50){
      signals.push({level:'r',txt:p.name+' — '+occ+'/'+total+' rooms ('+Math.round(occPct)+'%)',meta:'Critical vacancy'});
    }else if(occPct<80){
      signals.push({level:'a',txt:p.name+' — '+occ+'/'+total+' rooms',meta:Math.round(occPct)+'% occupied'});
    }
  });

  // Add positive signal if occupancy is good
  if(totalRooms&&(totalOcc/totalRooms)>=0.9){
    signals.push({level:'g',txt:'Portfolio above 90% occupancy',meta:'Strong position'});
  }
  signals.push({level:'g',txt:'COHO — live data','meta':'Synced just now'});

  var occPct=totalRooms?Math.round(totalOcc/totalRooms*100):0;
  var vacancyLoss=totalPotential-totalRent;

  // Update headline stats
  setText('prop-rent','£'+Math.round(totalRent).toLocaleString());
  setText('prop-rent-note','actual monthly (occupied rooms)');
  setText('prop-vacancy','−£'+Math.round(vacancyLoss).toLocaleString());
  setText('prop-vacancy-note',(totalRooms-totalOcc)+' rooms vacant');
  setText('prop-occ',occPct+'%');
  setText('prop-occ-note',totalOcc+' of '+totalRooms+' rooms');
  var occBar=document.getElementById('prop-occ-bar');
  if(occBar) occBar.style.width=occPct+'%';
  setText('prop-sub',allProperties.length+' properties · '+totalRooms+' rooms · Live from COHO');
  setText('prop-room-count','— all '+totalRooms+' rooms');

  // Render room grid
  var grid=document.getElementById('roomGrid');
  if(grid){
    grid.innerHTML='';
    roomDots.forEach(function(dot){
      var d=document.createElement('div');
      d.className='rdot';
      d.style.background=dot.occupied?'rgba(61,232,176,.25)':'rgba(232,75,106,.25)';
      d.title=dot.property+(dot.occupied?' (occupied)':' (vacant)');
      grid.appendChild(d);
    });
  }

  // Render signals
  var sigEl=document.getElementById('prop-signals');
  if(sigEl){
    sigEl.innerHTML='';
    signals.forEach(function(s){
      var d=document.createElement('div');d.className='sig';
      d.innerHTML='<div class="sdot '+s.level+'"></div><div class="sig-txt">'+esc(s.txt)+'</div><div class="sig-meta">'+esc(s.meta)+'</div>';
      sigEl.appendChild(d);
    });
  }

  // Render property list
  var list=document.getElementById('prop-list');
  if(list){
    list.innerHTML='';
    allProperties.forEach(function(p){
      var owner=getOwner(p.reference);
      var occ=p.roomsOccupied||0;
      var total=p.totalRooms||0;
      var occPct=total?(occ/total):1;
      var occCls=occPct>=0.9?'occ-full':(occPct>=0.6?'occ-part':'occ-low');
      var warn=occPct<0.5?' ⚠':'';
      var bolt=occPct<0.9&&occPct>=0.5?' ⚡':'';

      var d=document.createElement('div');d.className='prow';
      d.innerHTML='<div class="cobadge '+owner.cls+'">'+esc(owner.co)+'</div><div class="prow-name">'+esc(p.name)+'</div><div class="prow-addr">'+esc(p.postcode||'')+'</div><div class="prow-occ '+occCls+'">'+occ+'/'+total+warn+bolt+'</div>';
      list.appendChild(d);
    });
  }

  // Update wing context if available
  if(typeof currentMode!=='undefined'&&currentMode==='property'&&typeof wingData!=='undefined'){
    wingData.property.cards[0].val='£'+Math.round(totalRent).toLocaleString();
    wingData.property.cards[1].val=occPct+'%';
    wingData.property.rows=allProperties.slice(0,5).map(function(p){
      var occ=p.roomsOccupied||0;
      var total=p.totalRooms||0;
      return {l:p.name.split(',')[0].split(' ').slice(0,2).join(' '),v:occ+'/'+total+' rooms'};
    });
    if(typeof renderWing==='function') renderWing('property');
  }
}

function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=v}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}

window._propertyPatch={fetch:fetchPropertyData};

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}
})();
