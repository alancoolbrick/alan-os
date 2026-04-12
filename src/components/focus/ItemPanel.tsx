

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Item, SidebarKey, ItemStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import ItemCard from './ItemCard';

interface ItemPanelProps {
  items: Item[];
  view: SidebarKey;
  search: string;
  doerFilter: 'all' | 'human' | 'ai';
  onUpdate: () => void;
  onShowRelated?: (itemId: string) => void;
}

const STATUS_VIEWS: Record<string, (item: Item) => boolean> = {
  inbox:     (i) => i.status === 'inbox' && !i.archived,
  focus:     (i) => i.status === 'focus' && !i.archived,
  next:      (i) => i.status === 'next' && !i.archived,
  waiting:   (i) => i.status === 'waiting' && !i.archived,
  scheduled: (i) => i.status === 'scheduled' && !i.archived,
  someday:   (i) => i.status === 'someday' && !i.archived,
  reference: (i) => i.status === 'reference' && !i.archived,
  logbook:   (i) => i.status === 'done',
};

const SPECIAL_VIEWS: Record<string, (item: Item) => boolean> = {
  projects: (i) => i.type === 'project' && !i.archived && i.status !== 'done',
};

function getViewTitle(view: SidebarKey): string {
  switch (view) {
    case 'inbox': return 'Inbox';
    case 'focus': return "Today's Focus";
    case 'next': return 'Next Actions';
    case 'waiting': return 'Waiting';
    case 'scheduled': return 'Scheduled';
    case 'someday': return 'Someday / Maybe';
    case 'projects': return 'Projects';
    case 'reference': return 'Reference';
    case 'logbook': return 'Logbook';
    default:
      if (typeof view === 'string' && view.startsWith('tag:')) return `Tag: ${view.slice(4)}`;
      return '';
  }
}

function getEmptyMessage(view: SidebarKey): string {
  switch (view) {
    case 'inbox': return 'Inbox clear. Nice.';
    case 'focus': return 'Nothing in focus. Star items to add them here.';
    case 'waiting': return 'Not waiting on anything.';
    case 'scheduled': return 'Nothing scheduled.';
    case 'reference': return 'Nothing in reference.';
    case 'logbook': return 'No completed items yet.';
    default: return 'Nothing here.';
  }
}

// Status drop targets shown while dragging
const DROP_STATUSES: { key: ItemStatus; label: string; icon: string }[] = [
  { key: 'inbox', label: 'Inbox', icon: '📥' },
  { key: 'focus', label: 'Focus', icon: '⭐' },
  { key: 'next', label: 'Next', icon: '▶' },
  { key: 'waiting', label: 'Waiting', icon: '⏳' },
  { key: 'scheduled', label: 'Scheduled', icon: '📅' },
  { key: 'someday', label: 'Someday', icon: '💭' },
  { key: 'done', label: 'Done', icon: '✓' },
];

function StatusDropZone({ status, label, icon, isOver, currentStatus }: {
  status: ItemStatus; label: string; icon: string; isOver: boolean; currentStatus: string;
}) {
  const { setNodeRef } = useDroppable({ id: `status-drop-${status}` });
  const isCurrent = status === currentStatus;

  return (
    <div
      ref={setNodeRef}
      className={`status-drop-zone ${isOver ? 'status-drop-over' : ''} ${isCurrent ? 'status-drop-current' : ''}`}
    >
      <span className="status-drop-icon">{icon}</span>
      <span className="status-drop-label">{label}</span>
    </div>
  );
}

// Sortable wrapper for each item card
function SortableItemCard({ item, onUpdate, isInbox, onShowRelated }: { item: Item; onUpdate: () => void; isInbox: boolean; onShowRelated?: (itemId: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ItemCard item={item} onUpdate={onUpdate} isInbox={isInbox} onShowRelated={onShowRelated} />
    </div>
  );
}

export default function ItemPanel({ items, view, search, doerFilter, onUpdate, onShowRelated }: ItemPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overDropZone, setOverDropZone] = useState<string | null>(null);
  const q = search.toLowerCase().trim();

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const filtered = items.filter((item) => {
    const statusFilter = STATUS_VIEWS[view as string];
    const specialFilter = SPECIAL_VIEWS[view as string];
    if (statusFilter) {
      if (!statusFilter(item)) return false;
    } else if (specialFilter) {
      if (!specialFilter(item)) return false;
    } else if (typeof view === 'string' && view.startsWith('tag:')) {
      const tag = view.slice(4);
      if (!item.tags?.includes(tag)) return false;
      if (item.status === 'done' || item.archived) return false;
    } else {
      return false;
    }

    if (doerFilter !== 'all') {
      if (doerFilter === 'human') {
        if (item.doer !== 'human' && item.doer !== null) return false;
      } else {
        if (item.doer !== doerFilter) return false;
      }
    }

    if (q) {
      return (
        item.title.toLowerCase().includes(q) ||
        (item.content || '').toLowerCase().includes(q) ||
        item.next_actions.some(a => a.text.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => a.position - b.position);
  const isInbox = view === 'inbox';
  const activeItem = activeId ? sorted.find(i => i.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setOverDropZone(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string | undefined;
    if (overId?.startsWith('status-drop-')) {
      setOverDropZone(overId);
    } else {
      setOverDropZone(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedId = activeId;
    setActiveId(null);
    setOverDropZone(null);
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;

    // Dropped on a status zone → change status
    if (overId.startsWith('status-drop-')) {
      const newStatus = overId.replace('status-drop-', '') as ItemStatus;
      const item = items.find(i => i.id === active.id);
      if (!item || item.status === newStatus) return;

      const update: Record<string, unknown> = { status: newStatus, position: 0 };
      if (newStatus === 'done') update.archived = false;
      if (newStatus === 'archived') { update.archived = true; update.status = item.status; }

      await supabase.from('items').update(update).eq('id', active.id);
      onUpdate();
      return;
    }

    // Dropped on another item → reorder within same list
    if (active.id === over.id) return;
    const oldIndex = sorted.findIndex(i => i.id === active.id);
    const newIndex = sorted.findIndex(i => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    let newPosition: number;
    if (newIndex === 0) {
      newPosition = sorted[0].position - 1000;
    } else if (newIndex === sorted.length - 1) {
      newPosition = sorted[sorted.length - 1].position + 1000;
    } else {
      const before = sorted[newIndex - (newIndex > oldIndex ? 0 : 1)];
      const after = sorted[newIndex + (newIndex > oldIndex ? 1 : 0)];
      if (before && after) {
        newPosition = Math.floor((before.position + after.position) / 2);
      } else {
        newPosition = newIndex * 1000;
      }
    }

    await supabase
      .from('items')
      .update({ position: newPosition })
      .eq('id', active.id);

    onUpdate();
  };

  const activeItemStatus = activeItem?.status || '';

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">{getViewTitle(view)}</h2>
        <span className="panel-count">{sorted.length}</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {activeId && (
          <div className="status-drop-bar">
            {DROP_STATUSES.map(({ key, label, icon }) => (
              <StatusDropZone
                key={key}
                status={key}
                label={label}
                icon={icon}
                isOver={overDropZone === `status-drop-${key}`}
                currentStatus={activeItemStatus}
              />
            ))}
          </div>
        )}

        {sorted.length === 0 && !activeId ? (
          <div className="panel-empty">{getEmptyMessage(view)}</div>
        ) : (
          <SortableContext items={sorted.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="item-list">
              {sorted.map((item) => (
                <SortableItemCard
                  key={item.id}
                  item={item}
                  onUpdate={onUpdate}
                  isInbox={isInbox}
                  onShowRelated={onShowRelated}
                />
              ))}
            </div>
          </SortableContext>
        )}

        <DragOverlay>
          {activeItem && (
            <div className="drag-overlay">
              <ItemCard item={activeItem} onUpdate={() => {}} isInbox={isInbox} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
