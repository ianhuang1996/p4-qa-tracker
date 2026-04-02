import React from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Image as ImageIcon, Video, MessageSquare, FileText, Rocket } from 'lucide-react';
import { AugmentedQAItem } from '../types';
import { QA_FLOWS, PRIORITY_COLORS, STATUS_COLORS } from '../constants';
import { getDirectImageUrl, getAvatarColor } from '../utils/qaUtils';
import { EmptyState } from './EmptyState';

interface KanbanCardProps {
  item: AugmentedQAItem;
  onClick: () => void;
  onStatusChange: (item: AugmentedQAItem, newStatus: string) => void;
}

const KanbanCard = React.memo(({ item, onClick, onStatusChange }: KanbanCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id, data: { type: 'item', item } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all group relative ${
        item.priority === 'P0' ? 'ring-2 ring-red-200 border-red-100 bg-red-50/30' : ''
      }`}
    >
      {item.priority === 'P0' && (
        <div className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
      )}
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.id}</span>
        {item.priority !== '-' && (
          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_COLORS[item.priority]}`}>
            {item.priority}
          </span>
        )}
      </div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
        {item.displayTitle}
      </h4>
      
      {item.isNextRelease && (
        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100 w-fit mb-2" title="排入下次發布">
          <Rocket size={10} />
          Next Release
        </div>
      )}

      {item.imageLink && (
        <div className="mt-2 mb-3 rounded-md overflow-hidden h-24 border border-gray-100 bg-gray-50">
          <img 
            src={getDirectImageUrl(item.imageLink)} 
            alt="Thumbnail" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${
            getAvatarColor(item.assignee)
          }`}>
            {item.assignee.charAt(0)}
          </div>
          <span className="text-[10px] text-gray-500 font-medium">{item.assignee}</span>
        </div>

        <div className="flex items-center gap-2">
          {item.commentCount && item.commentCount > 0 ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              <MessageSquare size={10} />
              {item.commentCount}
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            {item.imageLink && <ImageIcon size={10} className="text-blue-400" />}
            {item.videoLink && <Video size={10} className="text-purple-400" />}
            {item.attachmentUrl && <FileText size={10} className="text-orange-400" />}
          </div>
        </div>
      </div>
    </div>
  );
});

interface KanbanColumnProps {
  status: string;
  items: AugmentedQAItem[];
  onItemClick: (item: AugmentedQAItem) => void;
  onStatusChange: (item: AugmentedQAItem, newStatus: string) => void;
}

const KanbanColumn = React.memo(({ status, items, onItemClick, onStatusChange }: KanbanColumnProps) => {
  const { setNodeRef } = useSortable({ id: status, data: { type: 'column', status } });

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-xl border border-gray-200 flex flex-col snap-start">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl sticky top-0 z-10">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`}></span>
          {status}
        </h3>
        <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
          {items.length}
        </span>
      </div>
      <div 
        ref={setNodeRef}
        className="p-3 space-y-3 overflow-y-auto flex-1 max-h-[calc(100vh-350px)] min-h-[150px]"
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <KanbanCard key={item.id} item={item} onClick={() => onItemClick(item)} onStatusChange={onStatusChange} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <EmptyState compact title="目前沒有項目" />
        )}
      </div>
    </div>
  );
});

interface QAItemKanbanProps {
  items: AugmentedQAItem[];
  onItemClick: (item: AugmentedQAItem) => void;
  onStatusChange: (item: AugmentedQAItem, newStatus: string) => void;
}

export const QAItemKanban: React.FC<QAItemKanbanProps> = ({ items, onItemClick, onStatusChange }) => {
  const [activeItem, setActiveItem] = React.useState<AugmentedQAItem | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const item = items.find(i => i.id === active.id);
    if (item) setActiveItem(item);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeItem = items.find(i => i.id === activeId);
    if (!activeItem) return;

    // Check if dragging over a column or an item in a column
    let overStatus = over.data.current?.status;
    if (!overStatus && over.data.current?.item) {
      overStatus = over.data.current.item.currentFlow || '待處理';
    }

    if (overStatus && activeItem.currentFlow !== overStatus) {
      onStatusChange(activeItem, overStatus);
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveItem(null);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px] snap-x custom-scrollbar">
        {QA_FLOWS.map(status => (
          <KanbanColumn 
            key={status} 
            status={status} 
            items={items.filter(i => (i.currentFlow || '待處理') === status)} 
            onItemClick={onItemClick}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeItem ? (
          <div className="bg-white p-4 rounded-lg shadow-xl border border-blue-200 cursor-grabbing w-80 ring-2 ring-blue-400">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{activeItem.id}</span>
              {activeItem.priority !== '-' && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${PRIORITY_COLORS[activeItem.priority]}`}>
                  {activeItem.priority}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
              {activeItem.displayTitle}
            </h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
