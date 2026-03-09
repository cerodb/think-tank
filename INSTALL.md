# Installation — Think Tank Plugin

## Requirements

- Claude Code with Max plan or API key (spawns `claude -p` subprocesses)
- Node.js 18+
- git (required for hypothesis mode)

## Quick Install

```bash
git clone https://github.com/cerodb/think-tank.git
cd think-tank
bash scripts/install.sh
```

Then restart Claude Code. That's it.

## Commands

| Command | Description |
|---------|-------------|
| `/think-tank:debate <file> [--rounds N] [--output-dir DIR]` | Adversarial document improvement |
| `/think-tank:review <file> [--output-dir DIR]` | Multi-reviewer code review |
| `/think-tank:brainstorm <topic-or-file> [--output-dir DIR]` | Diverge-challenge-synthesize ideation |
| `/think-tank:hypothesis [--file FILE] [--cycles N] [--output-dir DIR]` | Hypothesis-driven research with git branching |
| `/think-tank:help` | Show all modes and usage |

All commands support `--model MODEL` to override the Claude model.

## Examples

```bash
/think-tank:debate docs/architecture.md
/think-tank:debate specs/proposal.md --rounds 3
/think-tank:review src/auth/login.ts
/think-tank:brainstorm "How should we design the caching layer?"
/think-tank:hypothesis --file hypothesis.md --cycles 2
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

## Manual Install

If the install script doesn't work, these are the three steps it performs:

1. Copy plugin files to `~/.claude/plugins/cache/local/think-tank/1.0.0/`
2. Register `"think-tank@local"` in `~/.claude/plugins/installed_plugins.json`
3. Enable `"think-tank@local": true` in `~/.claude/settings.json`

## Uninstall

```bash
# Remove registration
# Edit ~/.claude/plugins/installed_plugins.json — delete the "think-tank@local" entry
# Edit ~/.claude/settings.json — delete "think-tank@local" from enabledPlugins

# Remove files
rm -rf ~/.claude/plugins/cache/local/think-tank/
```
