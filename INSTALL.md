# Installation

## Requirements

- Claude Code with Max plan (the tool spawns `claude -p` subprocesses)
- Node.js 18+

## Steps

### 1. Unzip and copy to Claude Code plugin cache

```bash
unzip adversarial-debate-plugin-v1.0.0.zip
mkdir -p ~/.claude/plugins/cache/local/adversarial-debate/1.0.0
cp -r adversarial-debate-plugin/* adversarial-debate-plugin/.claude-plugin ~/.claude/plugins/cache/local/adversarial-debate/1.0.0/
```

### 2. Register the plugin

Edit `~/.claude/plugins/installed_plugins.json` and add inside the `"plugins"` object:

```json
"adversarial-debate@local": [
  {
    "scope": "user",
    "installPath": "<HOME>/.claude/plugins/cache/local/adversarial-debate/1.0.0",
    "version": "1.0.0",
    "installedAt": "2026-03-05T00:00:00.000Z",
    "lastUpdated": "2026-03-05T00:00:00.000Z"
  }
]
```

Replace `<HOME>` with your actual home directory path (e.g. `/Users/yourname`).

### 3. Enable the plugin

Edit `~/.claude/settings.json` and add inside `"enabledPlugins"`:

```json
"adversarial-debate@local": true
```

### 4. Restart Claude Code

Close and reopen your Claude Code session. The plugin commands should now be available.

## Usage

```
/debate <file-path> [--rounds N] [--output-dir DIR]
/debate-help
```

### Examples

```
/debate docs/architecture.md
/debate specs/proposal.md --rounds 3
/debate README.md --output-dir /tmp/debate-output
```

## What it does

Runs two Claude instances in structured opposition to stress-test any document:

1. **CRITIC** attacks the document (6 mandatory analysis vectors)
2. **DEFENDER** defends solid points, concedes valid ones, proposes fixes
3. Repeat for N rounds (default: 2)
4. **SYNTHESIZER** produces an improved version
5. **DIFF EVALUATOR** checks for regressions

### Output (3 files)

- `debate-YYYY-MM-DD.md` — Full transcript (saved incrementally for crash recovery)
- `improved-YYYY-MM-DD.md` — Improved document
- `diff-eval-YYYY-MM-DD.md` — Regression analysis

## Customizing prompts

Edit the files in the `prompts/` directory inside the plugin installation:

```
~/.claude/plugins/cache/local/adversarial-debate/1.0.0/prompts/
```

## Uninstall

1. Remove `"adversarial-debate@local"` from `installed_plugins.json`
2. Remove `"adversarial-debate@local": true` from `settings.json`
3. Delete `~/.claude/plugins/cache/local/adversarial-debate/`
