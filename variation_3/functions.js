// functions.js
// Pure functions.  Same shape as variations 1 & 2, with one new wrinkle:
// each "row" we're filling now has TWO unknowns — slot AND professor.

import { Offering, Timetable } from './objects.js';

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
// Static eligibility (prof × subject × slot, ignoring other choices).
// ---------------------------------------------------------------------------

export function profQualifiedFor(prof, subject) {
  return prof.teachableSubjects.includes(subject.code);
}

export function profAvailableForSlot(prof, slot) {
  return prof.availability.some(window => blockContains(window, slot.time));
}

// All (slot, prof) pairs that could in principle host this subject.
export function candidatePairsFor(subject, slots, professors) {
  const pairs = [];
  for (const prof of professors) {
    if (!profQualifiedFor(prof, subject)) continue;
    for (const slot of slots) {
      if (profAvailableForSlot(prof, slot)) pairs.push({ slot, prof });
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Demands: each subject needs `sectionsNeeded` sections.
// We expand subjects into a flat list of "slots to fill" before searching.
// ---------------------------------------------------------------------------

export function expandDemands(subjects) {
  const out = [];
  for (const s of subjects) {
    for (let i = 0; i < s.sectionsNeeded; i++) {
      out.push({ subject: s, idxWithinSubject: i });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Heuristic: order demands fewest-candidates-first.
// ---------------------------------------------------------------------------

export function orderDemands(demands, slots, professors) {
  return demands
    .map(d => ({ d, n: candidatePairsFor(d.subject, slots, professors).length }))
    .sort((a, b) => a.n - b.n)
    .map(x => x.d);
}

// ---------------------------------------------------------------------------
// Contextual feasibility: can (slot, prof) be added to the current partial
// list of offerings without breaking anything?
// ---------------------------------------------------------------------------

function profIsBusyAt(profId, slot, partial, slotById) {
  for (const o of partial) {
    if (o.profId !== profId) continue;
    if (blocksConflict(slotById.get(o.slotId).time, slot.time)) return true;
  }
  return false;
}

function profLoad(profId, partial) {
  return partial.filter(o => o.profId === profId).length;
}

// We don't allow two sections of the same subject in the same slot
// (otherwise both are pointlessly identical from the student's POV).
function subjectAlreadyInSlot(subjectCode, slotId, partial) {
  return partial.some(o => o.subjectCode === subjectCode && o.slotId === slotId);
}

export function canPlace(subject, slot, prof, partial, slotById) {
  if (profLoad(prof.id, partial) >= prof.loadCap) return false;
  if (profIsBusyAt(prof.id, slot, partial, slotById)) return false;
  if (subjectAlreadyInSlot(subject.code, slot.id, partial)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main algorithm: backtracking with branch-and-bound.
// Maximizes the number of demands fulfilled.
// ---------------------------------------------------------------------------

export function generateTimetable(subjects, slots, professors) {
  const slotById = new Map(slots.map(s => [s.id, s]));
  const demands = orderDemands(expandDemands(subjects), slots, professors);

  let bestCount = -1;
  let bestList = null;
  const partial = []; // Offering[]

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

    // Enumerate (slot, prof) candidates that *could* host this subject.
    for (const { slot, prof } of candidatePairsFor(subject, slots, professors)) {
      if (!canPlace(subject, slot, prof, partial, slotById)) continue;
      partial.push(new Offering(subject.code, slot.id, prof.id));
      recurse(depth + 1);
      partial.pop();
    }

    // Skip-branch: leave this demand unfulfilled.
    recurse(depth + 1);
  }

  recurse(0);

  const offerings = bestList ?? [];

  // Compute which subjects ended up under-served.
  const fulfilled = new Map();
  for (const o of offerings) {
    fulfilled.set(o.subjectCode, (fulfilled.get(o.subjectCode) ?? 0) + 1);
  }
  const missing = subjects
    .map(s => ({ code: s.code, missing: s.sectionsNeeded - (fulfilled.get(s.code) ?? 0) }))
    .filter(x => x.missing > 0);

  return new Timetable(offerings, missing);
}
