// functions.js
// Pure functions, ordered smallest-primitive-first.

import { Assignment } from './objects.js';

// ---------------------------------------------------------------------------
// Time helpers (same shape as variation_1)
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

// ---------------------------------------------------------------------------
// Time-block predicates
// ---------------------------------------------------------------------------

export function shareAnyDay(a, b) {
  return a.days.some(d => b.days.includes(d));
}

export function timesOverlap(a, b) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function blocksConflict(a, b) {
  return shareAnyDay(a, b) && timesOverlap(a, b);
}

// `inner` fits entirely within `outer` (same days, time-window contained).
export function blockContains(outer, inner) {
  if (!inner.days.every(d => outer.days.includes(d))) return false;
  return outer.startTime <= inner.startTime && inner.endTime <= outer.endTime;
}

// ---------------------------------------------------------------------------
// Eligibility: can professor `p` teach section `s` *in principle*?
// (Ignores other already-made assignments.)
// ---------------------------------------------------------------------------

export function isQualified(prof, section) {
  return prof.teachableSubjects.includes(section.subjectCode);
}

export function isAvailableFor(prof, section) {
  return prof.availability.some(window => blockContains(window, section.time));
}

export function isEligible(prof, section) {
  return isQualified(prof, section) && isAvailableFor(prof, section);
}

// ---------------------------------------------------------------------------
// Eligibility under a partial assignment.
// Adds: not already double-booked, not over load cap.
// ---------------------------------------------------------------------------

// Returns the sections currently assigned to this prof under `partial`.
function sectionsAssignedTo(profId, partial, sectionsById) {
  const out = [];
  for (const [secId, pid] of partial) {
    if (pid === profId) out.push(sectionsById.get(secId));
  }
  return out;
}

export function canTake(prof, section, partial, sectionsById) {
  if (!isEligible(prof, section)) return false;
  const taken = sectionsAssignedTo(prof.id, partial, sectionsById);
  if (taken.length >= prof.loadCap) return false;
  for (const t of taken) {
    if (blocksConflict(t.time, section.time)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Heuristic: fewest-options-first ordering.
// Sections with the fewest eligible profs get tried first — failing fast
// shrinks the search tree the most.
// ---------------------------------------------------------------------------

export function orderByFewestOptions(sections, professors) {
  const scored = sections.map(s => ({
    section: s,
    options: professors.filter(p => isEligible(p, s)).length,
  }));
  scored.sort((a, b) => a.options - b.options);
  return scored.map(x => x.section);
}

// ---------------------------------------------------------------------------
// Main algorithm: backtracking max-assignment.
// Returns the Assignment that covers the most sections.
// ---------------------------------------------------------------------------

export function assignProfessors(sections, professors) {
  const sectionsById = new Map(sections.map(s => [s.id, s]));
  const ordered = orderByFewestOptions(sections, professors);

  let bestCount = -1;
  let bestMap = null;
  const partial = new Map();

  function recurse(depth) {
    // Optimistic upper bound: even if we fill every remaining slot, can we
    // beat the best we've found?  If not, prune this branch.
    const remaining = ordered.length - depth;
    if (partial.size + remaining <= bestCount) return;

    if (depth === ordered.length) {
      if (partial.size > bestCount) {
        bestCount = partial.size;
        bestMap = new Map(partial);
      }
      return;
    }

    const sec = ordered[depth];

    // Branch A: try each eligible prof for this section.
    for (const prof of professors) {
      if (canTake(prof, sec, partial, sectionsById)) {
        partial.set(sec.id, prof.id);
        recurse(depth + 1);
        partial.delete(sec.id);
      }
    }

    // Branch B: leave this section unassigned and continue.
    recurse(depth + 1);
  }

  recurse(0);

  const finalMap = bestMap ?? new Map();
  const unassigned = sections.filter(s => !finalMap.has(s.id));
  return new Assignment(finalMap, unassigned);
}
