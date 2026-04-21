import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RoadmapItem, RoadmapTrack, RoadmapStatus, QAItem } from '../types';
import { ROADMAP_TRACKS, ROADMAP_BOARD_STATUSES, ROADMAP_TRACK_STYLES, ROADMAP_STATUS_HEADER } from '../constants/roadmapConstants';
import { RoadmapCard } from './RoadmapCard';

interface RoadmapBoardProps {
  items: RoadmapItem[];
  derivedBugFixItems: RoadmapItem[];
  allQAItems: QAItem[];
  canEdit: boolean;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => void;
  onAdd: (status: RoadmapStatus, track: RoadmapTrack) => void;
  onStatusChange: (id: string, status: RoadmapStatus) => void;
  onReorder: (updates: { id: string; sortOrder: number; status?: RoadmapStatus }[]) => void;
  onNavigateToRelease: () => void;
  onNavigateToQAItem: (qaId: string) => void;
}

type Containers = Record<string, string[]>; // cellKey → itemIds

function cellKey(status: RoadmapStatus, track: RoadmapTrack) { return `${status}_${track}`; }
function parseKey(key: string) {
  const [status, track] = key.split('_') as [RoadmapStatus, RoadmapTrack];
  return { status, track };
}

// ── Sortable card ───────────────────────────────────────────────
function SortableCard({ id, disabled, children }: { id: string; disabled?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        cursor: disabled ? 'default' : 'grab',
      }}
    >
      {children}
    </div>
  );
}

// ── Droppable cell (for drops on empty areas) ───────────────────
function DroppableCell({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} transition-all ${isOver ? 'ring-2 ring-blue-400 bg-blue-50/40' : ''}`}>
      {children}
    </div>
  );
}

export const RoadmapBoard: React.FC<RoadmapBoardProps> = ({
  items, derivedBugFixItems, allQAItems, canEdit,
  onEdit, onDelete, onAdd, onStatusChange, onReorder, onNavigateToRelease, onNavigateToQAItem,
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeItem, setActiveItem] = useState<RoadmapItem | null>(null);
  const allItems = useMemo(() => [...items, ...derivedBugFixItems], [items, derivedBugFixItems]);
  const itemMap = useMemo(() => new Map(allItems.map(i => [i.id, i])), [allItems]);

  // Build containers: cellKey → sorted item IDs (feature + backend only, not bug_fix)
  const buildContainers = useCallback((): Containers => {
    const map: Containers = {};
    for (const s of ROADMAP_BOARD_STATUSES) {
      for (const t of ROADMAP_TRACKS) {
        if (t.id === 'bug_fix') continue;
        const k = cellKey(s.id, t.id);
        map[k] = items
          .filter(i => i.track === t.id && i.status === s.id)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(i => i.id);
      }
    }
    return map;
  }, [items]);

  const [containers, setContainers] = useState<Containers>(buildContainers);

  // Sync from props (outside of drag)
  useEffect(() => {
    if (!activeItem) setContainers(buildContainers());
  }, [buildContainers, activeItem]);

  const findContainer = useCallback((id: string): string | null => {
    if (containers[id] !== undefined) return id; // it's a cell key itself
    for (const [key, ids] of Object.entries(containers)) {
      if (ids.includes(id)) return key;
    }
    return null;
  }, [containers]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(itemMap.get(event.active.id as string) ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(active.id as string);
    let overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer) return;
    // If over is a cell, overContainer is itself
    if (overContainer === over.id) overContainer = over.id as string;
    if (activeContainer === overContainer) return;

    // Enforce same track
    const draggedItem = itemMap.get(active.id as string);
    if (!draggedItem) return;
    const { track: overTrack } = parseKey(overContainer);
    if (draggedItem.track !== overTrack) return;

    setContainers(prev => {
      const from = [...prev[activeContainer]];
      const to = [...prev[overContainer]];
      const fromIdx = from.indexOf(active.id as string);
      if (fromIdx === -1) return prev;
      from.splice(fromIdx, 1);
      const overIdx = to.indexOf(over.id as string);
      to.splice(overIdx >= 0 ? overIdx : to.length, 0, active.id as string);
      return { ...prev, [activeContainer]: from, [overContainer]: to };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    let overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer) return;
    if (overContainer === over.id) overContainer = over.id as string;

    const draggedItem = itemMap.get(active.id as string);
    if (!draggedItem || draggedItem.isDerived) return;

    if (activeContainer === overContainer) {
      // Reorder within same cell
      const ids = containers[activeContainer];
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(ids, oldIdx, newIdx);
      setContainers(prev => ({ ...prev, [activeContainer]: reordered }));
      onReorder(reordered.map((id, idx) => ({ id, sortOrder: idx })));
    } else {
      // Cross-cell: update status + sort order
      const { status: newStatus, track: overTrack } = parseKey(overContainer);
      if (draggedItem.track !== overTrack) return;
      const newOrder = containers[overContainer];
      onReorder(newOrder.map((id, idx) => ({
        id,
        sortOrder: idx,
        ...(id === active.id ? { status: newStatus } : {}),
      })));
    }
  };

  const getLinkedQAItems = (item: RoadmapItem) =>
    (item.linkedQAItemIds ?? []).map(id => allQAItems.find(q => q.id === id)).filter(Boolean) as QAItem[];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Column headers */}
          <div className="grid grid-cols-[160px_1fr_1fr_1fr] gap-3 mb-3">
            <div />
            {ROADMAP_BOARD_STATUSES.map(s => (
              <div key={s.id} className={`rounded-xl px-4 py-2.5 text-center ${ROADMAP_STATUS_HEADER[s.id]}`}>
                <p className="text-sm font-black">{s.label}</p>
                <p className="text-[10px] opacity-80">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Swimlane rows */}
          <div className="space-y-3">
            {ROADMAP_TRACKS.map(track => {
              const ts = ROADMAP_TRACK_STYLES[track.id];
              const isDerivedTrack = track.id === 'bug_fix';

              return (
                <div key={track.id} className="grid grid-cols-[160px_1fr_1fr_1fr] gap-3">
                  <div className={`rounded-xl ${ts.header} flex flex-col items-start justify-center px-4 py-3 gap-0.5`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{track.emoji}</span>
                      <span className="text-xs font-black">{track.label}</span>
                    </div>
                    {isDerivedTrack && <span className="text-[9px] opacity-60 ml-0.5">由版更自動同步</span>}
                  </div>

                  {ROADMAP_BOARD_STATUSES.map(status => {
                    if (isDerivedTrack) {
                      // Bug fix: derived, no sorting
                      const derived = derivedBugFixItems.filter(i => i.status === status.id);
                      return (
                        <div key={status.id} className={`rounded-xl border-2 ${ts.border} bg-gray-50/50 p-2.5 min-h-[120px] space-y-2`}>
                          {derived.map(item => (
                            <RoadmapCard
                              key={item.id} item={item} canEdit={canEdit}
                              onEdit={onEdit} onDelete={onDelete}
                              onNavigateToRelease={onNavigateToRelease}
                            />
                          ))}
                        </div>
                      );
                    }

                    // Feature / Backend: sortable
                    const key = cellKey(status.id, track.id);
                    const ids = containers[key] ?? [];
                    return (
                      <DroppableCell key={status.id} id={key} className={`rounded-xl border-2 ${ts.border} bg-gray-50/50 p-2.5 min-h-[120px] space-y-2`}>
                        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                          {ids.map(id => {
                            const item = itemMap.get(id);
                            if (!item) return null;
                            return (
                              <SortableCard key={id} id={id} disabled={!canEdit}>
                                <RoadmapCard
                                  item={item} canEdit={canEdit}
                                  onEdit={onEdit} onDelete={onDelete}
                                  onNavigateToQAItem={onNavigateToQAItem}
                                  linkedQAItems={track.id === 'backend' ? getLinkedQAItems(item) : undefined}
                                />
                              </SortableCard>
                            );
                          })}
                        </SortableContext>
                        {canEdit && (
                          <button
                            onClick={() => onAdd(status.id, track.id)}
                            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-dashed border-gray-200 hover:border-blue-300"
                          >
                            <Plus size={12} /> 新增
                          </button>
                        )}
                      </DroppableCell>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Completed */}
          <CompletedSection
            items={[...items.filter(i => i.status === 'completed'), ...derivedBugFixItems.filter(i => i.status === 'completed')]}
            allQAItems={allQAItems} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete}
            onNavigateToRelease={onNavigateToRelease} onNavigateToQAItem={onNavigateToQAItem}
          />
        </div>
      </div>

      <DragOverlay>
        {activeItem && (
          <div className="opacity-90 shadow-xl rotate-2 scale-105">
            <RoadmapCard item={activeItem} canEdit={false} onEdit={() => {}} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

const CompletedSection: React.FC<{
  items: RoadmapItem[]; allQAItems: QAItem[]; canEdit: boolean;
  onEdit: (item: RoadmapItem) => void; onDelete: (id: string) => void;
  onNavigateToRelease: () => void; onNavigateToQAItem: (qaId: string) => void;
}> = ({ items, allQAItems, canEdit, onEdit, onDelete, onNavigateToRelease, onNavigateToQAItem }) => {
  const [open, setOpen] = React.useState(false);
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
        <span className={`transition-transform inline-block ${open ? 'rotate-90' : ''}`}>▶</span>
        已完成 ({items.length})
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(item => (
            <div key={item.id} className="opacity-60">
              <RoadmapCard item={item} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete}
                onNavigateToRelease={item.isDerived ? onNavigateToRelease : undefined}
                onNavigateToQAItem={onNavigateToQAItem}
                linkedQAItems={item.track === 'backend' ? (item.linkedQAItemIds ?? []).map(id => allQAItems.find(q => q.id === id)).filter(Boolean) as QAItem[] : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
