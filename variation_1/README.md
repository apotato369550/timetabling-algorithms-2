# Variation 1 — Backtracking Schedule Generator

A small, self-contained version of the Enrollmate scheduler. Given a list of
courses (each with several possible sections) and a few user constraints, it
returns every conflict-free way to register for one section of every course.

```
variation_1/
├── objects.js                    # Plain-class structs (data only)
├── functions.js                  # Pure functions: parsing, conflict, search
├── main.js                       # Driver: load CSV -> generate -> print
├── package.json
└── samples/
    └── cs-student-schedule.csv   # Example course catalog
```

Run it:

```bash
cd variation_1
node main.js
```

---

## 1. The Problem in One Sentence

> *You have N courses. Each course offers a few sections (different timeslots).
> Pick exactly one section per course such that no two picks overlap in time,
> and they all fit inside the user's preferred window.*

That's it. Everything else (status flags, the at-risk rule, the "no more than
one full section" cap) is just **extra constraints layered on top** of that
core question.

---

## 2. The Primitives

Every algorithm in this folder is built out of five plain data structs in
`objects.js`:

| Struct        | What it is                                        |
| ------------- | ------------------------------------------------- |
| `ParsedTime`  | `{ days, startTime, endTime }` in minutes-from-midnight |
| `Section`     | One row of the CSV — a specific offering of a course |
| `Course`      | A bag of `Section`s that share a course code      |
| `Constraints` | The user's filters (window, caps, flags)          |
| `Schedule`    | One valid result — one Section per Course + meta  |

No methods on the structs. All behavior lives in `functions.js`, top-to-bottom
in order of "smallest primitive first":

```
hhmmToMinutes  clockToMinutes  minutesToClock
        │
        ▼
parseDays  parseSchedule  ensureParsed
        │
        ▼
isFull  isAtRisk  isViable
        │
        ▼
timesOverlap  shareAnyDay  hasConflict
        │
        ▼
buildMeta
        │
        ▼
generateSchedules    ← the main algorithm
```

If you read the file from top to bottom, every function only depends on the
ones above it.

---

## 3. The Algorithm: Backtracking

The generator (`generateSchedules` in `functions.js`) is **depth-first search
with pruning**. It runs in two phases.

### Phase 1 — Pre-filter ("constraint propagation")

Before searching anything, walk every section of every course and throw out
the ones that *can never appear in any valid schedule*:

- Outside the user's time window? Drop it.
- Section is FULL and the user said no full sections? Drop it.
- AT-RISK and the user said no at-risk sections? Drop it.

If a course is left with **zero** viable sections, we're done — no schedule
exists. Return `[]`.

This step is cheap and shrinks the search tree massively. Without it, the
search would waste time exploring branches that are doomed at the first
conflict check.

### Phase 2 — The recursive search

We have an ordered list of "buckets" (one bucket per course, each containing
that course's surviving sections). A `picked` array starts empty. At depth
`i` we are choosing a section for course `i`.

```
recurse(depth):
    if results is full           → stop
    if depth == buckets.length   → we picked one section per course → save it
    for each candidate in buckets[depth]:
        if candidate conflicts with anything already in `picked`: skip
        push candidate
        recurse(depth + 1)
        pop candidate                  ← this is the "backtrack"
```

The "backtrack" is the magic word. When recursion returns, we **undo** the
last pick and try the next candidate at this depth. That single push/pop
turns one `picked` array into a tour of every leaf in the tree.

### Why backtracking and not brute force?

Brute force would be: enumerate all `|sections₁| × |sections₂| × ... ×
|sections_N|` combinations, then filter. With 5 courses × 3 sections each
that's only 243, no big deal. With 8 courses × 5 sections each, it's 390,625
— and most of those combinations clash on the very first pair.

Backtracking checks for clashes **as soon as the second pick is made**, so a
bad first pick prunes an entire subtree of `5 × 5 × 5 × 5 × 5 × 5` doomed
combinations in one stroke. Same correctness, dramatically less work.

### The conflict check

Two sections conflict iff:
1. they share at least one day of the week, **AND**
2. their time intervals overlap.

The interval-overlap test is the one trick worth memorizing:

```
[a.start, a.end) and [b.start, b.end) overlap  ⇔  a.start < b.end  AND  b.start < a.end
```

Picture it:

```
conflict:        no conflict (gap):       no conflict (touching):
A: |-----|       A: |-----|               A: |-----|
B:   |-----|     B:        |-----|        B:       |-----|
```

That's `timesOverlap` in `functions.js`. The whole conflict module is six
lines of real code.

### Complexity

- **Worst case:** `O(∏ |sections_i|)` — same as brute force.
- **In practice:** the pre-filter and on-the-fly conflict pruning cut this
  down to "fast enough that you won't notice" for any realistic catalog.
- Plus there's a hard cap (`constraints.maxSchedules`) that lets the search
  bail out as soon as we have enough results to show the user.

---

## 4. Other Approaches (for context)

Backtracking is great here because:
- The state space is small.
- Constraints are simple to check incrementally.
- We want **all** solutions (or at least many), not just one optimal one.

But it's not the only way. If the problem grew teeth — thousands of sections,
soft preferences with weights, cross-student fairness — you'd reach for one
of these instead. Each could become its own `variation_N/` folder.

| Approach | When it shines | Sketch |
| --- | --- | --- |
| **Branch-and-Bound** | Finding the *single best* schedule under a scoring function | Backtracking + an upper-bound estimate; prune any branch whose best-possible score is worse than the best found so far. |
| **Integer Linear Programming (ILP)** | Hard constraints + a linear objective, large catalogs | Variables `x_{c,s} ∈ {0,1}` (pick section `s` of course `c`). Constraint: `Σ_s x_{c,s} = 1` per course. Conflict constraint: `x_{c1,s1} + x_{c2,s2} ≤ 1` for every conflicting pair. Hand it to a solver (CBC, Gurobi). |
| **Constraint Satisfaction (CSP)** | Many interacting constraints, you want a generic engine | Each course is a variable, sections are its domain, `hasConflict` is the binary constraint. AC-3 + backjumping does the rest. |
| **Dynamic Programming** | When subproblems repeat (e.g., scheduling per day, then merging) | Build day-by-day partial schedules, memoize on `(day, set-of-used-time-slots)`. Useful only if the time grid is discrete and small. |
| **Genetic / Simulated Annealing** | Soft preferences, "good enough" is fine, big search space | Encode a schedule as a chromosome (one gene per course = section index). Fitness = penalty for conflicts + bonus for preferences. Mutate, crossover, iterate. |
| **Greedy + Local Search** | Quick first cut, then polish | Pick the most constrained course first (fewest viable sections), greedy-fill the rest, then swap pairs to repair conflicts. |

Each plugs into the *same primitives* (`Section`, `Course`, `Constraints`,
`hasConflict`, `isViable`). That's the point of keeping the structs and the
algorithm separate — the data layer stays put, only the search strategy
changes.

---

## 5. Where to Read in Order

If you're new to the code, read in this order:

1. `objects.js` — what the data looks like. (~60 lines.)
2. `functions.js` top half — the small primitives (parsing, time math).
3. `functions.js` middle — `hasConflict`, `isViable`.
4. `functions.js` bottom — `generateSchedules`. The algorithm is ~25 lines
   once you understand the helpers.
5. `main.js` — see it actually run.

---

## 6. Sample Run

`main.js` loads `samples/cs-student-schedule.csv`, asks for four courses
(`CIS 3100`, `CIS 2103`, `CIS 3210`, `MATH 2010`), and prints the first 10
valid combinations. With the default constraints it finds 10 schedules — try
tightening `latestEnd` to `13:00` and watch most of them disappear.
