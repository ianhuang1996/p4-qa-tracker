export type CosmeticType = 'background' | 'frame';

export interface CosmeticDef {
  id: string;
  type: CosmeticType;
  name: string;
  price: number;
  /** Tailwind class string applied to the pet card container (background) or emoji ring (frame). */
  className: string;
  /** Small color swatch for the shop preview. */
  swatch: string;
}

export const COSMETIC_DEFS: CosmeticDef[] = [
  // ── Backgrounds ─────────────────────────────────────────
  {
    id: 'bg_pink',
    type: 'background',
    name: '粉色棉花糖',
    price: 80,
    className: 'bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50',
    swatch: 'bg-gradient-to-br from-pink-200 to-rose-100',
  },
  {
    id: 'bg_sky',
    type: 'background',
    name: '天空藍',
    price: 150,
    className: 'bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-50',
    swatch: 'bg-gradient-to-br from-sky-200 to-cyan-100',
  },
  {
    id: 'bg_forest',
    type: 'background',
    name: '翠綠森林',
    price: 150,
    className: 'bg-gradient-to-br from-emerald-100 via-green-50 to-lime-50',
    swatch: 'bg-gradient-to-br from-emerald-200 to-lime-100',
  },
  {
    id: 'bg_sunset',
    type: 'background',
    name: '夕陽橘',
    price: 200,
    className: 'bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50',
    swatch: 'bg-gradient-to-br from-orange-200 to-yellow-100',
  },
  {
    id: 'bg_galaxy',
    type: 'background',
    name: '星河紫',
    price: 300,
    className: 'bg-gradient-to-br from-purple-200 via-fuchsia-100 to-indigo-100',
    swatch: 'bg-gradient-to-br from-purple-300 to-indigo-200',
  },

  // ── Frames ──────────────────────────────────────────────
  {
    id: 'frame_bronze',
    type: 'frame',
    name: '銅色外框',
    price: 50,
    className: 'ring-4 ring-amber-700/60',
    swatch: 'bg-amber-700',
  },
  {
    id: 'frame_silver',
    type: 'frame',
    name: '銀色外框',
    price: 120,
    className: 'ring-4 ring-gray-400',
    swatch: 'bg-gray-400',
  },
  {
    id: 'frame_gold',
    type: 'frame',
    name: '金色外框',
    price: 250,
    className: 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-200',
    swatch: 'bg-yellow-400',
  },
  {
    id: 'frame_rainbow',
    type: 'frame',
    name: '彩虹外框',
    price: 400,
    className: 'ring-4 ring-transparent [background-image:linear-gradient(white,white),linear-gradient(90deg,#f87171,#facc15,#4ade80,#60a5fa,#a78bfa)] [background-origin:border-box] [background-clip:padding-box,border-box]',
    swatch: 'bg-gradient-to-r from-red-400 via-yellow-300 to-purple-400',
  },
];

export function getCosmetic(id: string): CosmeticDef | undefined {
  return COSMETIC_DEFS.find(c => c.id === id);
}

export const COSMETICS_BY_TYPE: Record<CosmeticType, CosmeticDef[]> = {
  background: COSMETIC_DEFS.filter(c => c.type === 'background'),
  frame:      COSMETIC_DEFS.filter(c => c.type === 'frame'),
};
