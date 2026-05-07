// objects.js
// Plain-class structs.

export class TimeBlock {
  constructor(days, startTime, endTime) {
    this.days = days;
    this.startTime = startTime;
    this.endTime = endTime;
  }
}

// One of the school's allowable timeslots (a "row" in the master grid).
// e.g. "MW 8:00–9:30" is one slot; the school has a fixed list of these.
export class Slot {
  constructor(id, time) {
    this.id = id;          // "MW-08:00"
    this.time = time;      // TimeBlock
  }
}

// A subject the curriculum says must be offered this term.
export class Subject {
  constructor(code, name, sectionsNeeded = 1) {
    this.code = code;
    this.name = name;
    this.sectionsNeeded = sectionsNeeded;  // how many sections to spawn
  }
}

export class Professor {
  constructor(id, name, availability, teachableSubjects, loadCap) {
    this.id = id;
    this.name = name;
    this.availability = availability;        // TimeBlock[]
    this.teachableSubjects = teachableSubjects;
    this.loadCap = loadCap;
  }
}

// A produced section: subject + slot + prof.
export class Offering {
  constructor(subjectCode, slotId, profId) {
    this.subjectCode = subjectCode;
    this.slotId = slotId;
    this.profId = profId;
  }
}

// The output: a list of Offerings + which subjects we couldn't fully cover.
export class Timetable {
  constructor(offerings, missingSubjects) {
    this.offerings = offerings;            // Offering[]
    this.missingSubjects = missingSubjects;// {code, missing} entries
  }
}
