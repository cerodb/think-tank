---
description: "Run multi-reviewer code review (bug/security/performance analysis)"
argument-hint: "<file-path> [--output-dir DIR] [--model MODEL]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/bin/think-tank review:*)", "Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator.mjs review:*)"]
---

# Think Tank — Review Mode

Run multi-agent code review on the specified file.

If $ARGUMENTS is provided, use it directly:

```!
"${CLAUDE_PLUGIN_ROOT}/bin/think-tank" review $ARGUMENTS
```

If $ARGUMENTS is empty, ask the user which file they want to review, then run the command above with their answer.

## What happens

Three specialized reviewers analyze the code independently, then a synthesizer merges findings:
1. **BUG HUNTER** — logic errors, edge cases, race conditions, off-by-ones
2. **SECURITY AUDITOR** — injection, auth bypass, data exposure, input validation
3. **PERFORMANCE ANALYST** — leaks, unbounded growth, blocking calls, caching opportunities
4. **SYNTHESIZER** — merges all findings into a prioritized action list (Critical/High/Medium/Low)

## Output

Two files are created in `--output-dir` (or alongside the input file):
- `review-YYYY-MM-DD-HHmmss.md` — synthesized prioritized findings
- `review-details-YYYY-MM-DD-HHmmss.md` — per-reviewer detailed analysis
