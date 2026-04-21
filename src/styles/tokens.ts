// ═══════════════════════════════════════════════════════════
// 🎨 Design Tokens — Single Source of Truth for UI consistency
// ═══════════════════════════════════════════════════════════

/** Border radius */
export const RADIUS = {
  card: 'rounded-2xl',       // Cards, panels, modals
  button: 'rounded-lg',      // Buttons, inputs, dropdowns
  badge: 'rounded-full',     // Badges, tags, pills
} as const;

/** Z-index layers */
export const Z = {
  dropdown: 'z-20',          // Dropdown menus, popovers
  modal: 'z-50',             // Modals, sheets, sidebars
  confirm: 'z-[60]',          // Confirmation dialogs (above modal)
  lightbox: 'z-[100]',       // Lightbox, image viewer
  search: 'z-[200]',         // Global search overlay (top layer)
  searchPanel: 'z-[201]',    // Global search panel (above overlay)
} as const;

/** Backdrop opacity */
export const BACKDROP = {
  light: 'bg-black/40',      // Dropdowns, popovers
  modal: 'bg-black/50',      // Modals, sidebars
  heavy: 'bg-black/60',      // Confirmations, critical modals
  lightbox: 'bg-black/90',   // Image/video lightbox
} as const;

/** Text hierarchy */
export const TEXT = {
  pageTitle: 'text-2xl md:text-3xl font-black text-gray-900 tracking-tight',
  sectionTitle: 'text-sm font-bold text-gray-900',
  cardLabel: 'text-[10px] font-bold text-gray-400 uppercase tracking-widest',
  body: 'text-sm text-gray-700',
  caption: 'text-[10px] text-gray-400',    // Metadata, timestamps, sub-labels
  micro: 'text-[9px] text-gray-400',       // Badge text, avatar initials labels
  badge: 'text-[10px] font-bold',
} as const;

/** Button sizes — use with RADIUS.button */
export const BTN = {
  sm: 'px-3 py-1.5 text-xs font-bold',
  md: 'px-4 py-2 text-sm font-bold',
  lg: 'px-6 py-2.5 text-sm font-bold',
} as const;

/** Spacing scale */
export const SPACE = {
  compact: 'space-y-2',     // Tight lists (todo items, badge rows)
  normal: 'space-y-4',      // Standard sections
  section: 'space-y-8',     // Major page sections
  gapCompact: 'gap-2',
  gapNormal: 'gap-4',
  gapSection: 'gap-8',
} as const;

/** Card container base styles */
export const CARD = {
  base: 'bg-white rounded-2xl shadow-sm border border-gray-100',
  header: 'flex items-center justify-between p-5 border-b border-gray-100',
  body: 'p-4',
} as const;

/** Badge padding — use with RADIUS.badge + TEXT.badge */
export const BADGE = {
  sm: 'px-1.5 py-0.5',     // Inline badges (priority, status)
  md: 'px-2 py-0.5',       // Standard badges
  lg: 'px-2.5 py-1',       // Prominent badges (modal)
} as const;

/** Icon sizes */
export const ICON = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;
