import { describe, it, expect } from 'vitest';
import { parseMentions, highlightMentions } from '../mentionUtils';

describe('parseMentions', () => {
  it('returns empty array for text without mentions', () => {
    expect(parseMentions('這是一般留言')).toEqual([]);
  });

  it('extracts single mention', () => {
    expect(parseMentions('請 @Neo 看一下')).toEqual(['Neo']);
  });

  it('extracts multiple mentions', () => {
    const result = parseMentions('@Neo 和 @Summer 請幫忙');
    expect(result).toContain('Neo');
    expect(result).toContain('Summer');
  });

  it('does not extract unknown names', () => {
    expect(parseMentions('@RandomPerson 你好')).toEqual([]);
  });

  it('handles mention at start of text', () => {
    expect(parseMentions('@Ian 這個問題')).toEqual(['Ian']);
  });
});

describe('highlightMentions', () => {
  it('wraps mentions in bold markdown', () => {
    const result = highlightMentions('請 @Neo 看一下');
    expect(result).toContain('**@Neo**');
  });

  it('leaves text without mentions unchanged', () => {
    const text = '這是一般留言';
    expect(highlightMentions(text)).toBe(text);
  });
});
