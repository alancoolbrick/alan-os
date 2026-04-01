import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PeoplePanelProps {
  onAskClaude?: (question: string) => void;
}

const AV_COLORS = ['av-g', 'av-t', 'av-b', 'av-r'];

const KNOWN_ROLES: Record<string, string> = {
  'lena': 'VA \u00B7 Coho \u00B7 SpareRoom \u00B7 Hammock \u00B7 Asana',
  'john': 'House Manager \u00B7 Maintenance \u00B7 Viewings',
  'andrzej': 'Handyman \u00B7 Trowbridge',
  'kieran': 'Gorilla Accounting \u00B7 FreeAgent \u00B7 Payroll',
  'kieran whelan': 'Gorilla Accounting \u00B7 FreeAgent \u00B7 Payroll',
  'jake': 'Solo Wave Ltd \u00B7 50/50',
  'jake barnett': 'Solo Wave Ltd \u00B7 50/50',
  'nicole': 'Silent partner \u00B7 PKS (25%) \u00B7 Roomy (50%)',
  'nic': 'Silent partner \u00B7 PKS (25%) \u00B7 Roomy (50%)',
  'lukasz': 'PKS 50% \u00B7 Viewings Trowbridge \u00B7 Longfield House',
  'lukasz palmowski': 'PKS 50% \u00B7 Viewings Trowbridge \u00B7 Longfield House',
};

const PARTNER_NAMES = ['jake', 'nicole', 'nic'];
const SILENT_PARTNERS = ['nicole', 'nic'];
const NAME_ALIASES: Record<string, string[]> = {
  'nicole': ['nic', 'nick'],
  'nic': ['nicole', 'nick'],
};

function isSilentPartner(name: string) {
  const first = name.split(' ')[0].toLowerCase();
  return SILENT_PARTNERS.includes(first) || SILENT_PARTNERS.includes(name.toLowerCase());
}

function findTasksForPerson(personName: string, tasks: any[]) {
  if (isSilentPartner(personName)) return [];
  const first = personName.split(' ')[0].toLowerCase();
  const full = personName.toLowerCase();
  const searchNames = [first, full, ...(NAME_ALIASES[first] || [])];
  return tasks.filter((t) => {
    const title = t.title.toLowerCase();
    const tags = (t.tags || []).join(' ').toLowerCase();
    return searchNames.some((n) => title.includes(n) || tags.includes(n));
  });
}

export default function PeoplePanel({ onAskClaude }: PeoplePanelProps) {
  const [people, setPeople] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [{ data: peopleData }, { data: tasksData }] = await Promise.all([
        supabase.from('items')
          .select('id,title,type,status,content,summary,tags,next_actions,created_at')
          .eq('type', 'people')
          .neq('archived', true)
          .order('title', { ascending: true }),
        supabase.from('items')
          .select('id,title,type,status,tags,next_actions,created_at')
          .eq('type', 'task')
          .neq('status', 'done')
          .neq('archived', true)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setPeople(peopleData || []);
      setTasks(tasksData || []);
      setLoading(false);
    } catch (e) {
      console.error('People fetch failed', e);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const teamMembers: any[] = [];
  const partners: any[] = [];

  people.forEach((person, i) => {
    const firstName = person.title.split(' ')[0].toLowerCase();
    const isPartner = PARTNER_NAMES.some((pn) => firstName === pn || person.title.toLowerCase() === pn);
    const silent = isSilentPartner(person.title);
    const initials = person.title.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    const avClass = AV_COLORS[i % AV_COLORS.length];
    const summary = (person.summary || '').slice(0, 80);
    const role = summary || KNOWN_ROLES[person.title.toLowerCase()] || KNOWN_ROLES[firstName] ||
      (person.tags?.length ? person.tags.slice(0, 3).join(' \u00B7 ') : 'Brain entry');
    const matched = findTasksForPerson(person.title, tasks);
    const na = person.next_actions;
    let actionStr = '';
    if (na && Array.isArray(na) && na.length) {
      actionStr = '\u2192 ' + na[0];
    } else if (matched.length) {
      actionStr = '\u2192 ' + matched[0].title;
    } else if (silent) {
      actionStr = '\u2192 No pending actions \u2713';
    }

    const card = (
      <div
        className="pcard"
        key={person.id}
        onClick={() => onAskClaude?.('What do I need from ' + person.title + '?')}
      >
        <div className={`avatar ${avClass}`}>{initials}</div>
        <div>
          <div className="pname">{person.title}</div>
          <div className="prole">{role}</div>
          {actionStr && <div className="paction">{actionStr}</div>}
          {matched.length > 1 && (
            <div className="paction" style={{ color: 'var(--dim)', fontSize: 8 }}>
              +{matched.length - 1} more tasks
            </div>
          )}
        </div>
      </div>
    );

    if (isPartner) partners.push(card);
    else teamMembers.push(card);
  });

  return (
    <>
      <div className="mode-header">
        <div className="mode-title">People</div>
        <div className="mode-sub">
          {loading ? 'Loading from Supabase...' : `Team · Partners · ${people.length} in brain · Live`}
        </div>
      </div>
      <div className="g2">
        <div>
          <div className="sec">Core team</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {teamMembers.length ? teamMembers : (
              <div className="brain-item-loading">No team members in brain yet</div>
            )}
          </div>
        </div>
        <div>
          <div className="sec">Partners</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {partners.length ? partners : (
              <div className="brain-item-loading">No partners in brain yet</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
