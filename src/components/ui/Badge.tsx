import React from 'react';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  /** Tailwind color classes — e.g. from STATUS_COLORS or PRIORITY_COLORS */
  colorClass?: string;
  size?: BadgeSize;
  className?: string;
  rounded?: 'full' | 'md';
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[9px]',
  md: 'px-2 py-0.5 text-[10px]',
  lg: 'px-2.5 py-1 text-xs',
};

/**
 * Badge — inline label with border, used for priority, status, release, comment counts.
 *
 * Usage:
 *   <Badge colorClass={PRIORITY_COLORS[item.priority]} size="sm">{item.priority}</Badge>
 *   <Badge colorClass={STATUS_COLORS[item.flow]} size="md">{item.flow}</Badge>
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  colorClass = '',
  size = 'md',
  className = '',
  rounded = 'full',
}) => (
  <span
    className={`inline-flex items-center font-bold border ${rounded === 'full' ? 'rounded-full' : 'rounded'} ${SIZE_CLASSES[size]} ${colorClass} ${className}`}
  >
    {children}
  </span>
);
