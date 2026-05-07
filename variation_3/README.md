# Variation 3 — Joint Schedule + Professor Generation

## The Problem in One Sentence

> *Given a list of subjects that must be offered (each needing some number of
> sections), a roster of professors with availabilities and teachable
> subjects, and a fixed grid of allowable timeslots, produce a set of
> sections — each tagged with a slot AND a professor — such that no
> professor is double-booked, every section honors its professor's
> availability, and as many subject-section demands as possible are met.*

```
variation_3/
├── README.md
├── objects.js                    # TimeBlock, Slot, Subject, Professor, Offering, Timetable
├── functions.js                  # eligibility, conflict, the backtracker
├── main.js
├── package.json
└── samples/
    └── input.json
```

```bash
cd variation_3 && node main.js
```

---

## 1. The Primitives

| Struct       | Holds                                           |
| ------------ | ----------------------------------------------- |
| `TimeBlock`  | `{ days, startTime, endTime }`                  |
| `Slot`       | `{ id, time }` — one entry in the master grid   |
| `Subject`    | `{ code, name, sectionsNeeded }`                |
| `Professor`  | `{ id, name, availability, teachableSubjects, loadCap }` |
| `Offering`   | `{ subjectCode, slotId, profId }` — one produced section |
| `Timetable`  | `{ offerings, missingSubjects }`                |

The output `Offering` is the new shape: each row is a triple, not a pair.

---

## 2. What's Genuinely New vs. Variation 2

Variation 2 picked **one unknown** per row (a professor; the time was
fixed). Variation 3 picks **two unknowns** per row — a slot AND a professor
— and the candidate set is now a *Cartesian product*:

```
candidates(subject) = { (slot, prof) | prof qualified for subject
                                       AND prof available in slot }
```

That's the only structural change. The search shape, the
fewest-candidates-first heuristic, the upper-bound prune, and the
"skip"-branch trick all carry over verbatim from variation 2.

There's one new contextual constraint — `subjectAlreadyInSlot`. We don't
allow placing two sections of the same subject in the same slot, since they
would be indistinguishable from the student's perspective.

---

## 3. The Algorithm: Backtracking with Branch-and-Bound

1. **Expand demands.** A subject that needs 2 sections becomes 2 separate
   "rows to fill".
2. **Order demands fewest-candidates-first.** A subject only one prof can
   teach goes first.
3. **DFS.** For each demand, try every (slot, prof) candidate; recurse;
   plus a skip-branch for "leave this demand unfulfilled".
4. **Prune.** If `partial.length + remaining ≤ bestCount`, abandon.

Pseudocode:

```
recurse(depth):
    if partial.length + (n - depth) <= bestCount:    ← prune
        return
    if depth == n:
        record best
        return

    subject = demands[depth].subject

    for (slot, prof) in candidatePairs(subject):
        if canPlace(subject, slot, prof, partial):
            push Offering(subject, slot, prof)
            recurse(depth + 1)
            pop

    recurse(depth + 1)                               ← skip-branch
```

`canPlace` checks three contextual things: prof not over `loadCap`, prof not
already busy at any time-conflicting slot, and no duplicate (subject, slot)
pair.

---

## 4. Walk-Through with the Sample Data

The sample asks for 6 sections (`CIS3100×2, CIS3320×1, CIS2103×2,
MATH2010×1`). Bottleneck subjects: `CIS3320` (only Dr. Santos), `MATH2010`
(only Drs. Cruz and Lim). Solution found:

| Subject  | Slot           | Prof       |
| -------- | -------------- | ---------- |
| CIS3320  | MW 10:00 AM    | Dr. Santos |
| CIS3100  | MW 8:00 AM     | Dr. Reyes  |
| CIS3100  | MW 10:00 AM    | Dr. Reyes  |
| MATH2010 | TTh 8:00 AM    | Dr. Cruz   |
| CIS2103  | TTh 10:00 AM   | Dr. Cruz   |
| CIS2103  | MW 1:00 PM     | Dr. Santos |

Note Dr. Reyes teaches two consecutive MW sections — that's allowed (no time
conflict, within `loadCap = 2`). Note also that the algorithm chose
*different* slots for the two CIS3100 sections, satisfying
`subjectAlreadyInSlot`.

To stress-test: bump `CIS3100.sectionsNeeded` to 3. There are only two
M/W-morning slots Dr. Reyes can use, and Dr. Cruz already takes a TTh slot
for MATH2010, so the algorithm should report 1 missing CIS3100 section.

---

## 5. Complexity

- **Worst case:** with `n` demands, `s` slots, `p` profs, `O((s·p)^n)`.
- **In practice:** the eligibility filter usually drops the per-demand
  branching to a small handful, and bounding kills the rest.

The state space is genuinely larger than variation 2 (an extra factor of
`s` per row), so this is the first variation where the choice of heuristic
*matters*. Try inverting the demand order — sort fewest-candidates **last**
— and watch the runtime explode.

---

## 6. Other Approaches (briefly)

| Approach | When | Sketch |
| --- | --- | --- |
| **CP-SAT (constraint programming)** | The natural fit. Easy to express, scales well. | One variable per demand, domain = list of `(slot, prof)` candidate ids. Conflict constraint per pair of demands sharing a prof in time-overlapping slots. `Element` constraints for slot/prof lookups. |
| **Integer Linear Programming** | If you want a proven optimum + soft objectives | `x_{d, s, p} ∈ {0,1}` for every (demand, slot, prof) candidate. `Σ_{s,p} x_{d,s,p} ≤ 1` per demand. Conflict: for every pair of demands and every pair of conflicting `(s_i, s_j)`, `x_{d_1,s_1,p} + x_{d_2,s_2,p} ≤ 1`. Maximize `Σ x`. |
| **Iterated local search / simulated annealing** | Real-school sizes (hundreds of demands) | Random initial assignment, repeatedly swap (slot, prof) for one demand, accept if better or with cooling probability. The ITC-2007 winners used this family. |
| **Column generation** | Very large catalogs; the LP relaxation is huge | Generate "schedule patterns" per professor on the fly; master problem picks which patterns to use. Out of scope here. |
| **Decompose: schedule first, then assign** | When the two unknowns are loosely coupled | Run a variation-1-style slot generator per subject (no profs), then run variation-2's matcher on the results. Faster but can miss solutions where slot choice depends on prof availability. |

---

## 7. The Pattern Across Variations 1–3

Each variation **adds one unknown per row**:

| Variation | Row is               | Pick per row              |
| --------- | -------------------- | ------------------------- |
| 1         | a course             | a section                 |
| 2         | a section (fixed)    | a professor               |
| 3         | a subject demand     | a (slot, professor) pair  |

Each added unknown multiplies the per-row branching factor and adds one
contextual constraint (no double-booking on the new dimension). The
*algorithm* doesn't change much — the *domain* of the variable does.
