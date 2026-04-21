import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RoadmapItem, RoadmapTrack } from '../types';
import { ROADMAP_TRACKS, ROADMAP_TRACK_STYLES, ROADMAP_PRIORITY_STYLES, getUpcomingMonths, formatMonth } from '../constants/roadmapConstants';
import { RoadmapCard } from './RoadmapCard';

interface RoadmapTimelineProps {
  items: RoadmapItem[];
  canEdit: boolean;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (id: string) => void;
  onMonthChange: (id: string, targetMonth: string | null) => void;
  onReorder: (updates: { id: string; sortOrder: number; targetMonth?: string }[]) => void;
}

type Containers = Record<string, string[]>;

function cellKey(month: string | null, track: RoadmapTrack) { return `${month ?? 'none'}_${track}`; }
function parseKey(key: string) {
  const idx = key.lastIndexOf('_');
  const monthStr = key.substring(0, idx);
  return { month: monthStr === 'none' ? null : monthStr, track: key.substring(idx + 1) as RoadmapTrack };
}

function SortableCard({ id, disabled, children }: { id: string; disabled?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1, cursor: disabled ? 'default' : 'grab' }}>
      {children}
    </div>
  );
}

function DroppableCell({ id, className, children }: { id: string; className: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={`${className} transition-all ${isOver ? 'ring-2 ring-blue-400 bg-blue-50/40' : ''}`}>{children}</div>;
}

export const RoadmapTimeline: React.FC<RoadmapTimelineProps> = ({ items, canEdit, onEdit, onDelete, onMonthChange, onReorder }) => {
  const months = getUpcomingMonths();
  const activeItems = useMemo(() => items.filter(i => i.status !== 'cancelled'), [items]);
  const itemMap = useMemo(() => new Map(activeItems.map(i => [i.id, i])), [activeItems]);
  const [activeItem, setActiveItem] = useState<RoadmapItem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const columns: (string | null)[] = useMemo(() => [...months, null], [months]);

  const buildContainers = useCallback((): Containers => {
    const map: Containers = {};
    for (const col of columns) {
      for (const t of ROADMAP_TRACKS) {
        const k = cellKey(col, t.id);
        map[k] = activeItems
          .filter(i => i.track === t.id && (col ? i.targetMonth === col : !i.targetMonth))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(i => i.id);
      }
    }
    return map;
  }, [activeItems, columns]);

  const [containers, setContainers] = useState<Containers>(buildContainers);
  useEffect(() => { if (!activeItem) setContainers(buildContainers()); }, [buildContainers, activeItem]);

  const findContainer = useCallback((id: string): string | null => {
    if (containers[id] !== undefined) return id;
    for (const [key, ids] of Object.entries(containers)) {
      if (ids.includes(id)) return key;
    }
    return null;
  }, [containers]);

  const handleDragStart = (e: DragStartEvent) => { setActiveItem(itemMap.get(e.active.id as string) ?? null); };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const ac = findContainer(active.id as string);
    let oc = findContainer(over.id as string);
    if (!ac || !oc) return;
    if (oc === over.id) oc = over.id as string;
    if (ac === oc) return;
    const draggedItem = itemMap.get(active.id as string);
    if (!draggedItem) return;
    const { track: overTrack } = parseKey(oc);
    if (draggedItem.track !== overTrack) return;

    setContainers(prev => {
      const from = [...prev[ac]]; const to = [...prev[oc]];
      const fi = from.indexOf(active.id as string);
      if (fi === -1) return prev;
      from.splice(fi, 1);
      const oi = to.indexOf(over.id as string);
      to.splice(oi >= 0 ? oi : to.length, 0, active.id as string);
      return { ...prev, [ac]: from, [oc]: to };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;
    const ac = findContainer(active.id as string);
    let oc = findContainer(over.id as string);
    if (!ac || !oc) return;
    if (oc === over.id) oc = over.id as string;
    const draggedItem = itemMap.get(active.id as string);
    if (!draggedItem || draggedItem.isDerived || !canEdit) return;

    if (ac === oc) {
      const ids = containers[ac];
      const oi = ids.indexOf(active.id as string);
      const ni = ids.indexOf(over.id as string);
      if (oi === -1 || ni === -1 || oi === ni) return;
      const reordered = arrayMove(ids, oi, ni);
      setContainers(prev => ({ ...prev, [ac]: reordered }));
      onReorder(reordered.map((id, idx) => ({ id, sortOrder: idx })));
    } else {
      const { month, track } = parseKey(oc);
      if (draggedItem.track !== track) return;
      const newOrder = containers[oc];
      onReorder(newOrder.map((id, idx) => ({
        id, sortOrder: idx,
        ...(id === active.id ? { targetMonth: month ?? '' } : {}),
      })));
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${100 + columns.length * 160}px` }}>
          <div className="grid gap-2 md:gap-3 mb-3" style={{ gridTemplateColumns: `100px repeat(${columns.length}, 1fr)` }}>
            <div />
            {months.map(m => (
              <div key={m} className="rounded-xl bg-amber-500 text-white px-3 py-2.5 text-center">
                <p className="text-sm font-black">{formatMonth(m)}</p>
              </div>
            ))}
            <div className="rounded-xl bg-gray-400 text-white px-3 py-2.5 text-center">
              <p className="text-sm font-black">未排期</p>
            </div>
          </div>

          <div className="space-y-3">
            {ROADMAP_TRACKS.map(track => {
              const ts = ROADMAP_TRACK_STYLES[track.id];
              const isDerived = track.id === 'bug_fix';
              return (
                <div key={track.id} className="grid gap-3" style={{ gridTemplateColumns: `100px repeat(${columns.length}, 1fr)` }}>
                  <div className={`rounded-xl ${ts.header} flex items-center gap-2 px-4 py-3`}>
                    <span className="text-lg">{track.emoji}</span>
                    <span className="text-xs font-black">{track.label}</span>
                  </div>

                  {columns.map(col => {
                    const key = cellKey(col, track.id);
                    const ids = containers[key] ?? [];

                    if (isDerived) {
                      const derived = activeItems.filter(i => i.track === 'bug_fix' && (col ? i.targetMonth === col : !i.targetMonth));
                      return (
                        <div key={col ?? 'none'} className={`rounded-xl border-2 p-2.5 min-h-[100px] space-y-2 ${col === null ? 'border-gray-200 bg-gray-50/50' : `${ts.border} bg-gray-50/30`}`}>
                          {derived.length === 0
                            ? <div className="h-full flex items-center justify-center"><span className="text-[10px] text-gray-300">—</span></div>
                            : derived.map(item => <RoadmapCard key={item.id} item={item} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />)
                          }
                        </div>
                      );
                    }

                    return (
                      <DroppableCell key={col ?? 'none'} id={key} className={`rounded-xl border-2 p-2.5 min-h-[100px] space-y-2 ${col === null ? 'border-gray-200 bg-gray-50/50' : `${ts.border} bg-gray-50/30`}`}>
                        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                          {ids.length === 0
                            ? <div className="h-full flex items-center justify-center"><span className="text-[10px] text-gray-300">—</span></div>
                            : ids.map(id => {
                              const item = itemMap.get(id);
                              if (!item) return null;
                              return (
                                <SortableCard key={id} id={id} disabled={!!item.isDerived || !canEdit}>
                                  <RoadmapCard item={item} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
                                </SortableCard>
                              );
                            })
                          }
                        </SortableContext>
                      </DroppableCell>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-4 text-[11px] text-gray-500">
            <span className="font-bold">優先級：</span>
            {Object.entries(ROADMAP_PRIORITY_STYLES).map(([k, v]) => (
              <span key={k} className={`px-2 py-0.5 rounded-full font-bold ${v.bg} ${v.text}`}>{v.label}</span>
            ))}
          </div>
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
