# Variation 2 — Professor Assignment (schedules fixed)

## The Problem in One Sentence

> *Given a fixed list of timeslotted sections and a roster of professors with
> availabilities and teachable subjects, assign at most one professor to each
> section so that no professor is double-booked, every assignment respects
> the professor's availability, and as many sections as possible are covered.*

```
variation_2/
├── README.md
├── objects.js                    # TimeBlock, Section, Professor, Assignment
├── functions.js                  # eligibility, conflict, the backtracker
├── main.js                       # Driver: load JSON -> assign -> print
├── package.json
└── samples/
    ├── sections.json
    └── professors.json
```

```bash
cd variation_2 && node main.js
```

---

## 1. The Primitives

| Struct       | Holds                                              |
| ------------ | -------------------------------------------------- |
| `TimeBlock`  | `{ days, startTime, endTime }` (minutes-from-midnight) |
| `Section`    | `{ id, subjectCode, subjectName, time }` — already scheduled |
| `Professor`  | `{ id, name, availability, teachableSubjects, loadCap }` |
| `Assignment` | `{ map: Map<sectionId, profId>, unassigned[] }`    |

The professor differs from a Section only by carrying *multiple* time-blocks
(an availability calendar) instead of one.

---

## 2. Why This is a Different Algorithm From Variation 1

Variation 1's problem was **"pick one section per course"** — a row in a
table. Here, the rows are fixed; we pick a **column** (a professor) for each
row, and a column can be used multiple times (up to its `loadCap`).

In math-class terms: variation 1 is a **Cartesian product with a feasibility
filter**. Variation 2 is a **maximum bipartite b-matching** — sections on one
side, professors on the other, an edge for every (section, prof) pair where
the prof is qualified and available, and we want to cover as many sections
as possible without violating prof capacity or double-booking the same prof
on overlapping times.

---

## 3. The Algorithm: Backtracking with Branch-and-Bound

This is one step richer than variation 1's pure backtracking:

1. **Pre-compute eligibility.** A prof is *eligible* for a section iff she's
   qualified (`isQualified`) AND her availability contains the section's
   time-block (`isAvailableFor`). This filters the bipartite graph before
   we search.
2. **Order sections fewest-options-first.** Sections with the fewest
   eligible profs go to the front. Failing fast prunes the most.
3. **DFS with two branches per section:**
   - **A — Try each eligible prof** that doesn't double-book this prof and
     keeps her under `loadCap`. Recurse.
   - **B — Leave this section unassigned.** Recurse.
4. **Prune by upper bound.** At any depth, the best we could possibly do is
   `partial.size + remaining`. If that can't beat the best assignment found
   so far, abandon the branch.

That last step is the **branch-and-bound** twist. It's what lets the
algorithm scale past toy size: instead of exploring every leaf, it cuts off
whole subtrees the moment they're provably suboptimal.

```
recurse(depth):
    if partial.size + (n - depth) <= bestSoFar:    ← bound
        return
    if depth == n:
        if partial.size > bestSoFar: record it
        return

    sec = ordered[depth]

    for prof in professors:                        ← branch A
        if canTake(prof, sec, partial):
            assign and recurse, then unassign

    recurse(depth + 1)                             ← branch B (skip)
```

The "skip" branch is what makes this a *maximization* search rather than a
"find any valid total assignment" search. We allow imperfect coverage and
record the best partial assignment we ever construct.

---

## 4. Walk-Through with the Sample Data

The sample has **6 sections** and **4 professors**. The fewest-options
heuristic puts `CIS3320-1` first (only Dr. Santos can teach Networking II)
and `MATH2010-1` near the front (only Drs. Cruz and Lim can teach Calculus).
The search settles on:

| Section      | Time                  | Prof        |
| ------------ | --------------------- | ----------- |
| CIS3100-1    | MW 8:00 AM            | Dr. Reyes   |
| CIS3100-2    | TTh 10:00 AM          | Dr. Cruz    |
| CIS3320-1    | MW 10:00 AM           | Dr. Santos  |
| CIS2103-1    | TTh 8:00 AM           | Dr. Cruz    |
| CIS2103-2    | MW 1:00 PM            | Dr. Santos  |
| MATH2010-1   | TTh 1:00 PM           | Dr. Lim     |

All 6 covered. To stress the algorithm, drop Dr. Cruz's `loadCap` to 1 and
re-run — the search will be forced to leave one CIS3100 or CIS2103 section
unassigned.

---

## 5. Complexity

- **Worst case:** with `n` sections and `m` profs, `O(m^n)` — exponential.
- **What makes it tractable in practice:**
  - Eligibility pre-filter shrinks the average branching factor below `m`.
  - Fewest-options ordering puts the bottleneck variables first.
  - The upper-bound prune kills entire subtrees.

For "real" school-sized inputs (say, 200 sections × 50 profs) this approach
*will* time out and you'll want to swap in a different solver (see
alternatives below). But at the scale where you're learning and debugging
constraints, you can prove the algorithm is correct by exhaustion.

---

## 6. Other Approaches (briefly)

Each could be a `variation_2_<letter>/` sub-folder using the same primitives:

| Approach | When | Sketch |
| --- | --- | --- |
| **Hungarian algorithm** | 1-prof-per-section, 1-section-per-prof, a cost matrix | Build an `n × m` cost matrix where `cost[i][j]` is `+∞` if ineligible and a preference score otherwise. Hungarian runs in `O((n+m)³)`. Doesn't natively handle `loadCap > 1`; you have to duplicate prof rows. |
| **Min-cost max-flow** | `loadCap > 1` and you have soft preferences | Source → each prof (capacity = `loadCap`) → each eligible section (cap 1, cost = preference) → sink. The max-flow saturates as many sections as possible; the min-cost tiebreaks by preference. |
| **Integer Linear Programming** | Many soft constraints, large catalog | `x_{p,s} ∈ {0,1}`. Constraints: `Σ_p x_{p,s} ≤ 1` per section, `Σ_s x_{p,s} ≤ loadCap_p` per prof, `x_{p,s_i} + x_{p,s_j} ≤ 1` for every conflicting `(s_i, s_j)`. Maximize `Σ x_{p,s}`. |
| **Constraint Programming (CP-SAT)** | Easiest to express, scales surprisingly well | Each section is a variable whose domain is the list of eligible prof-ids (plus a sentinel "unassigned"). `AllDifferent` over pairs of conflicting sections. `Count` for load caps. OR-Tools handles the rest. |
| **Greedy + local search** | You want fast, "good enough" | Sort sections fewest-options-first, greedily pick the eligible prof with the lowest current load. Then swap pairs to fix double-bookings. |

---

## 7. Where to Read

1. `objects.js` — the four structs.
2. `functions.js` top — time math (same as variation 1).
3. `functions.js` middle — `isEligible` and `canTake`. **Note** the split:
   `isEligible` is static (depends only on prof + section), `canTake` is
   *contextual* (depends on the partial assignment so far). Recognizing
   which constraints are static vs. dynamic is half the battle in
   timetabling.
4. `functions.js` bottom — `assignProfessors`. Read the bound check first,
   then the two branches.
