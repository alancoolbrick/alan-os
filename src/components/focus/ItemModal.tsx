

import { useState } from 'react';
import { Item, ItemType, ItemStatus, ITEM_TYPES, ITEM_STATUSES, AREAS, TYPE_COLOURS } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface ItemModalProps {
  item?: Item;          // If provided, editing; if not, creating
  onSaved: () => void;
  onClose: () => void;
}

export default function ItemModal({ item, onSaved, onClose }: ItemModalProps) {
  const [title, setTitle] = useState(item?.title || '');
  const [content, setContent] = useState(item?.content || '');
  const [type, setType] = useState<ItemType>(item?.type || 'task');
  const [status, setStatus] = useState<ItemStatus>(item?.status || 'inbox');
  const [dueDate, setDueDate] = useState(item?.due_date || '');
  const [area, setArea] = useState(item?.area || '');
  const [saving, setSaving] = useState(false);

  const isEditing = !!item;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    if (isEditing) {
      await supabase.from('items').update({
        title: title.trim(),
        content: content || null,
        type,
        status,
        due_date: dueDate || null,
        area: area || null,
      }).eq('id', item.id);
    } else {
      await supabase.from('items').insert({
        title: title.trim(),
        content: content || null,
        type,
        status: 'inbox',
        due_date: dueDate || null,
        area: area || null,
        source: 'manual',
        next_actions: [],
        tags: [],
        metadata: {},
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Item' : 'New Item'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Type pills */}
        <div className="type-pills">
          {ITEM_TYPES.map((t) => {
            const col = TYPE_COLOURS[t];
            return (
              <button
                key={t}
                className={`type-pill-btn ${type === t ? 'type-pill-active' : ''}`}
                style={type === t ? { background: col.bg, color: col.text, borderColor: col.text } : {}}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            );
          })}
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (the goal)"
          className="modal-input"
          onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) handleSave(); }}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Notes (optional)"
          className="modal-textarea"
          rows={3}
        />

        <div className="modal-fields">
          {isEditing && (
            <div className="modal-field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)}>
                {ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="modal-field">
            <label>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Area</label>
            <select value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="">—</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="modal-cancel">Cancel</button>
          <button onClick={handleSave} className="modal-save" disabled={!title.trim() || saving}>
            {saving ? 'Saving...' : (isEditing ? 'Save' : 'Add to Inbox')}
          </button>
        </div>
      </div>
    </div>
  );
}
