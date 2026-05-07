// main.js — Variation 4 driver.
// Run with:  node main.js

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  TimeBlock, Slot, Subject, Professor, Room, Student,
} from './objects.js';
import { buildUniversity, hhmmToMinutes, minutesToClock } from './functions.js';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, 'samples/input.json'), 'utf8'));

const tb = ({ days, start, end }) =>
  new TimeBlock(days, hhmmToMinutes(start), hhmmToMinutes(end));

const slots = raw.slots.map(s => new Slot(s.id, tb(s)));
const subjects = raw.subjects.map(s =>
  new Subject(s.code, s.name, s.requiredRoomType, s.sectionsNeeded));
const professors = raw.professors.map(p =>
  new Professor(p.id, p.name, p.availability.map(tb), p.teachableSubjects, p.loadCap));
const rooms = raw.rooms.map(r =>
  new Room(r.id, r.name, r.type, r.capacity, r.availability.map(tb)));
const students = raw.students.map(st =>
  new Student(st.id, st.name, st.requiredSubjects));

const uni = buildUniversity(subjects, slots, professors, rooms, students);

const slotById = new Map(slots.map(s => [s.id, s]));
const profById = new Map(professors.map(p => [p.id, p]));
const roomById = new Map(rooms.map(r => [r.id, r]));
const studentById = new Map(students.map(s => [s.id, s]));

console.log(`=== Sections (${uni.sections.length}) ===`);
for (const sec of uni.sections) {
  const slot = slotById.get(sec.slotId);
  const time = `${slot.time.days.join('')} ${minutesToClock(slot.time.startTime)} - ${minutesToClock(slot.time.endTime)}`;
  const prof = profById.get(sec.profId).name;
  const room = roomById.get(sec.roomId).name;
  const enrolled = sec.enrolledStudentIds.map(id => studentById.get(id).name).join(', ') || '(none)';
  console.log(`  ${sec.subjectCode.padEnd(9)} ${time.padEnd(28)} ${prof.padEnd(12)} ${room.padEnd(11)} → ${enrolled}`);
}

if (uni.missingSubjects.length) {
  console.log('\n=== Under-served subjects ===');
  for (const m of uni.missingSubjects) console.log(`  ${m.code}: still needs ${m.missing}`);
}

if (uni.unmetStudentNeeds.length) {
  console.log('\n=== Unmet student needs ===');
  for (const u of uni.unmetStudentNeeds) {
    console.log(`  ${studentById.get(u.studentId).name} could not enroll in ${u.code}`);
  }
} else {
  console.log('\nAll students enrolled in every required subject.');
}
