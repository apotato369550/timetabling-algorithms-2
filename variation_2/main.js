// main.js — Variation 2 driver.
// Run with:  node main.js

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Section, Professor, TimeBlock } from './objects.js';
import { assignProfessors, hhmmToMinutes, minutesToClock } from './functions.js';

const here = dirname(fileURLToPath(import.meta.url));

// Tiny loader helpers — keep main.js readable.
const tb = ({ days, start, end }) =>
  new TimeBlock(days, hhmmToMinutes(start), hhmmToMinutes(end));

const sectionsRaw = JSON.parse(readFileSync(join(here, 'samples/sections.json'), 'utf8'));
const profsRaw = JSON.parse(readFileSync(join(here, 'samples/professors.json'), 'utf8'));

const sections = sectionsRaw.map(s =>
  new Section(s.id, s.subjectCode, s.subjectName, tb(s)));
const professors = profsRaw.map(p =>
  new Professor(p.id, p.name, p.availability.map(tb), p.teachableSubjects, p.loadCap));

const result = assignProfessors(sections, professors);

console.log(`Assigned ${result.map.size}/${sections.length} sections.\n`);
const profById = new Map(professors.map(p => [p.id, p]));

for (const s of sections) {
  const profId = result.map.get(s.id);
  const prof = profId ? profById.get(profId).name : '— UNASSIGNED —';
  const time = `${s.time.days.join('')} ${minutesToClock(s.time.startTime)} - ${minutesToClock(s.time.endTime)}`;
  console.log(`  ${s.id.padEnd(11)} ${s.subjectCode.padEnd(8)} ${time.padEnd(28)} → ${prof}`);
}
