# Installation — Think Tank Plugin

## Requirements

- Claude Code with Max plan or API key (spawns `claude -p` subprocesses)
- Node.js 18+
- git (required for hypothesis mode)

## Steps

### 1. Copy plugin to Claude Code cache

```bash
mkdir -p ~/.claude/plugins/cache/local/think-tank/1.0.0
cp -r adversarial-debate-plugin/* adversarial-debate-plugin/.claude-plugin \
  ~/.claude/plugins/cache/local/think-tank/1.0.0/
```

### 2. Register the plugin

Edit `~/.claude/plugins/installed_plugins.json` and add inside the `"plugins"` object:

```json
"think-tank@local": [
  {
    "scope": "user",
    "installPath": "<HOME>/.claude/plugins/cache/local/think-tank/1.0.0",
    "version": "1.0.0",
    "installedAt": "2026-03-08T00:00:00.000Z",
    "lastUpdated": "2026-03-08T00:00:00.000Z"
  }
]
```

Replace `<HOME>` with your actual home directory path (e.g., `/Users/yourname`).

### 3. Enable the plugin

Edit `~/.claude/settings.json` and add inside `"enabledPlugins"`:

```json
"think-tank@local": true
```

### 4. Restart Claude Code

Close and reopen your Claude Code session. The plugin commands should now be available.

## Commands

| Command | Description |
|---------|-------------|
| `/tank:debate <file> [--rounds N] [--output-dir DIR]` | Adversarial document improvement |
| `/tank:review <file> [--output-dir DIR]` | Multi-reviewer code review |
| `/tank:brainstorm <topic-or-file> [--output-dir DIR]` | Diverge-challenge-synthesize ideation |
| `/tank:hypothesis [--file FILE] [--cycles N] [--output-dir DIR]` | Hypothesis-driven research with git branching |
| `/tank:help` | Show all modes and usage |

All commands support `--model MODEL` to override the Claude model.

## Examples

```bash
/tank:debate docs/architecture.md
/tank:debate specs/proposal.md --rounds 3
/tank:review src/auth/login.ts
/tank:review scripts/deploy.sh --output-dir /tmp/review
/tank:brainstorm "How should we design the caching layer?"
/tank:brainstorm docs/feature-idea.md
/tank:hypothesis --file hypothesis.md --cycles 2
/tank:help
```

## What it does

Think Tank orchestrates multiple Claude instances in structured roles to produce higher-quality analysis than any single pass:

1. **Debate** — CRITIC attacks (6 vectors), DEFENDER responds, SYNTHESIZER incorporates conceded points, DIFF EVALUATOR checks regressions
2. **Review** — Bug Hunter + Security Auditor + Performance Analyst analyze independently, Synthesizer merges into prioritized action list
3. **Brainstorm** — Diverger generates ideas, Challenger stress-tests them, Synthesizer ranks top 3 with recommendation
4. **Hypothesis** — Researcher explores on git branches, Verifier validates claims, Report synthesizes confirm/reject/pivot

## Customizing prompts

Edit the Markdown files in `prompts/` inside the plugin installation:

```
~/.claude/plugins/cache/local/think-tank/1.0.0/prompts/
  debate/         # critic.md, defender.md, synthesizer.md, ...
  review/         # bug-hunter.md, security-auditor.md, ...
  brainstorm/     # diverger.md, challenger.md, synthesizer.md
  hypothesis/     # researcher.md, verifier.md, report.md
```

## Uninstall

1. Remove `"think-tank@local"` from `installed_plugins.json`
2. Remove `"think-tank@local": true` from `settings.json`
3. Delete `~/.claude/plugins/cache/local/think-tank/`
