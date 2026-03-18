---
description: "Consult Codex and/or Claude side-by-side with optional arbiter synthesis"
argument-hint: "--topic \"question\" [--target codex|claude|both] [--arbiter] [--max-budget-usd N]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/bin/think-tank cross-agent:*)", "Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator.mjs cross-agent:*)"]
---

# Think Tank — Cross-Agent Mode

Delegate a question between Claude Code CLI and Codex CLI.

If $ARGUMENTS is provided, use it directly:

```!
"${CLAUDE_PLUGIN_ROOT}/bin/think-tank" cross-agent $ARGUMENTS
```

If $ARGUMENTS is empty, ask the user for the question and run the same command with `--topic "..."`.

## Targets

- `--target codex` (default): ask Codex only
- `--target claude`: ask Claude only
- `--target both`: ask both and return side-by-side
- `--target both --arbiter`: both + synthesis pass

## Safety Defaults

- Codex runs with `--sandbox read-only`
- Claude runs with `--no-session-persistence`
- Claude budget cap defaults to `--max-budget-usd 0.50`
- Recursion blocked by `CROSS_AGENT_HOP=1`

## Output

Creates one file in `cross-agent/` (or `--output-dir`):
- `cross-agent-YYYY-MM-DD-HHmmss.md`
