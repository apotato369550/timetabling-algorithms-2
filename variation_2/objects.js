// objects.js
// Plain-class structs. Data only.

// One contiguous block of time on a calendar. Minutes-from-midnight.
export class TimeBlock {
  constructor(days, startTime, endTime) {
    this.days = days;           // ['M','T','W','Th','F','S','Su']
    this.startTime = startTime; // minutes
    this.endTime = endTime;
  }
}

// A pre-scheduled course-section that needs a professor.
export class Section {
  constructor(id, subjectCode, subjectName, time) {
    this.id = id;               // unique id, e.g. "CIS3100-1"
    this.subjectCode = subjectCode;
    this.subjectName = subjectName;
    this.time = time;           // TimeBlock
  }
}

// A professor with availability windows, qualifications, and a load cap.
export class Professor {
  constructor(id, name, availability, teachableSubjects, loadCap) {
    this.id = id;
    this.name = name;
    this.availability = availability;       // TimeBlock[]
    this.teachableSubjects = teachableSubjects; // string[] of subject codes
    this.loadCap = loadCap;                 // max sections this prof may teach
  }
}

// Output: which prof was assigned to which section. Some may be unassigned.
export class Assignment {
  constructor(map, unassigned) {
    this.map = map;             // Map<sectionId, professorId>
    this.unassigned = unassigned; // Section[]  (no prof could cover them)
  }
}
