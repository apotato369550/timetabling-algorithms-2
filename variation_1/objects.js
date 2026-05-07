// objects.js
// Plain-class "structs". Data only — no methods, no logic.
// All behaviour lives in functions.js.

// One concrete time block on a calendar.
// e.g. { days: ['M','W'], startTime: 600, endTime: 690 }  (10:00 AM – 11:30 AM)
export class ParsedTime {
  constructor(days, startTime, endTime) {
    this.days = days;           // array of day codes: 'M','T','W','Th','F','S','Su'
    this.startTime = startTime; // minutes from midnight
    this.endTime = endTime;     // minutes from midnight
  }
}

// One offering of a course (one row in the CSV).
export class Section {
  constructor(courseCode, courseName, group, scheduleString, enrolledCurrent, enrolledTotal) {
    this.courseCode = courseCode;             // "CIS 3100"
    this.courseName = courseName;             // "Data Structures and Algorithms"
    this.group = group;                       // 1, 2, 3, ...
    this.scheduleString = scheduleString;     // "MW 11:00 AM - 12:30 PM"
    this.enrolledCurrent = enrolledCurrent;   // 25
    this.enrolledTotal = enrolledTotal;       // 30
    this.parsedTime = null;                   // ParsedTime — filled in lazily
  }
}

// A bag of sections that all share the same courseCode.
export class Course {
  constructor(courseCode, courseName) {
    this.courseCode = courseCode;
    this.courseName = courseName;
    this.sections = []; // Section[]
  }
}

// User-supplied filters and limits passed to the generator.
export class Constraints {
  constructor({
    earliestStart = '07:30',     // HH:MM (24h)
    latestEnd = '16:30',         // HH:MM (24h)
    allowFull = false,           // include sections at capacity?
    allowAtRisk = true,          // include sections that may not run?
    maxFullPerSchedule = 1,      // cap on FULL sections in any one result
    maxSchedules = 20,           // safety cap on output size
  } = {}) {
    this.earliestStart = earliestStart;
    this.latestEnd = latestEnd;
    this.allowFull = allowFull;
    this.allowAtRisk = allowAtRisk;
    this.maxFullPerSchedule = maxFullPerSchedule;
    this.maxSchedules = maxSchedules;
  }
}

// One valid combination produced by the generator.
// `selections` has exactly one Section per input Course, in input order.
export class Schedule {
  constructor(selections, meta) {
    this.selections = selections; // Section[]
    this.meta = meta;             // { fullCount, latestEnd, endsByPreferred, hasLate }
  }
}
