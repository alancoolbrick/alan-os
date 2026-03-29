// Action Stream — live from Supabase Brain + COHO API
// Replaces hardcoded stream with real-time signals
(function(){
'use strict';

var COHO_URL='https://api.coho.life/v1/public';
var COHO_KEY='bf7c7e9f-37ab-414a-9267-288fa895817c';

function init(){
  if(typeof SB_URL==='undefined'||typeof SB_KEY==='undefined'){
    setTimeout(init,100);return;
  }
  fetchStreamData();
  // Refresh every 5 minutes
  setInterval(fetchStreamData,300000);
}

async function fetchStreamData(){
  var signals=[];
  try{
    // 1. Brain items — inbox, focus, overdue scheduled, recent next actions
    var r=await fetch(SB_URL+'/rest/v1/items?select=id,title,type,status,doer,execution_status,tags,due_date,created_at,updated_at&archived=not.eq.true&order=updated_at.desc&limit=80',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    if(r.ok){
      var items=await r.json();
      signals=signals.concat(brainSignals(items));
    }
  }catch(e){console.warn('Stream: brain fetch failed',e)}

  try{
    // 2. COHO — open maintenance
    var r2=await fetch(COHO_URL+'/maintenance?pageSize=100',{
      headers:{'Authorization':'Bearer '+COHO_KEY}
    });
    if(r2.ok){
      var maint=await r2.json();
      signals=signals.concat(maintenanceSignals(maint.items||[]));
    }
  }catch(e){console.warn('Stream: COHO maintenance fetch failed',e)}

  try{
    // 3. COHO — vacancy signals
    var r3=await fetch(COHO_URL+'/properties?includeRooms=true&pageSize=50',{
      headers:{'Authorization':'Bearer '+COHO_KEY}
    });
    if(r3.ok){
      var props=await r3.json();
      signals=signals.concat(vacancySignals(props.items||[]));
    }
  }catch(e){console.warn('Stream: COHO properties fetch failed',e)}

  // Sort: urgent first, then today, then watching
  var order={urgent:0,today:1,watching:2};
  signals.sort(function(a,b){return (order[a.priority]||9)-(order[b.priority]||9)});

  renderStream(signals);
}

function brainSignals(items){
  var signals=[];
  var inbox=items.filter(function(i){return i.status==='inbox'});
  var focus=items.filter(function(i){return i.status==='focus'});
  var next=items.filter(function(i){return i.status==='next'});
  var scheduled=items.filter(function(i){return i.status==='scheduled'});
  var aiFailed=items.filter(function(i){return i.doer==='ai'&&i.execution_status==='failed'});

  // Inbox items need triage
  if(inbox.length>0){
    signals.push({
      priority:'urgent',src:'focus',srcLbl:'Brain',
      age:inbox.length>1?inbox.length+' items':'1 item',
      txt:'Inbox needs triage — '+inbox.length+' item'+(inbox.length>1?'s':''),
      detail:inbox.slice(0,3).map(function(i){return i.title}).join(' · '),
      peek:{title:'Inbox Triage',body:'You have '+inbox.length+' item'+(inbox.length>1?'s':'')+' in your inbox waiting to be processed. GTD principle: inbox zero daily.',actions:[{lbl:'Open Focus',primary:true}]}
    });
  }

  // Overdue scheduled items
  var today=new Date().toISOString().slice(0,10);
  var overdue=scheduled.filter(function(i){return i.due_date&&i.due_date<today});
  if(overdue.length>0){
    overdue.forEach(function(i){
      signals.push({
        priority:'urgent',src:'focus',srcLbl:'Brain',
        age:timeAgo(i.due_date+'T00:00:00Z'),
        txt:'Overdue: '+i.title,
        detail:'Due '+i.due_date,
        peek:{title:'Overdue Task',body:i.title+' was due on '+i.due_date+'. This needs attention.',actions:[{lbl:'Ask Claude',primary:true}]}
      });
    });
  }

  // AI executor failures
  if(aiFailed.length>0){
    signals.push({
      priority:'urgent',src:'focus',srcLbl:'AI Queue',
      age:aiFailed.length+' failed',
      txt:'AI executor — '+aiFailed.length+' failed task'+(aiFailed.length>1?'s':''),
      detail:aiFailed.slice(0,2).map(function(i){return i.title}).join(' · '),
      peek:{title:'AI Executor Failures',body:aiFailed.length+' AI tasks have failed and need investigation. Check Railway logs and API key.',actions:[{lbl:'View AI Queue',primary:true}]}
    });
  }

  // Focus items (active work)
  focus.forEach(function(i){
    signals.push({
      priority:'today',src:'focus',srcLbl:'Focus',
      age:timeAgo(i.updated_at),
      txt:i.title,
      detail:(i.tags&&i.tags.length)?i.tags.join(' · '):(i.type||'task'),
      peek:{title:i.title,body:'Currently in Focus. Last updated '+timeAgo(i.updated_at)+'.',actions:[{lbl:'Ask Claude',primary:true}]}
    });
  });

  // Recent next actions (top 5 by most recently updated)
  next.slice(0,5).forEach(function(i){
    signals.push({
      priority:'watching',src:'focus',srcLbl:'Next',
      age:timeAgo(i.updated_at),
      txt:i.title,
      detail:(i.tags&&i.tags.length)?i.tags.join(' · '):'ready to do',
      peek:{title:i.title,body:'Next action — ready to work on.',actions:[{lbl:'Ask Claude',primary:true}]}
    });
  });

  return signals;
}

function maintenanceSignals(items){
  var signals=[];
  var open=items.filter(function(i){return i.publicStatus!=='completed'&&i.publicStatus!=='closed'});

  open.forEach(function(i){
    var isUrgent=(i.severity==='high'||i.severity==='emergency');
    signals.push({
      priority:isUrgent?'urgent':'today',
      src:'coho',srcLbl:'Maintenance',
      age:timeAgo(i.created),
      txt:i.title.split(' > ').pop()+' — '+i.propertyName,
      detail:(i.tenantName?i.tenantName+' · ':'')+i.publicStatus+(i.severity?' · '+i.severity:''),
      peek:{title:i.title,body:'Reported at '+i.propertyName+(i.tenantName?' by '+i.tenantName:'')+'. Status: '+i.publicStatus+'.'+(i.requestMessage?' "'+i.requestMessage.slice(0,100)+'"':''),actions:[{lbl:'View in COHO',primary:true}]}
    });
  });

  return signals;
}

function vacancySignals(properties){
  var signals=[];
  properties.forEach(function(p){
    var total=p.totalRooms||0;
    var occ=p.roomsOccupied||0;
    if(total===0)return;
    var pct=Math.round((occ/total)*100);
    // Flag properties below 60% occupancy
    if(pct<60&&total>=3){
      var vacant=total-occ;
      signals.push({
        priority:pct<30?'urgent':'today',
        src:'coho',srcLbl:'Vacancy',
        age:pct+'% occ',
        txt:p.name+' — '+occ+'/'+total+' occupied',
        detail:vacant+' vacant room'+(vacant>1?'s':'')+' · needs attention',
        peek:{title:p.name+' — Low Occupancy',body:'Only '+occ+' of '+total+' rooms occupied ('+pct+'%). Each empty room costs revenue. Consider: SpareRoom ad refresh, price review, or Lena outreach.',actions:[{lbl:'Review Strategy',primary:true},{lbl:'View Property'}]}
      });
    }
  });
  return signals;
}

function renderStream(signals){
  var stream=document.getElementById('streamBody');
  if(!stream)return;
  stream.innerHTML='';

  // Update header
  var meta=document.querySelector('.stream-meta');
  if(meta) meta.textContent=signals.length+' signals · live from Brain + COHO · auto-refreshes';

  if(!signals.length){
    stream.innerHTML='<div style="padding:20px 10px;text-align:center;color:var(--dim);font-size:9px;font-family:\'IBM Plex Mono\',monospace">No active signals — all clear</div>';
    return;
  }

  var groups={urgent:'Urgent',today:'Today',watching:'Watching'};
  Object.keys(groups).forEach(function(g){
    var items=signals.filter(function(i){return i.priority===g});
    if(!items.length)return;
    var grpDiv=document.createElement('div');grpDiv.className='stream-group';
    grpDiv.innerHTML='<div class="stream-group-lbl">'+groups[g]+'</div>';
    items.forEach(function(item){
      var d=document.createElement('div');
      d.className='ablock '+item.priority;
      d.setAttribute('data-peek',JSON.stringify(item.peek));
      d.innerHTML=
        '<div class="ablock-src">'+
          '<span class="src-badge sb-'+item.src+'">'+esc(item.srcLbl)+'</span>'+
          (item.age?'<span class="ablock-age">'+esc(item.age)+'</span>':'')+
        '</div>'+
        '<div class="ablock-txt">'+esc(item.txt)+'</div>'+
        '<div class="ablock-detail">'+esc(item.detail)+'</div>'+
        '<div class="ablock-actions">'+
          '<div class="ab-btn primary" onclick="quickSendFromBlock(event,\''+esc(item.txt).replace(/'/g,"\\'")+'\')">Ask Claude</div>'+
          '<div class="ab-btn">Snooze</div>'+
        '</div>';
      d.addEventListener('mouseenter',function(){if(typeof showPeekHint==='function')showPeekHint(d)});
      d.addEventListener('mouseleave',function(){if(typeof hidePeek==='function')hidePeek()});
      grpDiv.appendChild(d);
    });
    stream.appendChild(grpDiv);
  });
}

function timeAgo(iso){
  if(!iso)return '';
  var s=Math.floor((Date.now()-new Date(iso))/1000);
  if(s<0)return 'upcoming';
  if(s<60)return 'just now';
  var m=Math.floor(s/60);if(m<60)return m+'m ago';
  var h=Math.floor(m/60);if(h<24)return h+'h ago';
  var d=Math.floor(h/24);
  if(d<30)return d+'d ago';
  var mo=Math.floor(d/30);return mo+'mo ago';
}

function esc(s){if(!s)return '';var d=document.createElement('div');d.textContent=s;return d.innerHTML}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}
})();
