# Custom Mode Convention

Think Tank supports user-defined modes via the `prompts/` directory.

## How It Works

1. Create a directory under `prompts/` named after your mode (e.g. `prompts/my-mode/`)
2. Add one or more prompt files as `.md` files (e.g. `agent-a.md`, `agent-b.md`)
3. Run via orchestrator: `node scripts/orchestrator.mjs my-mode input.md`

The orchestrator detects that `my-mode` is not a built-in mode, checks if
`prompts/my-mode/` exists, and runs each prompt file sequentially through Claude.

## Directory Structure

```
prompts/
  my-mode/
    README.md          ← optional, skipped by orchestrator
    agent-a.md         ← first agent prompt (alphabetical order)
    agent-b.md         ← second agent prompt
    agent-c.md         ← third agent prompt (add as many as needed)
```

## Prompt File Naming

- Files are loaded in **alphabetical order** (excluding `README.md`)
- Each `.md` file is one agent in the pipeline
- Name them to reflect their role: `diverger.md`, `critic.md`, `synthesizer.md`, etc.
- The naming prefix (`agent-a`, `agent-b`) controls execution order

## How the Orchestrator Loads Custom Modes

1. First positional argument is treated as the mode name
2. If the mode is not in the built-in registry (`debate`, `review`, `brainstorm`, `hypothesis`),
   the orchestrator checks if `prompts/<mode>/` exists
3. All `.md` files (except `README.md`) are loaded alphabetically
4. Each prompt is executed sequentially via `callClaude()`
5. The input document (second argument) is wrapped in `<DOCUMENT>` tags and appended to each prompt
6. Each agent receives the accumulated output from previous agents
7. Final output is saved to `<mode>-<timestamp>.md`

## Template Variables

Custom prompts can use `{DOCUMENT}` and `{PREVIOUS}` placeholders:
- `{DOCUMENT}` — the original input document content
- `{PREVIOUS}` — output from the previous agent (empty for first agent)

## Example

This directory (`example-custom/`) contains a Devil's Advocate + Pragmatist pair.
To run it:

```bash
node scripts/orchestrator.mjs example-custom my-document.md --output-dir ./output
```

## Tips

- Keep prompts focused — one role per file
- Include the `<DOCUMENT>` tag instruction so agents know what's data vs instructions
- Start with 2-3 agents, add more only if needed (each agent = one Claude call)
- Use `--model` to override the model for all agents in the pipeline
