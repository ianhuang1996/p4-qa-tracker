import { RDS, PMS } from '../constants';

const ALL_NAMES = [...PMS, ...RDS].filter(n => n !== 'Unassigned');

/**
 * Extract all @mentions from text
 * e.g. "請 @Neo 看一下 @Summer 也幫忙" → ['Neo', 'Summer']
 */
export function parseMentions(text: string): string[] {
  const mentions: string[] = [];
  ALL_NAMES.forEach(name => {
    if (text.includes(`@${name}`)) {
      mentions.push(name);
    }
  });
  return mentions;
}

/**
 * Highlight @mentions in text by wrapping in styled spans
 * Returns an array of React-compatible string/element pairs
 */
export function highlightMentions(text: string): string {
  let result = text;
  ALL_NAMES.forEach(name => {
    result = result.replace(new RegExp(`@${name}`, 'g'), `**@${name}**`);
  });
  return result;
}
