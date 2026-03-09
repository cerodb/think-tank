# Think Tank — Multi-Agent Collaboration Plugin for Claude Code

Your documents have blind spots. Your code has unreviewed assumptions. Your ideas need stress-testing. Think Tank finds what you missed by orchestrating multiple Claude instances in structured roles.

## Install

From inside Claude Code:

```
/plugin marketplace add cerodb/think-tank
/plugin install think-tank@think-tank
```

## 4 Modes

| Command | What it does |
|---------|-------------|
| `/think-tank:debate <file>` | CRITIC attacks, DEFENDER responds, SYNTHESIZER incorporates conceded points |
| `/think-tank:review <file>` | Bug Hunter + Security Auditor + Performance Analyst → prioritized action list |
| `/think-tank:brainstorm "topic"` | Diverger generates, Challenger stress-tests, Synthesizer ranks top 3 |
| `/think-tank:hypothesis --file hypothesis.md` | Researcher explores on git branches, Verifier validates, Report synthesizes |

All commands support `--model MODEL` to override the Claude model.

## Requirements

- Claude Code v1.0.33+ with Max plan or API key
- Node.js 18+
- git (for hypothesis mode)

See [INSTALL.md](plugins/think-tank/INSTALL.md) for full details.
