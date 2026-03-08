---
description: "Run diverge-challenge-synthesize ideation on a topic or document"
argument-hint: "<topic-or-file> [--output-dir DIR] [--model MODEL]"
allowed-tools: ["Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator.mjs brainstorm:*)"]
---

# Think Tank — Brainstorm Mode

Run multi-agent brainstorming on a topic or document.

If $ARGUMENTS is provided, use it directly:

```!
node "${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator.mjs" brainstorm $ARGUMENTS
```

If $ARGUMENTS is empty, ask the user what topic they want to brainstorm, then run the command above with their answer.

## What happens

Three agents collaborate in sequence:
1. **DIVERGER** — generates 5+ ideas with implementation sketches and feasibility assessments
2. **CHALLENGER** — stress-tests each idea: hidden assumptions, failure modes, better alternatives
3. **SYNTHESIZER** — ranks top 3 ideas with pros/cons and a final recommendation

## Input

Accepts either:
- A **file path** — reads the file as context for brainstorming
- A **topic string** — uses the text directly (e.g., `"API design for auth service"`)

## Output

One file created in `--output-dir` (or current directory):
- `brainstorm-YYYY-MM-DD-HHmmss.md` — all 3 phases combined
