// People panel — live from Supabase
(function(){
'use strict';

function init(){
  if(typeof SB_URL==='undefined'||typeof SB_KEY==='undefined'){
    setTimeout(init,100);return;
  }
  patchPeoplePanel();
  patchSetMode();
}

var peopleItems=[];
var peopleLoaded=false;

function patchPeoplePanel(){
  var panel=document.getElementById('panel-people');
  if(!panel)return;
  panel.innerHTML=`
    <div class="mode-header"><div class="mode-title">People</div><div class="mode-sub" id="people-sub">Loading from Supabase...</div></div>
    <div class="g2">
      <div>
        <div class="sec">Team & Partners</div>
        <div style="display:flex;flex-direction:column;gap:5px" id="people-team-list">
          <div class="brain-item-loading">Loading...</div>
        </div>
      </div>
      <div>
        <div class="sec">Related Tasks & Actions</div>
        <div style="display:flex;flex-direction:column;gap:4px" id="people-actions-list">
          <div class="brain-item-loading">Loading...</div>
        </div>
      </div>
    </div>
  `;
}

function patchSetMode(){
  var origSetMode=window.setMode;
  var origPatched=window._focusPatch?true:false;
  window.setMode=function(m){
    origSetMode(m);
    if(m==='people') fetchPeopleData();
  };
}

var avColors=['av-g','av-t','av-b','av-r'];

async function fetchPeopleData(){
  try{
    // Fetch people items
    var r=await fetch(SB_URL+'/rest/v1/items?select=id,title,type,status,content,summary,tags,next_actions,created_at&type=eq.people&archived=not.eq.true&order=title.asc',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    peopleItems=await r.json();

    // Also fetch tasks to find actions mentioning people
    var r2=await fetch(SB_URL+'/rest/v1/items?select=id,title,type,status,tags,next_actions,created_at&type=eq.task&status=neq.done&archived=not.eq.true&order=created_at.desc&limit=30',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    var tasks=r2.ok?await r2.json():[];

    renderPeople(tasks);
  }catch(e){
    var el=document.getElementById('people-team-list');
    if(el) el.innerHTML='<div class="brain-item-loading" style="color:var(--rose)">Failed: '+e.message+'</div>';
  }
}

function renderPeople(tasks){
  var sub=document.getElementById('people-sub');
  if(sub) sub.textContent=peopleItems.length+' people in brain \u00B7 Live from Supabase';

  // Render people cards
  var container=document.getElementById('people-team-list');
  if(!container)return;
  if(!peopleItems.length){
    container.innerHTML='<div class="brain-item-loading">No people entries in the brain yet. Use /save via WhatsApp to add them.</div>';
  } else {
    container.innerHTML='';
    peopleItems.forEach(function(person,i){
      var initials=person.title.split(' ').map(function(w){return w[0]}).join('').slice(0,2).toUpperCase();
      var avClass=avColors[i%avColors.length];
      var summary=person.summary||'';
      var nextActions=person.next_actions;
      var actionStr='';
      if(nextActions&&Array.isArray(nextActions)&&nextActions.length){
        actionStr='\u2192 '+nextActions[0];
      }
      var tags=(person.tags&&person.tags.length)?person.tags.slice(0,3).join(' \u00B7 '):'';
      var role=summary.slice(0,80)||(tags?tags:'Brain entry');

      var d=document.createElement('div');d.className='pcard';
      d.innerHTML='<div class="avatar '+avClass+'">'+initials+'</div><div><div class="pname">'+esc(person.title)+'</div><div class="prole">'+esc(role)+'</div>'+(actionStr?'<div class="paction">'+esc(actionStr)+'</div>':'')+'</div>';
      d.addEventListener('click',function(){if(typeof quickSend==='function') quickSend('What do I need from '+person.title+'?')});
      container.appendChild(d);
    });
  }

  // Render related tasks
  var actionsContainer=document.getElementById('people-actions-list');
  if(!actionsContainer)return;

  // Try to match tasks that mention people names
  var peopleNames=peopleItems.map(function(p){return p.title.toLowerCase()});
  var relatedTasks=tasks.filter(function(t){
    var title=t.title.toLowerCase();
    return peopleNames.some(function(name){return title.includes(name.split(' ')[0].toLowerCase())});
  });

  // Also show tasks with 'waiting' status as they likely involve people
  var waitingTasks=tasks.filter(function(t){return t.status==='waiting'});
  var combined=[...relatedTasks,...waitingTasks];
  // Dedupe by id
  var seen=new Set();
  combined=combined.filter(function(t){if(seen.has(t.id))return false;seen.add(t.id);return true}).slice(0,10);

  if(!combined.length){
    actionsContainer.innerHTML='<div class="brain-item-loading">No related tasks found</div>';
  } else {
    actionsContainer.innerHTML='';
    combined.forEach(function(task){
      var tagCls=(typeof TYPE_TAG!=='undefined'&&TYPE_TAG[task.type])||'o';
      var age=task.created_at?timeAgo(task.created_at):'';
      var d=document.createElement('div');d.className='task';
      d.innerHTML='<div class="tcheck"></div><div class="task-body"><div class="task-txt">'+esc(task.title)+'<span class="tag '+tagCls+'">'+task.status+'</span></div><div class="task-meta">'+(age?age:'')+'</div></div>';
      d.addEventListener('click',function(){if(typeof quickSend==='function') quickSend('Tell me about: '+task.title)});
      actionsContainer.appendChild(d);
    });
  }

  // Update wing
  if(typeof currentMode!=='undefined'&&currentMode==='people'&&typeof wingData!=='undefined'){
    wingData.people.cards[0].val=String(combined.length);
    wingData.people.cards[0].note='tasks involving people';
    wingData.people.cards[1].val=String(waitingTasks.length);
    wingData.people.cards[1].note='waiting on others';
    if(typeof renderWing==='function') renderWing('people');
  }
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

window._peoplePatch={fetch:fetchPeopleData};

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}
})();
