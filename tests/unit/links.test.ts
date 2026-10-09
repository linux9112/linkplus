import { describe, it, expect } from 'vitest';

describe('Unit: Link Sorting, Scheduling Windows & UTM Serializer', () => {
  describe('Link Sorting Comparator', () => {
    it('should sort pinned links first, then by ascending position', () => {
      const links = [
        { id: '1', title: 'Normal 2', is_pinned: false, position: 2 },
        { id: '2', title: 'Normal 1', is_pinned: false, position: 1 },
        { id: '3', title: 'Pinned 2', is_pinned: true, position: 5 },
        { id: '4', title: 'Pinned 1', is_pinned: true, position: 0 },
      ];

      const sorted = [...links].sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return a.position - b.position;
      });

      expect(sorted.map(s => s.id)).toEqual(['4', '3', '2', '1']);
    });
  });

  describe('Scheduling Window Predicate', () => {
    function isLinkVisibleAt(
      scheduledStart: Date | null,
      scheduledEnd: Date | null,
      currentTime: Date
    ): boolean {
      if (scheduledStart && scheduledStart > currentTime) return false;
      if (scheduledEnd && scheduledEnd < currentTime) return false;
      return true;
    }

    it('should return true when no schedule constraints are set', () => {
      expect(isLinkVisibleAt(null, null, new Date())).toBe(true);
    });

    it('should return false before scheduled_start', () => {
      const now = new Date();
      const start = new Date(now.getTime() + 10000);
      expect(isLinkVisibleAt(start, null, now)).toBe(false);
    });

    it('should return false after scheduled_end', () => {
      const now = new Date();
      const end = new Date(now.getTime() - 10000);
      expect(isLinkVisibleAt(null, end, now)).toBe(false);
    });

    it('should return true within active start and end window', () => {
      const now = new Date();
      const start = new Date(now.getTime() - 10000);
      const end = new Date(now.getTime() + 10000);
      expect(isLinkVisibleAt(start, end, now)).toBe(true);
    });
  });

  describe('UTM Parameter Appender', () => {
    it('should append UTM query parameters to destination URL correctly', () => {
      const target = 'https://store.example.com/item?existing=1';
      const utms = { utm_source: 'linkpulse', utm_medium: 'bio' };

      const parsed = new URL(target);
      for (const [k, v] of Object.entries(utms)) {
        parsed.searchParams.set(k, v);
      }

      expect(parsed.searchParams.get('existing')).toBe('1');
      expect(parsed.searchParams.get('utm_source')).toBe('linkpulse');
      expect(parsed.searchParams.get('utm_medium')).toBe('bio');
    });
  });
});
