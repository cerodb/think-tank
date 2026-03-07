---
description: "Show help for the adversarial debate tool"
---

# Adversarial Debate Tool — Help

Explain the following to the user:

## What is it?

A tool that runs two Claude instances in structured opposition (critic vs defender) to stress-test and improve any document. After N rounds of debate, a synthesizer produces an improved version, and a diff evaluator checks for regressions.

## Usage

```
/debate <file-path> [--rounds N] [--output-dir DIR]
```

### Examples

```
/debate specs/my-project/architecture.md
/debate docs/proposal.md --rounds 3
/debate README.md --output-dir /tmp/debate-output
```

### Options
- `--rounds N` — Number of debate rounds (default: 2). Round 3+ shows diminishing returns.
- `--output-dir DIR` — Where to save output (default: `<input-dir>/adversarial/`)

## How it works

### Round structure (per round)

1. **CRITIC** receives the document and attacks it:
   - Phase 1: Identifies document type and what "improved" means
   - Phase 2: Analyzes 6 mandatory vectors (contradictions, assumptions, feasibility, failure modes, missing perspectives, second-order effects)
   - Each criticism includes a specific failure scenario + improvement direction

2. **DEFENDER** receives the document + critique:
   - First checks: "Did the critic miss something more important?"
   - Then defends or concedes each point (concession requires 3 conditions: specific failure scenario + who's affected + likely not just possible)
   - Concrete fixes for conceded points

### After all rounds

3. **SYNTHESIZER** produces an improved document using an adjudication hierarchy for unresolved disagreements

4. **DIFF EVALUATOR** classifies each change as IMPROVEMENT / LATERAL / REGRESSION

## Output files

- `debate-YYYY-MM-DD.md` — Full transcript (saved incrementally — if the tool crashes, you still have partial debate)
- `improved-YYYY-MM-DD.md` — The improved document
- `diff-eval-YYYY-MM-DD.md` — Regression analysis

## Customizing prompts

Prompts are in `${CLAUDE_PLUGIN_ROOT}/prompts/`:
- `critic.md` + `critic-followup.md`
- `defender.md` + `defender-followup.md`
- `synthesizer.md`
- `diff-evaluator.md`

Edit these files to customize the debate behavior.

## When to use it

**Good for:** specs, architecture docs, proposals, research, strategy docs, any document that benefits from structured criticism.

**Not ideal for:** code files (use code review tools instead), very short documents (not enough substance to debate), documents you're not willing to change.
