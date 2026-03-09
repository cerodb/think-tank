# Installation — Think Tank Plugin

## Requirements

- Claude Code v1.0.33+ (run `claude --version` to check)
- Max plan or API key (spawns `claude -p` subprocesses)
- Node.js 18+
- git (required for hypothesis mode)

## Install from zip

1. Download and unzip `think-tank.zip`
2. From inside Claude Code:

```
/plugin marketplace add ./think-tank
/plugin install think-tank@think-tank
```

Replace `./think-tank` with the actual path to the unzipped folder.

## Install from GitHub (when repo is public)

```
/plugin marketplace add cerodb/think-tank
/plugin install think-tank@think-tank
```

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

```
/think-tank:debate docs/architecture.md
/think-tank:debate specs/proposal.md --rounds 3
/think-tank:review src/auth/login.ts
/think-tank:brainstorm "How should we design the caching layer?"
/think-tank:hypothesis --file hypothesis.md --cycles 2
```

## What it does

Think Tank orchestrates multiple Claude instances in structured roles:

1. **Debate** — CRITIC attacks (6 vectors), DEFENDER responds, SYNTHESIZER incorporates conceded points, DIFF EVALUATOR checks regressions
2. **Review** — Bug Hunter + Security Auditor + Performance Analyst analyze independently, Synthesizer merges into prioritized action list
3. **Brainstorm** — Diverger generates ideas, Challenger stress-tests them, Synthesizer ranks top 3 with recommendation
4. **Hypothesis** — Researcher explores on git branches, Verifier validates claims, Report synthesizes confirm/reject/pivot

## Uninstall

From inside Claude Code:

```
/plugin uninstall think-tank@think-tank
/plugin marketplace remove think-tank
```
