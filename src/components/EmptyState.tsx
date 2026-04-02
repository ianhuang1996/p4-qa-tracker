import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, compact }) => {
  if (compact) {
    return (
      <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50/50">
        {icon || <Inbox size={24} className="opacity-30" />}
        <span className="text-xs font-bold">{title}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-gray-400 gap-3 py-12">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
        {icon || <Inbox size={32} className="text-gray-300" />}
      </div>
      <p className="text-sm font-bold text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
};
