---
description: "Run hypothesis-driven research with git branching and evidence gathering"
argument-hint: "[--file hypothesis.md] [--cycles N] [--output-dir DIR] [--model MODEL]"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator.mjs hypothesis:*)"]
---

# Think Tank — Hypothesis Mode

Run hypothesis-driven research using git branches for isolated exploration.

If $ARGUMENTS is provided, use it directly:

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator.mjs" hypothesis $ARGUMENTS
```

If $ARGUMENTS is empty, check for a `hypothesis.md` file in the current directory. If it exists, use it. If not, tell the user to create one using the template at `${CLAUDE_PLUGIN_ROOT}/hypothesis-template.md`.

## What happens

Per cycle (default: 1 cycle):
1. **RESEARCHER** — explores codebase on a dedicated git branch, gathers evidence (uses Read/Grep/Write tools)
2. **VERIFIER** — validates researcher claims on a separate branch, runs independent checks (uses Read/Grep/Write tools)
3. Repeat for N cycles if specified

After all cycles:
4. **REPORT** — synthesizes findings into confirm/reject/pivot recommendation with evidence

## Git branching

Each agent works on an isolated branch (`hypothesis/researcher-c1-<ts>`, `hypothesis/verifier-c1-<ts>`). Your original branch is always restored after each step.

## Prerequisites

- A `hypothesis.md` file (use `--file` to specify path, defaults to `./hypothesis.md`)
- Git repository (for branch isolation)

## Output

Two files created in `--output-dir` (or alongside hypothesis.md):
- `hypothesis-log-YYYY-MM-DD-HHmmss.md` — full research + verification log
- `hypothesis-report-YYYY-MM-DD-HHmmss.md` — final recommendation
