// main.js
// Driver: load CSV -> pick which courses to enroll in -> generate schedules.
//
// Run with:  node main.js

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Constraints } from './objects.js';
import {
  loadCoursesFromCsv,
  generateSchedules,
  minutesToClock,
} from './functions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Load every course/section from the sample CSV.
const csvPath = join(__dirname, 'samples', 'cs-student-schedule.csv');
const allCourses = loadCoursesFromCsv(readFileSync(csvPath, 'utf8'));

// 2. Pick which courses the student wants to take this semester.
//    (In a real app this would come from user input.)
const wantedCodes = ['CIS 3100', 'CIS 2103', 'CIS 3210', 'MATH 2010'];
const courses = allCourses.filter(c => wantedCodes.includes(c.courseCode));

// 3. Set the user's filters.
const constraints = new Constraints({
  earliestStart: '08:00',
  latestEnd: '17:30',
  allowFull: false,
  allowAtRisk: true,
  maxFullPerSchedule: 0,
  maxSchedules: 10,
});

// 4. Run the generator.
const schedules = generateSchedules(courses, constraints);

// 5. Print the results.
console.log(`Found ${schedules.length} valid schedule(s).\n`);
schedules.forEach((sched, idx) => {
  console.log(`--- Schedule ${String.fromCharCode(65 + idx)} ---`);
  for (const s of sched.selections) {
    console.log(`  ${s.courseCode.padEnd(10)} g${s.group}  ${s.scheduleString.padEnd(28)} (${s.enrolledCurrent}/${s.enrolledTotal})`);
  }
  const { fullCount, latestEnd, endsByPreferred, hasLate } = sched.meta;
  console.log(`  meta: latestEnd=${minutesToClock(latestEnd)}  full=${fullCount}  endsByPreferred=${endsByPreferred}  hasLate=${hasLate}`);
  console.log();
});
