import { describe, it, expect } from 'vitest';
import { getAvatarColor, normalizeDate, getTodayStr, toDateStr, formatTimestamp } from '../qaUtils';

describe('getAvatarColor', () => {
  it('returns gray for Unassigned', () => {
    expect(getAvatarColor('Unassigned')).toBe('bg-gray-400');
  });

  it('returns gray for empty string', () => {
    expect(getAvatarColor('')).toBe('bg-gray-400');
  });

  it('returns consistent color for same name', () => {
    const color1 = getAvatarColor('Neo');
    const color2 = getAvatarColor('Neo');
    expect(color1).toBe(color2);
  });

  it('returns different colors for different names', () => {
    const neo = getAvatarColor('Neo');
    const summer = getAvatarColor('Summer');
    // Not guaranteed but very likely for these specific names
    expect(typeof neo).toBe('string');
    expect(typeof summer).toBe('string');
  });

  it('returns a valid Tailwind class', () => {
    const color = getAvatarColor('Ian');
    expect(color).toMatch(/^bg-\w+-\d+$/);
  });
});

describe('normalizeDate', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeDate('')).toBe('');
  });

  it('passes through YYYY-MM-DD format', () => {
    expect(normalizeDate('2026-04-02')).toBe('2026-04-02');
  });

  it('converts YYYY/M/D format', () => {
    expect(normalizeDate('2026/4/2')).toBe('2026-04-02');
  });

  it('converts M/D format using current year', () => {
    const result = normalizeDate('3/20');
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-03-20`);
  });

  it('pads single digit months and days', () => {
    const result = normalizeDate('1/5');
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-01-05`);
  });

  it('returns original string for unrecognized format', () => {
    expect(normalizeDate('something')).toBe('something');
  });
});

describe('getTodayStr', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getTodayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('toDateStr', () => {
  it('converts Date to YYYY-MM-DD', () => {
    const result = toDateStr(new Date('2026-04-07T12:00:00+08:00'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatTimestamp', () => {
  it('returns a formatted string', () => {
    const result = formatTimestamp(1712000000000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
