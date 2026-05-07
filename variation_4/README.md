# Variation 4 — Full University Timetabling (UCTP)

## The Problem in One Sentence

> *Given a curriculum of subjects (each requiring a specific room type), a
> roster of professors with availabilities and capabilities, a set of rooms
> with capacities and types, and a population of students each carrying a
> list of required subjects, produce a set of sections — every section
> tagged with subject, slot, professor, room, and an enrollment list — such
> that no professor, room, or student is double-booked, no room is
> over-filled, and as much of the curriculum and as many student needs as
> possible are met.*

```
variation_4/
├── README.md
├── objects.js                    # TimeBlock, Slot, Subject, Professor, Room, Student, Section, University
├── functions.js                  # eligibility, conflict, two-phase pipeline
├── main.js
├── package.json
└── samples/
    └── input.json
```

```bash
cd variation_4 && node main.js
```

This is the canonical **University Course Timetabling Problem (UCTP)**.
It is NP-hard. At the small scale used here (4 subjects, 4 profs, 3 rooms,
4 students), exhaustive backtracking is fine and provably optimal.

---

## 1. The Primitives

| Struct       | Holds                                                                |
| ------------ | -------------------------------------------------------------------- |
| `TimeBlock`  | `{ days, startTime, endTime }`                                       |
| `Slot`       | `{ id, time }`                                                       |
| `Subject`    | `{ code, name, requiredRoomType, sectionsNeeded }`                   |
| `Professor`  | `{ id, name, availability, teachableSubjects, loadCap }`             |
| `Room`       | `{ id, name, type, capacity, availability }`                         |
| `Student`    | `{ id, name, requiredSubjects }`                                     |
| `Section`    | `{ id, subjectCode, slotId, profId, roomId, enrolledStudentIds }`    |
| `University` | `{ sections, missingSubjects, unmetStudentNeeds }`                   |

The output `Section` carries five identifiers — that's the full UCTP tuple.

---

## 2. What's New vs. Variation 3

Two new dimensions:

- **Rooms** — every section now also picks a room. Rooms have a *type* that
  must match the subject's `requiredRoomType`, and a *capacity* that bounds
  enrollment.
- **Students** — they're not just observers anymore. Each student has a list
  of required subjects, and they cannot themselves be double-booked.

The `Section` row gained a fourth unknown (room) plus a downstream concern
(who's enrolled). That second concern is what forces this variation into a
**two-phase pipeline**.

---

## 3. The Algorithm: Two Phases

```
Phase A: generate sections (subject + slot + prof + room)
                ↓
Phase B: enroll students into the sections that exist
```

### Why decompose?

In principle you could co-optimize sections and enrollments together, but
that blows up the state space — and student enrollment is comparatively
easy *given* the sections. So we solve it in two passes:

- **Phase A is a hard constraint problem.** Conflict-freeness must hold
  exactly. Use backtracking.
- **Phase B is a soft preference problem.** Once sections exist, "every
  student gets every subject" is just an aspirational target subject to
  capacity and student-time-conflict. Use a greedy heuristic.

This is a common pattern in timetabling literature — **decomposition by
constraint hardness**.

### Phase A — Backtracking section generator

Same shape as variation 3, but the candidate per row is now a **triple**
`(slot, prof, room)` instead of a pair:

```
candidates(subject) = { (slot, prof, room) |
                          prof qualified for subject AND
                          prof available in slot AND
                          room.type == subject.requiredRoomType AND
                          room available in slot }
```

Three feasibility checks per candidate before search; three contextual
checks during search:

1. prof not already booked in a time-conflicting slot, not over `loadCap`
2. room not already booked in a time-conflicting slot
3. (subject, slot) not already used (no two duplicate sections in the same
   slot — same rule as variation 3)

The objective is "maximize subject coverage," same upper-bound prune as
variations 2 and 3.

### Phase B — Greedy student enrollment

For each student (sorted by need-count descending — more needs first, since
they have less wiggle room):

1. Walk their required-subjects list.
2. For each subject, gather the existing sections of that subject.
3. Prefer the **least-full** section (load balancing).
4. Reject sections whose room is at capacity, or whose slot conflicts with
   what this student is already enrolled in.
5. Enroll, or record an unmet need.

The greedy is **not optimal**. With ~adversarial data, a smarter student
could leave room for a less-flexible one and save more total enrollments.
Fixing this turns Phase B into a separate matching problem (see
alternatives).

---

## 4. Walk-Through with the Sample Data

Inputs:

- 4 subjects: CIS3100 (computer), CIS3320 (lab), CIS2103 (computer),
  MATH2010 (lecture)
- 4 profs (with availability windows that don't all overlap)
- 3 rooms: 1 computer lab cap 2, 1 lecture room cap 3, 1 net lab cap 2
- 4 students with overlapping subject needs

Phase A finds 4 sections. Phase B enrolls students:

- Anna (3 needs) → CIS3100, CIS3320, MATH2010 ✓
- Bea (3 needs) → CIS3100, CIS2103, MATH2010 ✓
- Carlo (2 needs) → CIS3320 ✓, **CIS2103 ✗** (CompLab cap 2 already full)
- Dina (2 needs) → MATH2010 ✓, **CIS3100 ✗** (CompLab cap 2 already full)

The unmet needs are *real* — not an algorithmic failure. With only one
computer lab capacity 2 and three students per CIS-section in demand, no
schedule exists that fully satisfies everyone. The algorithm correctly
identifies the bottleneck.

---

## 5. Complexity

- **Phase A worst case:** `O((s · p · r)^n)` for `n` demands, `s` slots,
  `p` profs, `r` rooms.
- **Phase B:** `O(students × subjects × sectionsPerSubject)`, which is
  effectively linear at this scale.

Real schools have `n` in the hundreds, `s` in the dozens, `p` in the
hundreds, `r` in the dozens. Phase A backtracking will not finish.
You'd swap in CP-SAT or simulated annealing.

---

## 6. Other Approaches (briefly)

| Approach | When | Sketch |
| --- | --- | --- |
| **CP-SAT** (constraint programming) | The mainstream choice for medium-sized UCTP | Variables: one per demand with domain = candidate triples. Channel constraints to extract slot/prof/room. AllDifferent on overlapping-time pairs. OR-Tools handles it. |
| **Integer Linear Programming** | Need a provable optimum + soft objectives | `x_{d,s,p,r} ∈ {0,1}`. Resource constraints, conflict constraints, capacity in Phase B as well. Big formulation but expressive. |
| **Simulated annealing / tabu search** | Real-school scale | Encode the whole timetable as a vector. Neighbor moves: change one section's slot, swap two sections' rooms, move a student between sections. Cool slowly. ITC-2007 winners. |
| **Decomposition (this variation)** | Wide-but-shallow problems where phases couple weakly | Solve hard constraints first, soft optimization second. Easy to read, fast to debug. Sub-optimal at the seam. |
| **Hyper-heuristics** | When you don't know which heuristic will win | A meta-algorithm that chooses, online, between several heuristics based on what's been working on this instance. Active research area. |
| **Phase-B as min-cost flow** | If you want optimal student enrollment given Phase A's sections | Source → student (cap = needs) → section (cap 1, only if subject matches and time fits) → subject sink (cap = student.needs[subject]). Max-flow gives the most enrollments. |

---

## 7. Why This Is Where Novelty Lives (Domain-Specific Constraints)

The four-variable shape `(subject, slot, prof, room)` is generic — any
school in the world has roughly this. The interesting research questions
appear when local constraints layer on top:

- **Block sections** — a *cohort* of students moves as one unit. The
  enrollment phase changes from "per student" to "per block."
- **Pre-requisites** — Students can only enroll in a subject if a
  transcript test passes.
- **Curriculum-year locking** — Some subjects are 2nd-semester-only by
  policy.
- **Travel time** — A soft constraint penalizing back-to-back classes in
  buildings far apart.
- **Faculty deloading** — Profs with admin roles get a discount on `loadCap`.
- **Cultural constraints** — No-class on Friday 12:00–13:00, Holy Week, etc.

Adding each of these is a one-line constraint inside `canPlace` (or a
small new function), but the *modeling* — what does this real-world rule
mean precisely, and how does it interact with the rest? — is genuinely new
work. **That is the contribution.** The solver is a commodity; the
constraint catalog is the research.

---

## 8. The Pattern Across Variations 1–4

| Variation | Row is               | Pick per row                        | Output dimension |
| --------- | -------------------- | ----------------------------------- | ---------------- |
| 1         | a course             | a section                           | 1 |
| 2         | a section (fixed)    | a professor                         | 1 |
| 3         | a subject demand     | (slot, professor)                   | 2 |
| 4         | a subject demand     | (slot, professor, room) + students  | 3 + downstream |

Each step bolts on a new resource, a new no-double-booking constraint, and
in variation 4 a downstream second-pass.
