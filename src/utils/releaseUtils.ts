export interface NoteSection {
  emoji: string;
  title: string;
  items: string[];
}

export function parseReleaseNotes(notes: string): NoteSection[] {
  const sections: NoteSection[] = [];
  let current: NoteSection | null = null;
  for (const rawLine of notes.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const firstChar = [...line][0];
    const cp = firstChar.codePointAt(0) ?? 0;
    // Only match actual emoji ranges, exclude CJK (0x2E80–0x9FFF)
    const isEmoji = (cp >= 0x2600 && cp <= 0x27BF) || cp >= 0x1F000;
    if (isEmoji) {
      const spaceIdx = line.indexOf(' ');
      if (spaceIdx > 0) {
        current = { emoji: line.slice(0, spaceIdx), title: line.slice(spaceIdx + 1).trim(), items: [] };
        sections.push(current);
      }
    } else if (current && !line.startsWith('本次無')) {
      current.items.push(line);
    }
  }
  return sections;
}
