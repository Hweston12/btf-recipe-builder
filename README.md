# BTF Recipe Builder

A calculator tool that helps patients, families, and caregivers build nutritionally
complete, individualized blenderized tube feeding (BTF) recipes. No accounts, no
patient data stored — a stateless calculation and recipe-drafting tool.

## Status

Early planning + first module. See `docs/architecture-plan.md` for the full system
design, workflow outline, and example user walkthrough. The deterministic calculation
module (`packages/calculation`) is implemented and tested; nothing else is built yet.

## Repo layout

```
docs/
  architecture-plan.md      System architecture, data schema, workflow, roadmap
packages/
  calculation/               Deterministic math: prescription reconciliation,
                              water top-up, verified density, IDDSI flow test
                              interpretation. No AI dependency, fully unit tested.
```

As the frontend, API layer, and recipe-generation engine get built, they'll land as
additional folders under `packages/` (or wherever makes sense once the framework is
chosen — nothing about the current layout locks that in).

## Getting started

```bash
cd packages/calculation
npm install
npm test
```

## Key design principles (see docs/architecture-plan.md for full detail)

- Structured input over free text — the AI never sees a raw user prompt
- AI recipe generation is constrained to a pre-approved ingredient pool
- IDDSI texture level is never predicted from ingredients — always a physical test
- Nutrient values are AI-estimated and labeled as such; no clinician-verification
  tier at this stage
- No patient data stored server-side
