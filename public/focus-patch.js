// Focus panel — live from Supabase
// Self-patching script: replaces hardcoded Focus panel with live data
(function(){
'use strict';

// Wait for DOM and globals to be ready
function init(){
  if(typeof SB_URL==='undefined'||typeof SB_KEY==='undefined'){
    setTimeout(init,100);return;
  }
  patchFocusPanel();
  patchSetMode();
}

function patchFocusPanel(){
  const panel=document.getElementById('panel-focus');
  if(!panel)return;
  panel.innerHTML=`
    <div class="mode-header"><div class="mode-title">Focus</div><div class="mode-sub" id="focus-sub">ALAN OS · Built-in GTD · Loading...</div></div>
    <div class="g3">
      <div class="card"><div class="card-lbl">Inbox</div><div class="card-val rose" id="focus-inbox-count">—</div><div class="card-note">items to triage</div></div>
      <div class="card"><div class="card-lbl">Next Actions</div><div class="card-val gold" id="focus-next-count">—</div><div class="card-note">ready to do</div></div>
      <div class="card"><div class="card-lbl">Waiting On</div><div class="card-val teal" id="focus-waiting-count">—</div><div class="card-note">with others</div></div>
    </div>
    <div class="doer-bar" id="focusDoerBar">
      <div class="doer-btn active" data-fdoer="all" onclick="window._focusPatch.setDoer('all')">All <span class="doer-count" id="fd-count-all"></span></div>
      <div class="doer-btn" data-fdoer="human" onclick="window._focusPatch.setDoer('human')">\u{1F464} Human <span class="doer-count" id="fd-count-human"></span></div>
      <div class="doer-btn" data-fdoer="ai" onclick="window._focusPatch.setDoer('ai')">\u{1F916} AI <span class="doer-count" id="fd-count-ai"></span></div>
    </div>
    <div class="g2">
      <div>
        <div class="sec">Inbox <span id="focus-inbox-badge" style="font-size:8px;color:var(--rose)"></span></div>
        <div style="display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto" id="focus-inbox-list">
          <div class="brain-item-loading">Loading from Supabase...</div>
        </div>
      </div>
      <div>
        <div class="sec">Next Actions <span id="focus-next-badge" style="font-size:8px;color:var(--gold)"></span></div>
        <div style="display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto" id="focus-next-list">
          <div class="brain-item-loading">Loading from Supabase...</div>
        </div>
      </div>
    </div>
    <div class="g2" style="margin-top:6px">
      <div>
        <div class="sec">Waiting On <span id="focus-waiting-badge" style="font-size:8px;color:var(--teal)"></span></div>
        <div style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto" id="focus-waiting-list">
          <div class="brain-item-loading">Loading...</div>
        </div>
      </div>
      <div>
        <div class="sec">Recently Done <span id="focus-done-badge" style="font-size:8px;color:var(--teal)"></span></div>
        <div style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto" id="focus-done-list">
          <div class="brain-item-loading">Loading...</div>
        </div>
      </div>
    </div>
  `;
}

function patchSetMode(){
  var origSetMode=window.setMode;
  window.setMode=function(m){
    origSetMode(m);
    if(m==='focus') fetchFocusData();
  };
}

var focusAllItems=[];
var focusDoer='all';

async function fetchFocusData(){
  try{
    var r=await fetch(SB_URL+'/rest/v1/items?select=id,title,type,status,doer,execution_status,tags,next_actions,created_at,updated_at&archived=not.eq.true&order=created_at.desc',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    focusAllItems=await r.json();
    renderFocus();
  }catch(e){
    var el=document.getElementById('focus-inbox-list');
    if(el) el.innerHTML='<div class="brain-item-loading" style="color:var(--rose)">Failed to load: '+e.message+'</div>';
  }
}

function setFocusDoer(d){
  focusDoer=d;
  document.querySelectorAll('#focusDoerBar .doer-btn').forEach(function(b){b.classList.remove('active')});
  var el=document.querySelector('#focusDoerBar [data-fdoer="'+d+'"]');
  if(el) el.classList.add('active');
  renderFocus();
}

function renderFocus(){
  var items=focusAllItems;
  if(focusDoer!=='all') items=items.filter(function(i){return i.doer===focusDoer});

  var inbox=items.filter(function(i){return i.status==='inbox'});
  var next=items.filter(function(i){return i.status==='next'});
  var waiting=items.filter(function(i){return i.status==='waiting'});
  var done=items.filter(function(i){return i.status==='done'}).slice(0,8);

  // Headline stats (always unfiltered)
  var allInbox=focusAllItems.filter(function(i){return i.status==='inbox'});
  var allNext=focusAllItems.filter(function(i){return i.status==='next'});
  var allWaiting=focusAllItems.filter(function(i){return i.status==='waiting'});

  setText('focus-inbox-count',allInbox.length);
  setText('focus-next-count',allNext.length);
  setText('focus-waiting-count',allWaiting.length);
  setText('focus-sub','ALAN OS \u00B7 Live from Supabase \u00B7 '+focusAllItems.length+' items');

  setText('fd-count-all','('+focusAllItems.length+')');
  setText('fd-count-human','('+focusAllItems.filter(function(i){return i.doer==='human'}).length+')');
  setText('fd-count-ai','('+focusAllItems.filter(function(i){return i.doer==='ai'}).length+')');

  setText('focus-inbox-badge',inbox.length?'('+inbox.length+')':'');
  setText('focus-next-badge',next.length?'('+next.length+')':'');
  setText('focus-waiting-badge',waiting.length?'('+waiting.length+')':'');
  setText('focus-done-badge',done.length?'('+done.length+')':'');

  renderList('focus-inbox-list',inbox);
  renderList('focus-next-list',next);
  renderList('focus-waiting-list',waiting);
  renderList('focus-done-list',done);

  // Update wing context if in focus mode
  if(typeof currentMode!=='undefined'&&currentMode==='focus'&&typeof wingData!=='undefined'){
    wingData.focus.cards[0].val=String(allInbox.length);
    wingData.focus.cards[1].val=String(allNext.length);
    wingData.focus.rows[0].v=allInbox.length?'Triage '+allInbox.length+' items':'Inbox zero \u2713';
    wingData.focus.rows[1].v=allWaiting.length+' items with others';
    if(typeof renderWing==='function') renderWing('focus');
  }
}

function renderList(containerId,items){
  var c=document.getElementById(containerId);
  if(!c)return;
  if(!items.length){c.innerHTML='<div class="brain-item-loading">No items</div>';return}
  c.innerHTML='';
  items.forEach(function(item){
    var tagCls=(typeof TYPE_TAG!=='undefined'&&TYPE_TAG[item.type])||'o';
    var showExec=(item.doer==='ai'&&item.execution_status&&typeof EXEC_BADGES!=='undefined'&&EXEC_BADGES[item.execution_status]);
    var badge=showExec?'<span class="exec-badge '+EXEC_BADGES[item.execution_status].cls+'">'+EXEC_BADGES[item.execution_status].label+'</span>':'';
    var na=item.next_actions;
    var nextStr=(na&&Array.isArray(na)&&na.length)?na.slice(0,2).join(' \u00B7 '):'';
    var tags=(item.tags&&item.tags.length)?item.tags.slice(0,3).join(' \u00B7 '):'';
    var meta=nextStr||tags||item.status;
    var age=item.created_at?timeAgo(item.created_at):'';
    var d=document.createElement('div');d.className='task';
    d.innerHTML='<div class="tcheck"></div><div class="task-body"><div class="task-txt">'+esc(item.title)+badge+'<span class="tag '+tagCls+'">'+item.type+'</span>'+(item.doer==='ai'?'<span class="tag" style="background:rgba(155,107,232,.14);color:var(--violet)">ai</span>':'')+'</div><div class="task-meta">'+esc(meta)+(age?' \u00B7 '+age:'')+'</div></div>';
    d.addEventListener('click',function(){if(typeof quickSend==='function') quickSend('Tell me about: '+item.title)});
    c.appendChild(d);
  });
}

function timeAgo(iso){
  var s=Math.floor((Date.now()-new Date(iso))/1000);
  if(s<60)return 'just now';
  var m=Math.floor(s/60);if(m<60)return m+'m ago';
  var h=Math.floor(m/60);if(h<24)return h+'h ago';
  var d=Math.floor(h/24);return d+'d ago';
}

function setText(id,v){var el=document.getElementById(id);if(el)el.textContent=v}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}

// Expose for onclick handlers
window._focusPatch={setDoer:setFocusDoer,fetch:fetchFocusData};

// Init
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}
})();
