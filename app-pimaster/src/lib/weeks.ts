/** Date helpers for PT weekly summaries. All inputs/outputs are ISO dates (YYYY-MM-DD). */

export function parseIso(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Sunday–Saturday week containing `date`. */
export function weekBounds(date: string): { start: string; end: string } {
  const d = parseIso(date);
  const dow = d.getUTCDay(); // 0 = Sunday
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - dow);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: toIso(start), end: toIso(end) };
}

/** Day 1 = day of accident. */
export function daysSinceAccident(accidentDate: string, onDate: string): number {
  const ms = parseIso(onDate).getTime() - parseIso(accidentDate).getTime();
  return Math.floor(ms / 86400000) + 1;
}

/** Week 1 = week containing the accident (Sunday–Saturday weeks). */
export function weekNumber(accidentDate: string, onDate: string): number {
  const accStart = parseIso(weekBounds(accidentDate).start).getTime();
  const curStart = parseIso(weekBounds(onDate).start).getTime();
  return Math.round((curStart - accStart) / (7 * 86400000)) + 1;
}

export interface TimelineDay {
  date: string;
  dayNumber: number;
  label: string;
}

/** Day-by-day timeline from accident date through `endDate` (inclusive), capped at `maxDays`. */
export function buildTimeline(accidentDate: string, endDate: string, maxDays = 120): TimelineDay[] {
  const out: TimelineDay[] = [];
  const start = parseIso(accidentDate);
  const end = parseIso(endDate);
  for (let i = 0; ; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    if (d.getTime() > end.getTime() || i >= maxDays) break;
    out.push({
      date: toIso(d),
      dayNumber: i + 1,
      label: i === 0 ? "Day of Injury" : `Day ${i + 1}`,
    });
  }
  return out;
}
