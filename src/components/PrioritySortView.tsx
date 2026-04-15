import React, { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { AugmentedQAItem } from '../types';
import { PRIORITY_COLORS, PRIORITY_ORDER, BTN, STATUS, isActive } from '../constants';
import { getAvatarColor } from '../utils/qaUtils';

interface PrioritySortViewProps {
  items: AugmentedQAItem[];
  onSave: (updates: { id: string; sortOrder: number }[]) => void;
  onClose: () => void;
}

// ─── Sortable Item ─────────────────────────────────────────────
const SortableItem: React.FC<{ item: AugmentedQAItem; index: number }> = ({ item, index }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 bg-white border rounded-xl transition-shadow ${
        isDragging ? 'shadow-lg border-blue-300 z-10 relative' : 'border-gray-200'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0"
        aria-label="拖拉排序"
      >
        <GripVertical size={16} />
      </button>

      <span className="text-xs font-black text-blue-600 w-8 text-center shrink-0">
        #{index + 1}
      </span>

      <span className="text-xs font-bold text-gray-400 w-10 shrink-0">{item.id}</span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.displayTitle}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold ${getAvatarColor(item.assignee)}`}>
          {item.assignee.charAt(0)}
        </div>
        <span className="text-xs text-gray-500">{item.assignee}</span>
      </div>

      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${
        item.currentFlow === STATUS.pending    ? 'bg-slate-100 text-slate-600 border-slate-200' :
        item.currentFlow === STATUS.inProgress ? 'bg-blue-100 text-blue-600 border-blue-200' :
        'bg-gray-100 text-gray-600 border-gray-200'
      }`}>
        {item.currentFlow}
      </span>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────
export const PrioritySortView: React.FC<PrioritySortViewProps> = ({ items, onSave, onClose }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Group items by priority, only active items (not closed/fixed)
  const activeItems = useMemo(() => {
    return items.filter(i => isActive(i.currentFlow));
  }, [items]);

  const priorities = useMemo(() => {
    const groups: Record<string, AugmentedQAItem[]> = {};
    activeItems.forEach(item => {
      const p = item.priority || '-';
      if (!groups[p]) groups[p] = [];
      groups[p].push(item);
    });
    // Sort within each group by existing sortOrder
    Object.values(groups).forEach(group => {
      group.sort((a, b) => (a.sortOrder ?? 99999) - (b.sortOrder ?? 99999));
    });
    return Object.entries(groups).sort(([a], [b]) => (PRIORITY_ORDER[a] ?? 99) - (PRIORITY_ORDER[b] ?? 99));
  }, [activeItems]);

  // Local state for each priority group
  const [groupOrders, setGroupOrders] = useState<Record<string, string[]>>(() => {
    const orders: Record<string, string[]> = {};
    priorities.forEach(([p, group]) => {
      orders[p] = group.map(i => i.id);
    });
    return orders;
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleDragEnd = (priority: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setGroupOrders(prev => {
      const oldIds = prev[priority];
      const oldIndex = oldIds.indexOf(active.id as string);
      const newIndex = oldIds.indexOf(over.id as string);
      return { ...prev, [priority]: arrayMove(oldIds, oldIndex, newIndex) };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    const updates: { id: string; sortOrder: number }[] = [];
    Object.values(groupOrders).forEach(ids => {
      ids.forEach((id, index) => {
        updates.push({ id, sortOrder: index });
      });
    });
    onSave(updates);
  };

  const getItemById = (id: string) => activeItems.find(i => i.id === id);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 md:p-8">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black text-gray-900">排序管理</h2>
            <p className="text-xs text-gray-500 mt-1">拖拉調整每個優先級內的修復順序</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleSave}
                className={BTN.primary}
              >
                儲存排序
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="關閉"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Priority groups */}
        <div className="p-6 space-y-8">
          {priorities.map(([priority]) => {
            const ids = groupOrders[priority] || [];
            if (ids.length === 0) return null;

            return (
              <div key={priority}>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {priority === '-' ? '無優先級' : priority}
                  </span>
                  <span className="text-xs text-gray-400">{ids.length} 個項目</span>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd(priority)}
                >
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {ids.map((id, index) => {
                        const item = getItemById(id);
                        if (!item) return null;
                        return <SortableItem key={id} item={item} index={index} />;
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
