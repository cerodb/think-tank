---
description: "Run adversarial debate to stress-test and improve a document"
argument-hint: "<file-path> [--rounds N] [--output-dir DIR] [--model MODEL]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/bin/think-tank debate:*)", "Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator.mjs debate:*)"]
---

# Think Tank — Debate Mode

Run multi-agent adversarial debate on the specified document.

If $ARGUMENTS is provided, use it directly:

```!
"${CLAUDE_PLUGIN_ROOT}/bin/think-tank" debate $ARGUMENTS
```

If $ARGUMENTS is empty, ask the user which file they want to analyze, then run the command above with their answer.

## What happens

The tool runs multiple Claude instances in structured opposition:
1. **CRITIC** — finds every weakness, gap, and risk (6 mandatory attack vectors)
2. **DEFENDER** — defends what's solid, concedes what's valid, proposes fixes
3. Repeat for N rounds (default: 2)
4. **SYNTHESIZER** — produces an improved version incorporating the best of both sides
5. **DIFF EVALUATOR** — checks the improved version for regressions

## Output

Three files are created in `<input-dir>/adversarial/` (or `--output-dir`):
- `debate-YYYY-MM-DD-HHmmss.md` — full transcript (saved incrementally for crash recovery)
- `improved-YYYY-MM-DD-HHmmss.md` — improved document
- `diff-eval-YYYY-MM-DD-HHmmss.md` — regression check

## Tips
- The debate transcript is often more valuable than the improved doc
- If diff-eval shows many LATERAL/REGRESSION changes, prefer the original + critic insights
- Default 2 rounds is usually enough; 3+ shows diminishing returns
- Works on any text document: specs, architecture, proposals, research, etc.
