import React, { useState, useMemo } from 'react';
import { Plus, LayoutGrid, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { RoadmapItem, RoadmapStatus, RoadmapTrack } from '../types';
import { useRoadmap, deriveBugFixItems } from '../hooks/useRoadmap';
import { useReleases } from '../hooks/useReleases';
import { useAugmentedQAItems } from '../hooks/useAugmentedQAItems';
import { useAppContext } from '../contexts/AppContext';
import { ADMIN_EMAILS } from '../constants';
import { ROADMAP_TRACKS } from '../constants/roadmapConstants';
import { RoadmapBoard } from './RoadmapBoard';
import { RoadmapTimeline } from './RoadmapTimeline';
import { RoadmapItemModal } from './RoadmapItemModal';
import { ConfirmDialog } from './ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';

type RoadmapView = 'board' | 'timeline';

export const RoadmapPage: React.FC = () => {
  const { user, isAuthReady, setCurrentPage, navigateToQAItem } = useAppContext();
  const { items, isLoading, addItem, updateItem, deleteItem } = useRoadmap(user);
  const { releases } = useReleases(user);
  const { data: qaItems } = useAugmentedQAItems(user, isAuthReady);

  const canEdit = !!(user?.email && ADMIN_EMAILS.includes(user.email));
  const { confirm, dialogProps } = useConfirm();

  const [view, setView] = useState<RoadmapView>('board');
  const [trackFilter, setTrackFilter] = useState<RoadmapTrack | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<RoadmapStatus>('next');
  const [defaultTrack, setDefaultTrack] = useState<RoadmapTrack>('feature');

  // Derived bug fix items from releases
  const derivedBugFixItems = useMemo(
    () => deriveBugFixItems(releases, qaItems),
    [releases, qaItems]
  );

  // QA items with module='後台' for backend linking
  const backendQAItems = useMemo(
    () => qaItems.filter(q => q.module === '後台'),
    [qaItems]
  );

  // Apply track filter (bug_fix filter applies to derived items too)
  const filteredItems = useMemo(() =>
    trackFilter === 'all' ? items : items.filter(i => i.track === trackFilter),
    [items, trackFilter]
  );
  const filteredDerived = useMemo(() =>
    trackFilter === 'all' || trackFilter === 'bug_fix' ? derivedBugFixItems : [],
    [derivedBugFixItems, trackFilter]
  );

  const openAddModal = (status: RoadmapStatus = 'next', track: RoadmapTrack = 'feature') => {
    setEditingItem(null);
    setDefaultStatus(status);
    setDefaultTrack(track);
    setModalOpen(true);
  };

  const openEditModal = (item: RoadmapItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (data: Omit<RoadmapItem, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => {
    if (editingItem) {
      await updateItem(editingItem.id, data);
      toast.success('已更新');
    } else {
      await addItem(data);
    }
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm('確定要刪除這個項目嗎？', { title: '刪除確認', confirmLabel: '刪除' });
    if (!ok) return;
    await deleteItem(id);
  };

  const handleStatusChange = (id: string, status: RoadmapStatus) => {
    updateItem(id, { status });
  };

  const handleMonthChange = (id: string, targetMonth: string | null) => {
    updateItem(id, { targetMonth: targetMonth ?? '' });
  };

  const handleReorder = (updates: { id: string; sortOrder: number; status?: RoadmapStatus; targetMonth?: string }[]) => {
    for (const u of updates) {
      const { id, ...fields } = u;
      updateItem(id, fields);
    }
  };

  const stats = useMemo(() => {
    const all = [...items, ...derivedBugFixItems];
    const active = all.filter(i => i.status !== 'completed' && i.status !== 'cancelled');
    return {
      now:   active.filter(i => i.status === 'now').length,
      next:  active.filter(i => i.status === 'next').length,
      later: active.filter(i => i.status === 'later').length,
      done:  all.filter(i => i.status === 'completed').length,
    };
  }, [items, derivedBugFixItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {canEdit && (
          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors"
          >
            <Plus size={18} /> 新增項目
          </button>
        )}

        {/* View toggle */}
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <button
            onClick={() => setView('board')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-colors ${
              view === 'board' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid size={16} /> 看板
          </button>
          <button
            onClick={() => setView('timeline')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-colors ${
              view === 'timeline' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CalendarRange size={16} /> 時間軸
          </button>
        </div>

        {/* Track filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTrackFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              trackFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            全部
          </button>
          {ROADMAP_TRACKS.map(t => (
            <button
              key={t.id}
              onClick={() => setTrackFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                trackFilter === t.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {[
          { label: 'Now',   value: stats.now,   color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Next',  value: stats.next,  color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Later', value: stats.later, color: 'text-slate-600 bg-slate-50 border-slate-200' },
          { label: '已完成', value: stats.done, color: 'text-green-700 bg-green-50 border-green-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">{s.label}</p>
            <p className="text-2xl font-black">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      {view === 'board' ? (
        <RoadmapBoard
          items={filteredItems}
          derivedBugFixItems={filteredDerived}
          allQAItems={qaItems}
          canEdit={canEdit}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onAdd={openAddModal}
          onStatusChange={handleStatusChange}
          onReorder={handleReorder}
          onNavigateToRelease={() => setCurrentPage('release')}
          onNavigateToQAItem={navigateToQAItem}
        />
      ) : (
        <RoadmapTimeline
          items={[...filteredItems, ...filteredDerived]}
          canEdit={canEdit}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onMonthChange={handleMonthChange}
          onReorder={handleReorder}
        />
      )}

      {/* Modal */}
      <ConfirmDialog {...dialogProps} />

      {modalOpen && (
        <RoadmapItemModal
          item={editingItem}
          defaultStatus={defaultStatus}
          defaultTrack={defaultTrack}
          releases={releases}
          backendQAItems={backendQAItems}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingItem(null); }}
        />
      )}
    </>
  );
};
