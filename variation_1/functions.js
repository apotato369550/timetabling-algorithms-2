// functions.js
// Pure functions that operate on the structs in objects.js.
// Grouped top-to-bottom from "smallest primitive" to "main entry point".

import { ParsedTime, Schedule } from './objects.js';

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

// "10:30" -> 630
export function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// "10:30 AM" -> 630, "1:00 PM" -> 780, "12:00 AM" -> 0
export function clockToMinutes(clock) {
  const m = clock.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

// 690 -> "11:30 AM"
export function minutesToClock(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Schedule-string parsing
// ---------------------------------------------------------------------------

// "MWThF" -> ['M','W','Th','F']  (Th and Su are two-letter codes)
export function parseDays(daysStr) {
  const out = [];
  for (let i = 0; i < daysStr.length; i++) {
    const c = daysStr[i];
    const next = daysStr[i + 1];
    if (c === 'T' && next === 'h') { out.push('Th'); i++; }
    else if (c === 'S' && next === 'u') { out.push('Su'); i++; }
    else out.push(c);
  }
  return out;
}

// "MW 11:00 AM - 12:30 PM" -> ParsedTime, or null on garbage input.
export function parseSchedule(scheduleString) {
  if (!scheduleString || typeof scheduleString !== 'string') return null;
  const parts = scheduleString.trim().split(/\s+/);
  if (parts.length < 4) return null;

  const days = parseDays(parts[0]);
  const timePart = parts.slice(1).join(' ');
  const m = timePart.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i);
  if (!m) return null;

  const startTime = clockToMinutes(m[1]);
  const endTime = clockToMinutes(m[2]);
  if (startTime === null || endTime === null || startTime >= endTime) return null;

  return new ParsedTime(days, startTime, endTime);
}

// Mutates `section.parsedTime` once, returns it. Cheap re-call.
export function ensureParsed(section) {
  if (section.parsedTime === null) {
    section.parsedTime = parseSchedule(section.scheduleString);
  }
  return section.parsedTime;
}

// ---------------------------------------------------------------------------
// Per-section predicates
// ---------------------------------------------------------------------------

export function isFull(section) {
  return section.enrolledCurrent >= section.enrolledTotal;
}

// "At risk" = the registrar might cancel it for low enrollment.
export function isAtRisk(section) {
  const cur = section.enrolledCurrent;
  const tot = section.enrolledTotal;
  if (cur === 0) return true;
  if (tot >= 20 && cur < 6) return true;
  if (tot >= 10 && cur < 2) return true;
  return false;
}

// Does this section pass the user's filters at all? (Used as a pre-filter
// before the search begins — it never depends on other sections.)
export function isViable(section, constraints) {
  const t = ensureParsed(section);
  if (!t) return false;

  const earliest = hhmmToMinutes(constraints.earliestStart);
  const latest = hhmmToMinutes(constraints.latestEnd);
  if (t.startTime < earliest || t.endTime > latest) return false;

  if (!constraints.allowFull && isFull(section)) return false;
  if (!constraints.allowAtRisk && isAtRisk(section)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

// Two intervals [a1,a2) and [b1,b2) overlap iff a1 < b2 AND b1 < a2.
export function timesOverlap(a, b) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function shareAnyDay(a, b) {
  return a.days.some(d => b.days.includes(d));
}

// Two sections conflict iff they share a day AND their time ranges overlap.
export function hasConflict(s1, s2) {
  const a = ensureParsed(s1);
  const b = ensureParsed(s2);
  if (!a || !b) return false;
  return shareAnyDay(a, b) && timesOverlap(a, b);
}

// ---------------------------------------------------------------------------
// Schedule scoring / metadata
// ---------------------------------------------------------------------------

// Builds the bookkeeping object stored on a finished Schedule.
export function buildMeta(selections, constraints) {
  const parsed = selections.map(ensureParsed).filter(Boolean);
  const fullCount = selections.filter(isFull).length;
  const latestEnd = Math.max(...parsed.map(p => p.endTime));
  const endsByPreferred = latestEnd <= hhmmToMinutes(constraints.latestEnd);
  const hasLate = parsed.some(p => p.startTime >= hhmmToMinutes('12:00'));
  return { fullCount, latestEnd, endsByPreferred, hasLate };
}

// ---------------------------------------------------------------------------
// The main algorithm: backtracking schedule generator
// ---------------------------------------------------------------------------

// Returns Schedule[] — every conflict-free way to pick exactly one section
// per course, subject to `constraints`. Capped at constraints.maxSchedules.
export function generateSchedules(courses, constraints) {
  // Step 1: pre-filter. For each course, drop sections that can never
  // appear in any valid schedule (wrong time window, full when not allowed,
  // etc.). If any course is left with zero candidates, we're done.
  const buckets = [];
  for (const course of courses) {
    const viable = course.sections.filter(s => isViable(s, constraints));
    if (viable.length === 0) return [];
    buckets.push(viable);
  }

  // Step 2: depth-first search. At depth `i` we're choosing a section for
  // course `i`. We extend `picked` by trying each candidate that doesn't
  // clash with anything already in `picked`, then recurse.
  const results = [];
  const picked = [];

  function recurse(depth) {
    if (results.length >= constraints.maxSchedules) return;

    if (depth === buckets.length) {
      const meta = buildMeta(picked, constraints);
      if (meta.fullCount <= constraints.maxFullPerSchedule) {
        results.push(new Schedule([...picked], meta));
      }
      return;
    }

    for (const candidate of buckets[depth]) {
      let clash = false;
      for (const chosen of picked) {
        if (hasConflict(candidate, chosen)) { clash = true; break; }
      }
      if (clash) continue;

      picked.push(candidate);
      recurse(depth + 1);
      picked.pop();

      if (results.length >= constraints.maxSchedules) return;
    }
  }

  recurse(0);
  return results;
}

// ---------------------------------------------------------------------------
// CSV loading (kept here so the algorithm module is self-contained)
// ---------------------------------------------------------------------------

import { Section, Course } from './objects.js';

// Parses the sample CSV format:
//   Course Code,Course Name,Group,Schedule,Enrolled
//   CIS 3100,Data Structures...,1,MW 11:00 AM - 12:30 PM,25/30
//
// Returns Course[] grouped by courseCode in first-seen order.
export function loadCoursesFromCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  lines.shift(); // drop header

  const byCode = new Map();
  for (const line of lines) {
    const [code, name, groupStr, schedule, enrolled] = line.split(',');
    const [curStr, totStr] = enrolled.split('/');
    const section = new Section(
      code.trim(),
      name.trim(),
      parseInt(groupStr, 10),
      schedule.trim(),
      parseInt(curStr, 10),
      parseInt(totStr, 10),
    );

    if (!byCode.has(section.courseCode)) {
      byCode.set(section.courseCode, new Course(section.courseCode, section.courseName));
    }
    byCode.get(section.courseCode).sections.push(section);
  }
  return Array.from(byCode.values());
}
