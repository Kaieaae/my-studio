# Domain Docs

How the engineering skills should consume this repository's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repository root
- **`CONTEXT-MAP.md`** at the repository root, if it exists; it points to one `CONTEXT.md` per context
- **`docs/adr/`** for ADRs affecting the area being changed
- In multi-context repositories, relevant `src/<context>/docs/adr/` directories

If any of these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terminology or decisions are resolved.

## File structure

This repository uses the single-context layout:

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-example-decision.md
│       └── 0002-example-decision.md
└── projects/
```

The structure above documents the expected locations. This setup does not create `CONTEXT.md`, ADR files, or `docs/adr/`.

## Use the glossary's vocabulary

When output names a domain concept—in an issue title, refactor proposal, hypothesis, or test name—use the term defined in `CONTEXT.md`. Do not drift to synonyms that the glossary explicitly avoids.

If a required concept is absent from the glossary, reconsider whether the term belongs to the project or note the gap for `/domain-modeling`.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly rather than silently overriding the decision:

> Contradicts ADR-0007 (event-sourced orders), but may be worth reopening because…
