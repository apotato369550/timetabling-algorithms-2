// main.js — Variation 3 driver.
// Run with:  node main.js

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { TimeBlock, Slot, Subject, Professor } from './objects.js';
import { generateTimetable, hhmmToMinutes, minutesToClock } from './functions.js';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, 'samples/input.json'), 'utf8'));

const tb = ({ days, start, end }) =>
  new TimeBlock(days, hhmmToMinutes(start), hhmmToMinutes(end));

const slots = raw.slots.map(s => new Slot(s.id, tb(s)));
const subjects = raw.subjects.map(s => new Subject(s.code, s.name, s.sectionsNeeded));
const professors = raw.professors.map(p =>
  new Professor(p.id, p.name, p.availability.map(tb), p.teachableSubjects, p.loadCap));

const tt = generateTimetable(subjects, slots, professors);

const slotById = new Map(slots.map(s => [s.id, s]));
const profById = new Map(professors.map(p => [p.id, p]));

const totalDemand = subjects.reduce((acc, s) => acc + s.sectionsNeeded, 0);
console.log(`Generated ${tt.offerings.length}/${totalDemand} sections.\n`);

for (const o of tt.offerings) {
  const slot = slotById.get(o.slotId);
  const prof = profById.get(o.profId);
  const time = `${slot.time.days.join('')} ${minutesToClock(slot.time.startTime)} - ${minutesToClock(slot.time.endTime)}`;
  console.log(`  ${o.subjectCode.padEnd(9)} ${time.padEnd(28)} → ${prof.name}`);
}

if (tt.missingSubjects.length) {
  console.log('\nUnder-served subjects:');
  for (const m of tt.missingSubjects) {
    console.log(`  ${m.code}: still needs ${m.missing} section(s)`);
  }
}
