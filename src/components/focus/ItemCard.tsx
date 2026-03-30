

import { useState, useRef, useEffect } from 'react';
import { Item, ItemType, ItemStatus, NextAction, TYPE_COLOURS, AREA_COLOURS, ITEM_TYPES, ITEM_STATUSES, AREAS } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ItemCardProps {
  item: Item;
  onUpdate: () => void;
  isInbox?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onShowRelated?: (itemId: string) => void;
}

export default function ItemCard({ item, onUpdate, isInbox, dragHandleProps, onShowRelated }: ItemCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content || '');
  const [type, setType] = useState<ItemType>(item.type);
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [dueDate, setDueDate] = useState(item.due_date || '');
  const [area, setArea] = useState(item.area || '');
  const titleRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const typeColour = TYPE_COLOURS[item.type];
  const areaColour = AREA_COLOURS[item.area || ''];
  const isOverdue = item.due_date && new Date(item.due_date) < new Date() && item.status !== 'done';
  const isReadonly = item.status === 'done' || item.status === 'archived' || item.archived;

  // Safely parse next_actions — jsonb can arrive as string, array of strings, or array of NextAction objects
  const nextActions: NextAction[] = (() => {
    let raw = item.next_actions;
    if (!raw) return [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { return []; }
    }
    if (!Array.isArray(raw)) return [];
    return raw.map((a: unknown) => {
      if (typeof a === 'string') return { text: a, done: false };
      if (a && typeof a === 'object' && 'text' in a) return a as NextAction;
      return null;
    }).filter((a): a is NextAction => a !== null);
  })();

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  // Click outside to save
  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        save();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  });

  const patch = async (updates: Partial<Item>) => {
    const { error } = await supabase.from('items').update(updates).eq('id', item.id);
    if (error) {
      console.error('Failed to update item:', error);
      alert(`Update failed: ${error.message}`);
      return;
    }
    onUpdate();
  };

  const save = () => {
    const updates: Partial<Item> = {};
    if (title.trim() !== item.title) updates.title = title.trim();
    if (content !== (item.content || '')) updates.content = content || undefined;
    if (type !== item.type) updates.type = type;
    if (status !== item.status) updates.status = status;
    if (dueDate !== (item.due_date || '')) updates.due_date = dueDate || undefined;
    if (area !== (item.area || '')) updates.area = area;

    if (Object.keys(updates).length > 0) patch(updates);
    setEditing(false);
  };

  const cancel = () => {
    setTitle(item.title);
    setContent(item.content || '');
    setType(item.type);
    setStatus(item.status);
    setDueDate(item.due_date || '');
    setArea(item.area || '');
    setEditing(false);
  };

  const toggleAction = async (index: number) => {
    const updated = [...nextActions];
    updated[index] = { ...updated[index], done: !updated[index].done };
    const { error } = await supabase.from('items').update({ next_actions: updated }).eq('id', item.id);
    if (error) {
      console.error('Failed to toggle action:', error);
      return;
    }
    onUpdate();
  };

  const markDone = () => patch({ status: 'done' });

  const trashItem = () => patch({ status: 'archived', archived: true });

  const restoreItem = () => patch({ status: 'inbox', archived: false });

  const acceptAiSuggestion = () => {
    const updates: Partial<Item> = {};
    if (item.ai_suggested_type) updates.type = item.ai_suggested_type;
    if (item.ai_suggested_status) updates.status = item.ai_suggested_status;
    patch(updates);
  };

  // Read-only card (logbook/trash)
  if (isReadonly) {
    return (
      <div className="item-card item-card-readonly" {...dragHandleProps}>
        <div className="item-card-top">
          <span className="item-title" style={{ textDecoration: item.status === 'done' ? 'line-through' : undefined, opacity: 0.6 }}>
            {item.title}
          </span>
          <span className="type-pill" style={{ background: typeColour.bg, color: typeColour.text }}>{item.type}</span>
          {item.archived && (
            <button className="item-action-btn" title="Restore" onClick={restoreItem}>↩</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className={`item-card ${editing ? 'item-card-editing' : ''}`} {...dragHandleProps}>
      {/* Top row: checkbox, title, type pill, focus star */}
      <div className="item-card-top">
        <button className="item-checkbox" onClick={markDone} title="Mark done" />

        {editing ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            className="item-title-input"
          />
        ) : (
          <span className="item-title" onClick={() => setEditing(true)}>
            {item.title}
          </span>
        )}

        <span className="type-pill" style={{ background: typeColour.bg, color: typeColour.text }}>{item.type}</span>

        <button
          className={`item-action-btn ${item.status === 'focus' ? 'item-action-active' : ''}`}
          title={item.status === 'focus' ? 'Remove from focus' : 'Add to focus'}
          onClick={() => patch({ status: item.status === 'focus' ? 'next' : 'focus' })}
        >
          ★
        </button>
      </div>

      {/* AI suggestion banner (inbox only) */}
      {isInbox && item.ai_suggested_type && (
        <div className="ai-suggestion">
          <span>AI suggests: <strong>{item.ai_suggested_type}</strong> → <strong>{item.ai_suggested_status}</strong></span>
          <button className="ai-accept-btn" onClick={acceptAiSuggestion}>Accept</button>
        </div>
      )}

      {/* Next actions */}
      {nextActions.length > 0 && (
        <ul className="next-actions-list">
          {nextActions.map((action: NextAction, i: number) => (
            <li key={i} className="next-action-item">
              <input
                type="checkbox"
                checked={action.done}
                onChange={() => toggleAction(i)}
                className="next-action-check"
              />
              <span className={`next-action-text ${action.done ? 'next-action-done' : ''}`}>
                {action.text}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Expanded edit fields */}
      {editing && (
        <div className="item-edit-fields">
          <div className="item-edit-row">
            <label className="item-edit-label">Notes</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add notes..."
              className="item-edit-textarea"
              rows={2}
            />
          </div>
          <div className="item-edit-row-inline">
            <div className="item-edit-field">
              <label className="item-edit-label">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as ItemType)} className="item-edit-select">
                {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="item-edit-field">
              <label className="item-edit-label">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)} className="item-edit-select">
                {ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="item-edit-field">
              <label className="item-edit-label">Due</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="item-edit-date" />
            </div>
            <div className="item-edit-field">
              <label className="item-edit-label">Area</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="item-edit-select">
                <option value="">—</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="item-edit-actions">
            <button onClick={cancel} className="item-edit-cancel">cancel</button>
            <button onClick={save} className="item-edit-save">save</button>
            <button onClick={() => { trashItem(); setEditing(false); }} className="item-edit-delete">trash</button>
            {onShowRelated && (
              <button onClick={() => onShowRelated(item.id)} className="item-edit-related">Related →</button>
            )}
          </div>
        </div>
      )}

      {/* Meta badges (when not editing) */}
      {!editing && (
        <div className="item-meta">
          {item.due_date && (
            <span className={`item-badge ${isOverdue ? 'item-badge-overdue' : 'item-badge-date'}`}>
              {isOverdue ? '⚠ ' : ''}Due: {item.due_date}
            </span>
          )}
          {item.area && areaColour && (
            <span className="item-badge" style={{ background: areaColour.bg, color: areaColour.text }}>{item.area}</span>
          )}
          {item.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="item-badge item-badge-tag">{tag}</span>
          ))}
          {item.source && item.source !== 'manual' && (
            <span className="item-badge">via {item.source}</span>
          )}
        </div>
      )}
    </div>
  );
}
