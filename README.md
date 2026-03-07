# Adversarial Debate Plugin for Claude Code

Your documents and code have blind spots. This plugin finds them.

Two Claude instances -- a ruthless **Critic** and a rigorous **Defender** -- debate your artifact across multiple rounds. A **Synthesizer** incorporates only the changes both sides agreed on. A **Diff Evaluator** catches regressions.

The result: artifacts that have survived structured opposition, not just proofreading or linting.

## Why this exists

Documents get written and ship with assumptions nobody challenged. Code gets reviewed by someone who skims the diff. Both deserve adversarial testing.

This plugin applies structured opposition to any text artifact -- specs, architecture decisions, proposals, source code, scripts, configs -- anything where being wrong is expensive.

## Quick Start

```bash
# Install the plugin in Claude Code
/install-plugin /path/to/adversarial-debate-plugin

# Debate a document
/debate specs/architecture.md

# Debate source code
/debate src/auth/login.ts

# More rounds (default: 2)
/debate docs/proposal.md --rounds 3

# Custom output directory
/debate README.md --output-dir /tmp/debate-output
```

## How It Works

```
         CRITIC                    DEFENDER
         ------                    --------
Round 1  Attacks (6 vectors)  ->   Defends or concedes
Round 2  Escalates survivors  ->   Deepens defense
         ...N rounds...

         SYNTHESIZER
         -----------
         Incorporates ONLY conceded points
         Respects abstraction level of original
         Prefers no change over lateral change

         DIFF EVALUATOR
         --------------
         Classifies each change:
         IMPROVEMENT / LATERAL / REGRESSION
```

### The Critic

Auto-detects content type and selects attack vectors accordingly.

**For documents** -- 6 vectors: contradictions, unstated assumptions, feasibility, failure modes, missing perspectives, second-order effects.

**For code** -- 6 vectors: bugs and correctness, error handling gaps, security vulnerabilities, performance issues, maintainability, missing tests.

Every criticism requires a concrete failure scenario and a direction for improvement. No vague concerns.

### The Defender

Doesn't just agree -- fights back. Concedes ONLY when the Critic demonstrates all three:

- A specific scenario where the design or code fails
- Who is affected and how
- That the failure is **likely**, not merely possible

Before addressing the Critic's points, the Defender checks: *"What is the MOST IMPORTANT concern the Critic did NOT raise?"* The best insights often come from what the Critic missed.

### The Synthesizer

Conservative by design. Only incorporates changes where the Defender explicitly conceded -- acknowledging a concern without proposing a fix is not a concession. Respects the abstraction level of the original: if your document is principles, you get back principles, not a runbook. If your code is simple, you get back simple code, not over-engineered abstractions.

### The Diff Evaluator

The final check. Classifies every change as improvement, lateral, or regression. Gives you a ratio so you know at a glance whether the synthesis helped or hurt.

## Output

Three files in `<input-dir>/adversarial/` (or `--output-dir`):

| File | What it is |
|------|-----------|
| `debate-YYYY-MM-DD.md` | Full transcript -- often more valuable than the improved doc |
| `improved-YYYY-MM-DD.md` | The synthesized document |
| `diff-eval-YYYY-MM-DD.md` | Regression analysis with improvement/lateral/regression ratio |

The debate transcript is saved incrementally. If the process crashes mid-run, you still have everything up to that point.

## When to Use It

**Great for:** Architecture specs, design docs, proposals, strategy documents, principles, research summaries, ADRs, critical source code, security-sensitive scripts -- anything where hidden assumptions cost real time or money.

**Not ideal for:** Very short files (not enough substance to debate), files you aren't willing to change, generated code or configs.

**Pro tip:** 2 rounds is the sweet spot. 3+ rounds show diminishing returns.

## Customizing

All prompts live in `prompts/` as plain Markdown files. Edit them to change the debate behavior:

```
prompts/
  critic.md            # Attack strategy and vectors
  critic-followup.md   # Escalation in later rounds
  defender.md          # Defense posture and concession rules
  defender-followup.md # Deepening in later rounds
  synthesizer.md       # Adjudication and change policy
  diff-evaluator.md    # Classification criteria
```

The prompts are the product. The script is just plumbing.

## Requirements

- Claude Code with Max plan (spawns `claude -p` subprocesses)
- Node.js 18+

## Cost

6 Claude calls per run (2 rounds default): 2x critic + 2x defender + synthesizer + diff evaluator. Typical run on a 200-line document: ~8 minutes.

## License

MIT
