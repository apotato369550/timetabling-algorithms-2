// functions.js
// Pure functions.  Two-phase pipeline:
//   Phase A — backtracking generation of (subject, slot, prof, room) sections
//   Phase B — greedy student enrollment respecting room capacity + student
//             time conflicts
//
// Phase A maximizes subject coverage; phase B maximizes student-need
// fulfillment given the sections produced.

import { Section, University } from './objects.js';

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToClock(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h = h24 % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function shareAnyDay(a, b) { return a.days.some(d => b.days.includes(d)); }
export function timesOverlap(a, b) { return a.startTime < b.endTime && b.startTime < a.endTime; }
export function blocksConflict(a, b) { return shareAnyDay(a, b) && timesOverlap(a, b); }

export function blockContains(outer, inner) {
  if (!inner.days.every(d => outer.days.includes(d))) return false;
  return outer.startTime <= inner.startTime && inner.endTime <= outer.endTime;
}

// ---------------------------------------------------------------------------
// Static eligibility
// ---------------------------------------------------------------------------

export function profQualifiedFor(prof, subject) {
  return prof.teachableSubjects.includes(subject.code);
}

export function profAvailableForSlot(prof, slot) {
  return prof.availability.some(w => blockContains(w, slot.time));
}

export function roomMatchesSubject(room, subject) {
  return room.type === subject.requiredRoomType;
}

export function roomAvailableForSlot(room, slot) {
  return room.availability.some(w => blockContains(w, slot.time));
}

export function candidateTriplesFor(subject, slots, professors, rooms) {
  const out = [];
  for (const prof of professors) {
    if (!profQualifiedFor(prof, subject)) continue;
    for (const room of rooms) {
      if (!roomMatchesSubject(room, subject)) continue;
      for (const slot of slots) {
        if (!profAvailableForSlot(prof, slot)) continue;
        if (!roomAvailableForSlot(room, slot)) continue;
        out.push({ slot, prof, room });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Demand expansion + ordering
// ---------------------------------------------------------------------------

export function expandDemands(subjects) {
  const out = [];
  for (const s of subjects) {
    for (let i = 0; i < s.sectionsNeeded; i++) out.push({ subject: s });
  }
  return out;
}

export function orderDemands(demands, slots, professors, rooms) {
  return demands
    .map(d => ({ d, n: candidateTriplesFor(d.subject, slots, professors, rooms).length }))
    .sort((a, b) => a.n - b.n)
    .map(x => x.d);
}

// ---------------------------------------------------------------------------
// Contextual feasibility for placing one more section
// ---------------------------------------------------------------------------

function busyAt(holderField, holderId, slot, partial, slotById) {
  for (const sec of partial) {
    if (sec[holderField] !== holderId) continue;
    if (blocksConflict(slotById.get(sec.slotId).time, slot.time)) return true;
  }
  return false;
}

function profLoad(profId, partial) {
  return partial.filter(s => s.profId === profId).length;
}

function subjectAlreadyInSlot(subjectCode, slotId, partial) {
  return partial.some(s => s.subjectCode === subjectCode && s.slotId === slotId);
}

export function canPlace(subject, slot, prof, room, partial, slotById) {
  if (profLoad(prof.id, partial) >= prof.loadCap) return false;
  if (busyAt('profId', prof.id, slot, partial, slotById)) return false;
  if (busyAt('roomId', room.id, slot, partial, slotById)) return false;
  if (subjectAlreadyInSlot(subject.code, slot.id, partial)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Phase A — backtracking section generator (max subject coverage)
// ---------------------------------------------------------------------------

export function generateSections(subjects, slots, professors, rooms) {
  const slotById = new Map(slots.map(s => [s.id, s]));
  const demands = orderDemands(expandDemands(subjects), slots, professors, rooms);

  let bestCount = -1;
  let bestList = null;
  const partial = [];
  let secCounter = 0;

  function recurse(depth) {
    if (partial.length + (demands.length - depth) <= bestCount) return;

    if (depth === demands.length) {
      if (partial.length > bestCount) {
        bestCount = partial.length;
        bestList = partial.slice();
      }
      return;
    }

    const { subject } = demands[depth];
    for (const { slot, prof, room } of candidateTriplesFor(subject, slots, professors, rooms)) {
      if (!canPlace(subject, slot, prof, room, partial, slotById)) continue;
      partial.push(new Section(`S${++secCounter}`, subject.code, slot.id, prof.id, room.id));
      recurse(depth + 1);
      partial.pop();
      secCounter--;
    }

    recurse(depth + 1);
  }

  recurse(0);
  return bestList ?? [];
}

// ---------------------------------------------------------------------------
// Phase B — greedy student enrollment
// ---------------------------------------------------------------------------

// Sort students by need-count descending — students with the most needs
// have the tightest schedules and benefit from going first.
export function orderStudents(students) {
  return [...students].sort(
    (a, b) => b.requiredSubjects.length - a.requiredSubjects.length);
}

// For one student, try to enroll them in one section per required subject,
// skipping any subject for which no section fits their growing schedule.
function enrollStudent(student, sections, rooms, slotById) {
  const taken = []; // Section[] this student is already in
  const unmet = []; // string[] of subject codes we couldn't place
  const roomById = new Map(rooms.map(r => [r.id, r]));

  for (const code of student.requiredSubjects) {
    const candidates = sections.filter(s => s.subjectCode === code);
    let placed = false;

    // Prefer the least-full section to balance class sizes.
    candidates.sort((a, b) => a.enrolledStudentIds.length - b.enrolledStudentIds.length);

    for (const sec of candidates) {
      const room = roomById.get(sec.roomId);
      if (sec.enrolledStudentIds.length >= room.capacity) continue;

      const newTime = slotById.get(sec.slotId).time;
      const clash = taken.some(t =>
        blocksConflict(slotById.get(t.slotId).time, newTime));
      if (clash) continue;

      sec.enrolledStudentIds.push(student.id);
      taken.push(sec);
      placed = true;
      break;
    }

    if (!placed) unmet.push(code);
  }
  return unmet.map(code => ({ studentId: student.id, code }));
}

export function enrollStudents(students, sections, rooms, slots) {
  const slotById = new Map(slots.map(s => [s.id, s]));
  const unmet = [];
  for (const student of orderStudents(students)) {
    unmet.push(...enrollStudent(student, sections, rooms, slotById));
  }
  return unmet;
}

// ---------------------------------------------------------------------------
// Top-level entry point
// ---------------------------------------------------------------------------

export function buildUniversity(subjects, slots, professors, rooms, students) {
  const sections = generateSections(subjects, slots, professors, rooms);

  const fulfilled = new Map();
  for (const s of sections) {
    fulfilled.set(s.subjectCode, (fulfilled.get(s.subjectCode) ?? 0) + 1);
  }
  const missingSubjects = subjects
    .map(s => ({ code: s.code, missing: s.sectionsNeeded - (fulfilled.get(s.code) ?? 0) }))
    .filter(x => x.missing > 0);

  const unmetStudentNeeds = enrollStudents(students, sections, rooms, slots);

  return new University(sections, missingSubjects, unmetStudentNeeds);
}
