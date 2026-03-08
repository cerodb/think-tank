---
description: "Show all Think Tank modes and usage"
allowed-tools: []
---

# Think Tank — Help

Think Tank is a multi-agent collaboration plugin for Claude Code. It runs multiple Claude instances in structured roles to produce higher-quality analysis than any single pass.

## Available Modes

### `/tank:debate <file> [--rounds N] [--output-dir DIR]`
Adversarial document improvement. A CRITIC attacks the document across 6 vectors, a DEFENDER responds, and after N rounds a SYNTHESIZER produces an improved version. Best for: specs, architecture docs, proposals, research.

### `/tank:review <file> [--output-dir DIR]`
Multi-reviewer code review. Three specialists (Bug Hunter, Security Auditor, Performance Analyst) analyze code independently, then a Synthesizer merges findings into a prioritized action list. Best for: source code, scripts, configurations.

### `/tank:brainstorm <topic-or-file> [--output-dir DIR]`
Diverge-challenge-synthesize ideation. A Diverger generates 5+ ideas, a Challenger stress-tests them, and a Synthesizer ranks the top 3 with a final recommendation. Accepts a topic string or file path. Best for: design decisions, feature planning, strategy.

### `/tank:hypothesis [--file hypothesis.md] [--cycles N] [--output-dir DIR]`
Hypothesis-driven research with git branching. A Researcher explores the codebase on isolated branches, a Verifier validates claims independently, and a Report synthesizes findings into confirm/reject/pivot. Best for: codebase investigation, bug hunting, architecture analysis.

## Common Options

- `--model MODEL` — Override the Claude model (e.g., `sonnet`, `opus`)
- `--output-dir DIR` — Where to save output files
- `--rounds N` — Number of debate rounds (debate mode, default: 2)
- `--cycles N` — Number of research cycles (hypothesis mode, default: 1)

## Examples

```
/tank:debate specs/architecture.md --rounds 3
/tank:review src/auth/login.js
/tank:brainstorm "How should we design the caching layer?"
/tank:hypothesis --file hypothesis.md --cycles 2
```
