# Study Guide — Timetabling, with a Mathematician's Rigor

This document is two things at once:

1. **A reading list** for timetabling specifically — books, surveys,
   benchmark suites, and seminal papers, with notes on what each one is
   actually for.
2. **A method for reading algorithm papers** when your goal is to understand
   them the way a math major would: as a sequence of definitions, claims,
   and proofs, not as a tutorial.

The two go together. The reading list won't help if you skim it; the
method needs material to chew on.

---

## Part 1 — Why timetabling has so much room for novelty

A useful frame from the operations-research community:

> A solver is generic. A *model* is local.

Mainstream solvers (CP-SAT, Gurobi, CPLEX, simulated annealing libraries)
will never get a paper to themselves anymore — they're commodities. What
gets papers, theses, and grants is **modeling work**: precisely encoding a
real institution's constraints in a way the solver can chew on, then
showing it solves at scale.

Two implications:

- **The Philippine educational system** is genuinely understudied. Block
  sections, irregular students, CHED faculty-load policies, building
  travel times, brownout-resilient scheduling, religious-observance
  windows — almost none of these appear in the international literature in
  the form they take here. Encoding even one of them well is a
  contribution.
- **You don't need a new algorithm to write a paper.** "We modeled
  University X's curriculum-locking constraint as Y, here's how the
  benchmarks change" is a publishable shape.

This is what your professor probably means when she treats algorithms like
math: she's looking past the procedure at the **structure** — what is the
state space, what are the invariants, what do you prove about them, and
what is genuinely new versus restated.

---

## Part 2 — A reading list, ordered by what to read first

### A. Foundational textbooks (read once, return often)

1. **Cormen, Leiserson, Rivest, Stein — *Introduction to Algorithms* (CLRS).**
   Chapters on dynamic programming, greedy, NP-completeness, network flow,
   and branch-and-bound. Treat the chapters on *amortized analysis* and
   *greedy correctness proofs* as the core of the rigor you want to absorb.
2. **Kleinberg & Tardos — *Algorithm Design*.**
   Different flavor than CLRS. Strong on **modeling**: turning a real
   problem into a formal one. Chapter 2 (basics) and chapter 7 (network
   flow) are gold for timetabling.
3. **Papadimitriou — *Computational Complexity*.**
   Once you're comfortable, read this for what NP-hard *means* precisely —
   not just "hard," but a structural claim about reductions. Timetabling
   is NP-hard via reduction from graph coloring; understanding that
   reduction is its own little proof, and the structure of the proof tells
   you which constraints make instances harder.
4. **Schrijver — *Combinatorial Optimization: Polyhedra and Efficiency*** *(reference, not cover-to-cover)*.
   The encyclopedia of LP/ILP/matching. You will not read this front-to-back;
   you will look up what you need.

### B. Combinatorial-optimization tooling (the practical cousins)

5. **Wolsey — *Integer Programming*.**
   How to *think* in 0/1 variables. After reading this, the ILP
   formulations sketched in the variation READMEs will look obvious.
6. **Rossi, Van Beek, Walsh (eds.) — *Handbook of Constraint Programming*.**
   The CP perspective. Constraint propagation, AC-3, global constraints
   like `AllDifferent` and `Cumulative` (which appears all over
   timetabling), backjumping, and learning. Chapters 1–6 are enough to
   start.
7. **Hooker — *Integrated Methods for Optimization*.**
   How CP and ILP combine. This becomes relevant the moment your
   variations stop fitting cleanly into one paradigm.

### C. Timetabling-specific (this is the actual research literature)

8. **Schaerf, A. (1999) — *A survey of automated timetabling*.**
   *Artificial Intelligence Review*, 13(2), 87–127.
   The classical entry-point survey. Old but still cited. Read it first
   for vocabulary: "school timetabling" vs. "university course
   timetabling" vs. "examination timetabling."
9. **Burke, McCollum, Meisels, Petrovic, Qu (2007) — *A graph-based hyper-heuristic for educational timetabling problems*.**
   *EJOR*, 176(1), 177–192.
   Where the hyper-heuristic idea takes hold. Useful for understanding why
   "which heuristic to apply" itself becomes a search problem.
10. **Müller, T. — *ITC2007 solver description*** (and surrounding papers).
    The **International Timetabling Competition** in 2002, 2007, and 2019
    is the de-facto benchmark suite. Müller's solver and write-ups are the
    most readable account of what real-system timetabling looks like.
11. **Lewis, R. (2008) — *A survey of metaheuristic-based techniques for university timetabling problems*.**
    *OR Spectrum*, 30(1), 167–190.
    SA, tabu, GA — when each one wins, when each fails. Read this before
    deciding what algorithm fits a new constraint.
12. **Bettinelli, Cacchiani, Roberti, Toth (2015) — *An overview of curriculum-based course timetabling*.**
    *TOP*, 23(2), 313–349.
    The closest survey to what your variations 3 and 4 are doing. Strong
    on ILP formulations.
13. **Pillay, N. (2014) — *A survey of school timetabling research*.**
    *Annals of Operations Research*, 218(1), 261–293.
    For the K-12 angle. Block-section-heavy schools (which much of the
    Philippine system is) are closer to school-timetabling than to
    university-course-timetabling in algorithm shape.

### D. Standards, benchmarks, and data formats

14. **XHSTT — XML High School Timetabling format.**
    The widely-adopted instance format from ITC2011. Worth understanding
    even if you don't use it directly: it tells you what real instances
    contain. Resource pools, events, role pools, time-pool group constraints.
15. **PATAT** (Practice and Theory of Automated Timetabling).
    A biennial conference with proceedings. Search Google Scholar for
    "PATAT 2022", "PATAT 2024" — these are the freshest results.

### E. For the math-rigor side specifically

16. **Polya — *How to Solve It*.**
    Slim, decades-old. Still the best book on what it means to *understand*
    a problem before solving it. Read it twice.
17. **Velleman — *How to Prove It*.**
    If proofs feel like a foreign language. Sets, logic, induction,
    contradiction. Pair with CLRS's correctness proofs.
18. **Lakatos — *Proofs and Refutations*.**
    A philosophy book disguised as math. Once you've read it, you'll never
    again accept a definition without asking what it excludes. This is the
    mindset your professor likely has.

---

## Part 3 — How to read an algorithm paper

A paper is not a textbook. It is a **claim plus a proof plus an
experiment**, packaged for an expert audience. You read it differently.

### Three passes

This is Keshav's three-pass method, slightly adapted.

#### Pass 1 — *Is this paper worth my time?* (10 minutes)

Read only:
- title, abstract, intro,
- section headings,
- the conclusions,
- the references (skim).

Answer: what problem is the paper solving, what's its claimed contribution,
and is the contribution one I care about? If no, stop.

#### Pass 2 — *What does the paper actually say?* (1 hour)

Read the body, **but skip proofs**. Read every figure caption carefully —
papers cheat in the prose and tell the truth in the figures. Note the
key definitions on a separate piece of paper. By the end you should be
able to:

- restate the algorithm in one paragraph,
- restate the main theorem in one sentence,
- list the constraints and assumptions the paper makes that the abstract
  did not.

#### Pass 3 — *Why does this work, and where would it break?* (3+ hours)

Now go back and read the proofs. **Try to re-derive each lemma yourself
before reading the paper's version.** This is the math-major move. If
you cannot, the gap between your derivation and the paper's is exactly
what you don't understand yet.

For an experimental paper: re-implement the smallest version on a single
instance and reproduce one number from a table. If you can't, the paper
is hiding something or you misread something — both are useful to discover.

### The five questions, before pass 3

Hold these five questions in your head. The paper isn't done until you
can answer them.

1. **What is the formal object?**
   Not "the algorithm." The *object*. Is it a graph? A bipartite graph?
   A constraint network? A set of integer variables? Until you can name
   the object precisely, you don't have a foothold.
2. **What invariants are preserved?**
   What's true at the start of every loop iteration / every recursive
   call / every constraint propagation? In timetabling, an invariant
   might be: "no prof in `partial` is double-booked." Knowing the
   invariant is half the proof.
3. **What does termination look like?**
   What strictly decreases (or strictly increases bounded above) on every
   step? "Depth in the search tree" is the answer 80% of the time.
   Naming it lets you bound runtime.
4. **What changes if I add a constraint?**
   This is *the* question for timetabling. Pick one constraint the paper
   handles. Now imagine an additional one — block sections, say. Does
   the algorithm still work? If so, with what runtime change? If not,
   what breaks? This is where novelty hides.
5. **What is the smallest counterexample to the obvious greedy?**
   For every algorithm more sophisticated than greedy, there's a small
   instance the greedy fails on. Find it. It will teach you what the
   sophistication is *for*.

### Notation as a friend, not a barrier

OR papers are heavy on notation. Three habits help:

- **Make a glossary.** First time you see `x_{c,s,t}`, write down on
  paper "1 if course c is scheduled in slot s on day t, else 0."
  Reuse the same glossary across papers — most use overlapping notation.
- **Read formulas aloud.** "Sum over `s` of `x_{c,s} = 1`" reads as
  *"every course is assigned exactly one section"*. The English version
  is the constraint; the symbols are the encoding.
- **Box the quantifiers.** `∀c ∃s` and `∃s ∀c` are different sentences.
  When you misunderstand a theorem, 80% of the time you misread a quantifier.

### Ritual for a hard paper (stolen from grad-school habits)

- **Print it.** Pen in hand. Mark it up.
- **One paper per week, two passes minimum.** Better one paper deeply than
  five papers shallowly.
- **Write a summary in your own words** — even just a paragraph — after
  pass 2. If you can't, you didn't read it.
- **Discuss with someone.** Even out loud to nobody. The act of having
  to defend a reading exposes the gaps.

---

## Part 4 — A Suggested Order Through This Repository

1. Run all four `variation_N` folders. Read each README in order. The
   pattern across them (one new resource per variation, one new
   no-double-booking constraint) is the spine.
2. Read **Schaerf 1999** (#8 above) for vocabulary.
3. Pick one Philippine-context constraint from the list at the bottom of
   `variation_4/README.md`. Sketch how it would change `objects.js` and
   `canPlace` in variation 4. Don't implement yet — write it down formally.
4. Read **Bettinelli et al. 2015** (#12). Compare the ILP formulation
   there to your variation 3 / 4 backtracker. Which constraints translate
   one-to-one? Which don't?
5. Implement your chosen constraint as `variation_5/`. Use the same
   structure (objects, functions, main, README, samples). Include in the
   README: what was modified, what's the new state space, where does the
   solver still terminate, where does it stop being tractable.
6. **That sequence is a paper.** Polish the README into an introduction +
   model + algorithm + experiments section, and you have a workshop draft.

---

## Part 5 — Notes on absorption

You're right that this isn't the kind of material you read verbatim and
practice. Three small habits make it stick:

- **Re-derivation, not re-reading.** When something feels familiar, close
  the page and re-derive from scratch. Familiarity isn't understanding.
- **Spaced revisits.** Re-open Schaerf 1999 in two weeks. You'll see
  things you missed. Re-open it in two months. Same.
- **Implement the lemma.** When a paper proves "this property holds at
  every iteration," write a debug assert that checks it. If your code
  ever trips it, you've found either a bug or a misunderstood proof.
  Both are wins.

The math major's instinct is to *not move on* until each definition is
airtight. That instinct is correct. It feels slow. It is not slow — it is
the only thing that produces the kind of work she'd respect.
