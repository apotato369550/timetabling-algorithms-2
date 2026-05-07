// objects.js
// Plain-class structs.

export class TimeBlock {
  constructor(days, startTime, endTime) {
    this.days = days;
    this.startTime = startTime;
    this.endTime = endTime;
  }
}

export class Slot {
  constructor(id, time) {
    this.id = id;
    this.time = time;
  }
}

// Subject now also declares what kind of room it needs.
export class Subject {
  constructor(code, name, requiredRoomType, sectionsNeeded = 1) {
    this.code = code;
    this.name = name;
    this.requiredRoomType = requiredRoomType; // 'lecture' | 'lab' | 'computer' | ...
    this.sectionsNeeded = sectionsNeeded;
  }
}

export class Professor {
  constructor(id, name, availability, teachableSubjects, loadCap) {
    this.id = id;
    this.name = name;
    this.availability = availability;
    this.teachableSubjects = teachableSubjects;
    this.loadCap = loadCap;
  }
}

export class Room {
  constructor(id, name, type, capacity, availability) {
    this.id = id;
    this.name = name;
    this.type = type;            // 'lecture' | 'lab' | 'computer' | ...
    this.capacity = capacity;
    this.availability = availability; // TimeBlock[]
  }
}

export class Student {
  constructor(id, name, requiredSubjects) {
    this.id = id;
    this.name = name;
    this.requiredSubjects = requiredSubjects; // string[] of subject codes
  }
}

// One produced section.
export class Section {
  constructor(id, subjectCode, slotId, profId, roomId, enrolledStudentIds = []) {
    this.id = id;
    this.subjectCode = subjectCode;
    this.slotId = slotId;
    this.profId = profId;
    this.roomId = roomId;
    this.enrolledStudentIds = enrolledStudentIds;
  }
}

export class University {
  constructor(sections, missingSubjects, unmetStudentNeeds) {
    this.sections = sections;                   // Section[]
    this.missingSubjects = missingSubjects;     // {code, missing}[]
    this.unmetStudentNeeds = unmetStudentNeeds; // {studentId, code}[]
  }
}
