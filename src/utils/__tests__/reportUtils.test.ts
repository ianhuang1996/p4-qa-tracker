import { describe, it, expect } from 'vitest';
import { getWeekBoundaries, computeWeeklyStats, computeRDWorkload, computeTrendData } from '../reportUtils';

describe('getWeekBoundaries', () => {
  it('returns start and end dates', () => {
    const result = getWeekBoundaries(0);
    expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.start < result.end).toBe(true);
  });

  it('returns a label', () => {
    const result = getWeekBoundaries(0);
    expect(result.label).toContain('~');
  });

  it('previous week is earlier than current week', () => {
    const current = getWeekBoundaries(0);
    const previous = getWeekBoundaries(-1);
    expect(previous.start < current.start).toBe(true);
  });
});

describe('computeWeeklyStats', () => {
  const items = [
    { date: '2026-04-06', currentFlow: '待處理', assignee: 'Neo', priority: 'P0' },
    { date: '2026-04-07', currentFlow: '已修復', assignee: 'Summer', fixedAt: new Date('2026-04-07').getTime(), priority: 'P1' },
    { date: '2026-03-01', currentFlow: '開發中', assignee: 'Neo', priority: 'P2' },
  ];

  it('counts items added in range', () => {
    const stats = computeWeeklyStats(items, '2026-04-06', '2026-04-12');
    expect(stats.addedCount).toBe(2);
  });

  it('counts remaining open items', () => {
    const stats = computeWeeklyStats(items, '2026-04-06', '2026-04-12');
    expect(stats.remainingCount).toBe(2); // 待處理 + 開發中
  });
});

describe('computeRDWorkload', () => {
  const items = [
    { date: '2026-04-06', currentFlow: '開發中', assignee: 'Neo', priority: 'P0' },
    { date: '2026-04-06', currentFlow: '待處理', assignee: 'Neo', priority: 'P1' },
    { date: '2026-04-06', currentFlow: '已修復', assignee: 'Summer', priority: 'P2' },
  ];

  it('groups by assignee', () => {
    const result = computeRDWorkload(items);
    const neo = result.find(r => r.name === 'Neo');
    expect(neo).toBeDefined();
    expect(neo!.assigned).toBe(2);
    expect(neo!.inProgress).toBe(1);
  });

  it('counts fixed items', () => {
    const result = computeRDWorkload(items);
    const summer = result.find(r => r.name === 'Summer');
    expect(summer).toBeDefined();
    expect(summer!.fixed).toBe(1);
  });
});

describe('computeTrendData', () => {
  it('returns correct number of weeks', () => {
    const result = computeTrendData([], 4);
    expect(result.length).toBe(4);
  });

  it('each point has required fields', () => {
    const result = computeTrendData([], 2);
    result.forEach(point => {
      expect(point).toHaveProperty('week');
      expect(point).toHaveProperty('added');
      expect(point).toHaveProperty('fixed');
      expect(point).toHaveProperty('remaining');
    });
  });
});
