// People panel — live from Supabase
// Preserves original layout: two columns (Core team / Partners)
// Each person card shows their matched task as an action line
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
var allTasks=[];

function patchPeoplePanel(){
  var panel=document.getElementById('panel-people');
  if(!panel)return;
  panel.innerHTML='\
    <div class="mode-header"><div class="mode-title">People</div><div class="mode-sub" id="people-sub">Loading from Supabase...</div></div>\
    <div class="g2">\
      <div>\
        <div class="sec">Core team</div>\
        <div style="display:flex;flex-direction:column;gap:5px" id="people-col-team">\
          <div class="brain-item-loading">Loading...</div>\
        </div>\
      </div>\
      <div>\
        <div class="sec">Partners</div>\
        <div style="display:flex;flex-direction:column;gap:5px" id="people-col-partners">\
          <div class="brain-item-loading">Loading...</div>\
        </div>\
      </div>\
    </div>\
  ';
}

function patchSetMode(){
  var origSetMode=window.setMode;
  window.setMode=function(m){
    origSetMode(m);
    if(m==='people') fetchPeopleData();
  };
}

var avColors=['av-g','av-t','av-b','av-r'];

// Known role enrichment — maps names/aliases to roles for display
// Brain data takes priority over these fallbacks
var knownRoles={
  'lena':'VA \u00B7 Coho \u00B7 SpareRoom \u00B7 Hammock \u00B7 Asana',
  'john':'House Manager \u00B7 Maintenance \u00B7 Viewings',
  'kieran':'Gorilla Accounting \u00B7 FreeAgent \u00B7 Payroll',
  'kieran whelan':'Gorilla Accounting \u00B7 FreeAgent \u00B7 Payroll',
  'jacob':'Solo Wave Ltd \u00B7 50/50',
  'jacob barnett':'Solo Wave Ltd \u00B7 50/50',
  'nicole':'Silent partner \u00B7 PKS (25%) \u00B7 Roomy (50%)',
  'nic':'Silent partner \u00B7 PKS (25%) \u00B7 Roomy (50%)',
  'lukasz':'PKS Properties \u00B7 50% shareholder',
  'lukasz palmowski':'PKS Properties \u00B7 50% shareholder'
};

// Which column each person belongs in (by first name lowercase)
var partnerNames=['jacob','nicole','nic','lukasz'];

// Silent partners — no task matching, only signing/admin actions shown
// These people don't do operational work so task cross-referencing is noise
var silentPartners=['nicole','nic'];

// Name aliases for matching (e.g. "Nic" matches "Nicole")
var nameAliases={
  'nicole':['nic','nick'],
  'nic':['nicole','nick']
};

async function fetchPeopleData(){
  try{
    var r=await fetch(SB_URL+'/rest/v1/items?select=id,title,type,status,content,summary,tags,next_actions,created_at&type=eq.people&archived=not.eq.true&order=title.asc',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    if(!r.ok)throw new Error('HTTP '+r.status);
    peopleItems=await r.json();

    var r2=await fetch(SB_URL+'/rest/v1/items?select=id,title,type,status,tags,next_actions,created_at&type=eq.task&status=neq.done&archived=not.eq.true&order=created_at.desc&limit=50',{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
    });
    allTasks=r2.ok?await r2.json():[];

    renderPeople();
  }catch(e){
    var el=document.getElementById('people-col-team');
    if(el) el.innerHTML='<div class="brain-item-loading" style="color:var(--rose)">Failed: '+e.message+'</div>';
  }
}

function isSilentPartner(personName){
  var firstName=personName.split(' ')[0].toLowerCase();
  return silentPartners.indexOf(firstName)!==-1||silentPartners.indexOf(personName.toLowerCase())!==-1;
}

function findTasksForPerson(personName){
  // Silent partners don't get task matching — only their own next_actions
  if(isSilentPartner(personName)) return [];

  var firstName=personName.split(' ')[0].toLowerCase();
  var fullName=personName.toLowerCase();
  // Build list of names to search for (including aliases)
  var searchNames=[firstName,fullName];
  var aliases=nameAliases[firstName]||[];
  searchNames=searchNames.concat(aliases);

  return allTasks.filter(function(t){
    var title=t.title.toLowerCase();
    var tags=(t.tags||[]).join(' ').toLowerCase();
    return searchNames.some(function(name){return title.includes(name)||tags.includes(name)});
  });
}

function renderPeople(){
  var sub=document.getElementById('people-sub');
  if(sub) sub.textContent='Team \u00B7 Partners \u00B7 '+peopleItems.length+' in brain \u00B7 Live';

  var teamCol=document.getElementById('people-col-team');
  var partnerCol=document.getElementById('people-col-partners');
  if(!teamCol||!partnerCol)return;
  teamCol.innerHTML='';
  partnerCol.innerHTML='';

  var teamCount=0,partnerCount=0;
  var totalActions=0;
  var waitingCount=0;

  peopleItems.forEach(function(person,i){
    var firstName=person.title.split(' ')[0].toLowerCase();
    var isPartner=partnerNames.some(function(pn){return firstName===pn||person.title.toLowerCase()===pn});
    var isSilent=isSilentPartner(person.title);

    var initials=person.title.split(' ').map(function(w){return w[0]}).join('').slice(0,2).toUpperCase();
    var avClass=avColors[i%avColors.length];

    // Role: prefer brain summary, then known roles, then tags
    var summary=(person.summary||'').slice(0,80);
    var role=summary||knownRoles[person.title.toLowerCase()]||knownRoles[firstName]||((person.tags&&person.tags.length)?person.tags.slice(0,3).join(' \u00B7 '):'Brain entry');

    // Find matched tasks (empty for silent partners)
    var matched=findTasksForPerson(person.title);
    totalActions+=matched.length;

    // Action line: prefer person's own next_actions, then first matched task
    var actionStr='';
    var na=person.next_actions;
    if(na&&Array.isArray(na)&&na.length){
      actionStr='\u2192 '+na[0];
    } else if(matched.length){
      actionStr='\u2192 '+matched[0].title;
    } else if(isSilent){
      actionStr='\u2192 No pending actions \u2713';
    }

    // Count waiting tasks
    matched.forEach(function(t){if(t.status==='waiting')waitingCount++});

    var d=document.createElement('div');d.className='pcard';
    d.innerHTML='<div class="avatar '+avClass+'">'+initials+'</div><div><div class="pname">'+esc(person.title)+'</div><div class="prole">'+esc(role)+'</div>'+(actionStr?'<div class="paction">'+esc(actionStr)+'</div>':'')+(matched.length>1?'<div class="paction" style="color:var(--dim);font-size:8px">+'+String(matched.length-1)+' more tasks</div>':'')+'</div>';
    d.addEventListener('click',function(){if(typeof quickSend==='function') quickSend('What do I need from '+person.title+'?')});

    if(isPartner){
      partnerCol.appendChild(d);
      partnerCount++;
    } else {
      teamCol.appendChild(d);
      teamCount++;
    }
  });

  if(!teamCount) teamCol.innerHTML='<div class="brain-item-loading">No team members in brain yet</div>';
  if(!partnerCount) partnerCol.innerHTML='<div class="brain-item-loading">No partners in brain yet</div>';

  // Update wing context
  if(typeof currentMode!=='undefined'&&currentMode==='people'&&typeof wingData!=='undefined'){
    wingData.people.cards[0].val=String(totalActions);
    wingData.people.cards[0].note='open actions across team';
    wingData.people.cards[1].val=String(waitingCount);
    wingData.people.cards[1].note='waiting on others';
    wingData.people.rows=peopleItems.slice(0,4).map(function(p){
      var matched=findTasksForPerson(p.title);
      var na=p.next_actions;
      var isSilent=isSilentPartner(p.title);
      var action=(na&&Array.isArray(na)&&na.length)?na[0]:(matched.length?matched[0].title:(isSilent?'Silent partner \u2013 no actions':'No pending actions \u2713'));
      return {l:p.title.split(' ')[0],v:action.slice(0,40)};
    });
    if(typeof renderWing==='function') renderWing('people');
  }
}

function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}

window._peoplePatch={fetch:fetchPeopleData};

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init)}else{init()}
})();
