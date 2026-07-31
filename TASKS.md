# TASKS.md
_Last updated: 2026-07-31_
Source of truth for build progress. Derived from the phased roadmap in
`docs/architecture-plan.md` §10 — that doc still owns *what* and *why*; this
file only tracks *is it done*. Check items off as they land; don't restate
this list in chat unless asked.

## Conventions

Before checking an item off: run relevant tests/typecheck and confirm they pass. 

At the start of a session, if asked "what's next," recommend the next
unchecked item in dependency order (not file order), with a one-line
reason, and wait for confirmation before starting.

## Phase 1 (MVP)

- [x] Calculation module (`packages/calculation`) — deterministic math, tested
- [x] Wizard intake schema + exclusion/preference precedence validator (`packages/schema`)
- [x] Wizard Step 1 — Nutrition basics (wire to `reconcilePrescription`)
- [x] Wizard Step 2 — Feeding setup
- [x] Wizard Step 3 — Safety & restrictions
- [x] Wizard Step 4 — Food preferences + practical constraints (wire `validateFoodRestrictions` against Step 3's medical restrictions)
- [x] Wizard Step 5 — Generate & review (recipe engine call + confirmation checklist)
- [x] API layer — validate/normalize wizard input server-side
- [ ] Recipe engine — constrained AI recipe generation (server-side Claude API call)
- [ ] AI-estimated nutrient display
- [ ] Status pipeline (draft → nutrient-checked → volume-confirmed → IDDSI-tested)

## Phase 2

- [ ] Validation dashboard (green/yellow/red/purple)
- [ ] Printable recipe card output
- [ ] IDDSI test recording and reminders

## Phase 3

- [ ] Multi-day recipe rotation
- [ ] "Foods already in the house" optimization mode

## Later / not currently planned

- [ ] Cronometer or other nutrient-database integration
- [ ] Accounts / saved recipes
- [ ] Clinician-facing mode
