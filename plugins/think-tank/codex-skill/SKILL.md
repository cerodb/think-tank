---
name: ask-claude
description: Delegate a question to Claude Code CLI and return the response
---

# Ask Claude

Use Think Tank cross-agent mode to consult Claude from Codex sessions.

## Usage

Run this command with your question in `PROMPT`:

```bash
THINK_TANK_DIR="${THINK_TANK_DIR:-$HOME/ai-Projects/think-tank/plugins/think-tank}"
node "$THINK_TANK_DIR/scripts/orchestrator.mjs" cross-agent --target claude --topic "$PROMPT"
```

## Requirements

- `claude --version` works
- `node --version` is v22+
- Think Tank plugin exists locally
