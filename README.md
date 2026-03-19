# Think Tank — Structured Multi-Agent Thinking Toolkit for Claude Code and Codex

Your documents have blind spots. Your code has unreviewed assumptions. Your ideas need stress-testing. Think Tank finds what you missed by orchestrating multiple agents across Claude Code and Codex in structured roles.

## Quick Start

From inside Claude Code:

```
/plugin marketplace add cerodb/think-tank
/plugin install think-tank@think-tank
```

If you want to use `cross-agent`, install Codex CLI too:

```bash
npm i -g @openai/codex
```

Try it on this README (a quick way to verify the install works):

```
/think-tank:debate README.md
```

This runs a CRITIC → DEFENDER → SYNTHESIZER pipeline on the README itself. You'll get 3 output files: a debate transcript, an improved version, and a regression check. Takes ~8 minutes.

More examples:

```
/think-tank:debate docs/architecture.md
/think-tank:review src/auth/login.ts
/think-tank:brainstorm "How should we handle caching?"
/think-tank:hypothesis --file hypothesis.md
```

## Modes

### /think-tank:debate — Adversarial Document Improvement

A CRITIC attacks your document across 6 vectors. A DEFENDER fights back, conceding only when shown specific, likely failure scenarios. After N rounds, a SYNTHESIZER incorporates only conceded points. A DIFF EVALUATOR catches regressions.

```bash
/think-tank:debate docs/proposal.md              # 2 rounds (default)
/think-tank:debate docs/arch.md --rounds 3       # more rounds
/think-tank:debate README.md --output-dir /tmp   # custom output
/think-tank:debate src/auth.ts --model opus      # override model
```

**Best for:** Architecture specs, design docs, proposals, ADRs, research summaries, critical source code.

**Output:** 3 files in `<input-dir>/adversarial/` (or `--output-dir`):
- `debate-<timestamp>.md` — Full transcript (often more valuable than the improved doc)
- `improved-<timestamp>.md` — Synthesized document with only conceded changes
- `diff-eval-<timestamp>.md` — Regression analysis (improvement/lateral/regression ratio)

**Cost estimate:** ~40K tokens per run (2 rounds). ~8 minutes on a 200-line document.

### /think-tank:review — Multi-Reviewer Code Review

Three specialist reviewers analyze your code independently, then a Synthesizer merges findings into a single prioritized action list.

- **Bug Hunter** — logic errors, edge cases, race conditions, off-by-ones
- **Security Auditor** — injection, auth bypass, data exposure, input validation
- **Performance Analyst** — leaks, blocking calls, unnecessary allocations, caching

```bash
/think-tank:review src/auth/login.ts
/think-tank:review scripts/deploy.sh --output-dir /tmp/review
```

**Best for:** Source code, scripts, configurations, security-sensitive files.

**Output:** 2 files:
- `review-<timestamp>.md` — Prioritized action list (Critical/High/Medium/Low)
- `review-details-<timestamp>.md` — Per-reviewer findings

**Cost estimate:** ~20K tokens per run. 4 Claude calls.

### /think-tank:brainstorm — Diverge-Challenge-Synthesize Ideation

A Diverger generates 5+ ideas with implementation sketches. A Challenger stress-tests each one. A Synthesizer ranks the top 3 with pros/cons and a final recommendation.

Accepts a topic string or a file path (auto-detected).

```bash
/think-tank:brainstorm "How should we design the caching layer?"
/think-tank:brainstorm docs/feature-proposal.md
/think-tank:brainstorm "Migration strategy for auth service" --output-dir /tmp
```

**Best for:** Design decisions, feature planning, strategy, architecture exploration.

**Output:** 1 file:
- `brainstorm-<timestamp>.md` — Ideas, challenges, and ranked recommendations

**Cost estimate:** ~15K tokens per run. 3 Claude calls.

### /think-tank:hypothesis — Hypothesis-Driven Research with Git Branching

A Researcher explores the codebase on isolated git branches. A Verifier validates claims independently on separate branches. A Report synthesizes findings into confirm/reject/pivot recommendations.

Create a hypothesis file first (template included):

```bash
cp plugins/think-tank/hypothesis-template.md hypothesis.md
# Edit with your research question

/think-tank:hypothesis                              # reads ./hypothesis.md
/think-tank:hypothesis --file my-hypothesis.md      # custom file
/think-tank:hypothesis --cycles 2                   # multiple research cycles
```

Each cycle creates isolated branches (`hypothesis/researcher-c1-*`, `hypothesis/verifier-c1-*`) so the main branch stays clean. Researcher and Verifier have access to Read, Grep, and Write tools only.

**Best for:** Codebase investigation, bug hunting, architecture analysis, understanding unfamiliar code.

**Output:** 2 files:
- `hypothesis-log-<timestamp>.md` — Full research log across all cycles
- `hypothesis-report-<timestamp>.md` — Confirm/reject/pivot with evidence

**Cost estimate:** ~30K tokens per cycle. Requires git.

### /think-tank:cross-agent — Claude/Codex Cross-Agent Consultation

Send a question to Codex, Claude, or both — and optionally run an arbiter that synthesizes a final answer from both responses. This is the bridge between the two most capable coding CLIs on your machine.

```bash
/think-tank:cross-agent --topic "How should we handle auth token refresh?"
/think-tank:cross-agent --topic "Review this migration plan" --target both
/think-tank:cross-agent --topic "Best caching strategy" --target both --arbiter
/think-tank:cross-agent --topic "Explain this error" --target claude
```

**Targets:**
- `--target codex` (default) — Ask Codex only
- `--target claude` — Ask Claude only
- `--target both` — Ask both, get side-by-side comparison
- `--target both --arbiter` — Both respond, then a third call synthesizes the answer

**Safety defaults:**
- Codex runs with `--sandbox read-only` (no filesystem writes)
- Claude runs with `--no-session-persistence` (no session state leakage)
- Claude budget capped at `--max-budget-usd 0.50` (configurable)
- Recursion blocked: `CROSS_AGENT_HOP=1` prevents infinite loops between agents

**Best for:** Getting a second opinion, comparing reasoning between models, resolving disagreements, delegating subtasks across CLIs.

**Output:** 1 file in `cross-agent/` (or `--output-dir`):
- `cross-agent-<timestamp>.md` — Per-agent responses + arbiter synthesis (if enabled)

**Cost estimate:** ~5K tokens for single-target, ~15K for both + arbiter. Codex calls use ChatGPT Plus quota (not billed per token).

## Repo Layout

```text
.
├── README.md
├── install.sh
├── .claude-plugin/       # Claude marketplace packaging metadata
└── plugins/think-tank/   # Actual plugin code, prompts, scripts, commands
```

- `plugins/think-tank/` is the product.
- `.claude-plugin/` exists for marketplace/distribution metadata.

## Common Options

| Flag | Modes | Description |
|------|-------|-------------|
| `--model MODEL` | All | Override Claude model (e.g., `sonnet`, `opus`) |
| `--output-dir DIR` | All | Where to save output files |
| `--rounds N` | debate | Number of debate rounds (default: 2) |
| `--cycles N` | hypothesis | Number of research cycles (default: 1) |
| `--topic TEXT` | cross-agent | The question to send to the agent(s) |
| `--target TARGET` | cross-agent | `codex`, `claude`, or `both` (default: `codex`) |
| `--arbiter` | cross-agent | Enable arbiter synthesis after both respond |
| `--arbiter-target` | cross-agent | Which CLI runs the arbiter: `codex` or `claude` (default: `codex`) |
| `--max-budget-usd N` | cross-agent | Claude cost cap per call (default: `0.50`) |

## Customization

All prompts live in `plugins/think-tank/prompts/` as plain Markdown files organized by mode:

```
plugins/think-tank/prompts/
  debate/         # critic.md, defender.md, synthesizer.md, ...
  review/         # bug-hunter.md, security-auditor.md, ...
  brainstorm/     # diverger.md, challenger.md, synthesizer.md
  hypothesis/     # researcher.md, verifier.md, report.md
  cross-agent/    # arbiter.md
```

**The prompts are the product.** The scripts are just plumbing. Edit any prompt to change agent behavior.

### Adding Custom Modes

Create a new directory under `plugins/think-tank/prompts/` with your agent prompt files:

```bash
mkdir plugins/think-tank/prompts/my-mode
# Add agent-a.md, agent-b.md, synthesizer.md, etc.

# Run it via --mode flag:
node plugins/think-tank/scripts/orchestrator.mjs my-mode input.md
```

Prompt files are loaded alphabetically (excluding README.md). Each agent receives the document and previous agent outputs via `{DOCUMENT}` and `{PREVIOUS}` template variables.

See `plugins/think-tank/prompts/example-custom/` for a working example with Devil's Advocate and Pragmatist agents.

## Requirements

- **Claude Code** with Max plan or API key (spawns `claude -p` subprocesses)
- **Codex CLI** (optional, required for cross-agent mode — install: `npm i -g @openai/codex`, requires ChatGPT Plus)
- **Node.js 18+**
- **git** (required for hypothesis mode branch isolation)

## Contributing

1. Fork the repo
2. Create a feature branch
3. Add your mode under `plugins/think-tank/prompts/<mode-name>/` with a README.md
4. If it needs custom orchestration, add a module in `plugins/think-tank/scripts/modes/`
5. Run `node plugins/think-tank/scripts/smoke-test.mjs` to validate structure
6. Submit a PR

## License

MIT
