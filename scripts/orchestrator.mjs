#!/usr/bin/env node

/**
 * Think Tank Orchestrator — multi-agent collaboration entry point.
 *
 * Dispatches to mode-specific pipelines based on first argument.
 *
 * Usage: node scripts/orchestrator.mjs <mode> [options]
 *
 * Modes:
 *   debate      Adversarial document improvement (critic/defender rounds)
 *   review      Multi-reviewer code review (bug/security/performance)
 *   brainstorm  Diverge-challenge-synthesize ideation
 *   hypothesis  Hypothesis-driven research with git branching
 */

import { parseArgs } from "./lib/core.mjs";
import { runDebate } from "./modes/debate.mjs";

// ---------------------------------------------------------------------------
// Stub modes (replaced as each mode is implemented)
// ---------------------------------------------------------------------------

function runReview(_args) {
  console.log("Not implemented yet");
}

function runBrainstorm(_args) {
  console.log("Not implemented yet");
}

function runHypothesis(_args) {
  console.log("Not implemented yet");
}

// ---------------------------------------------------------------------------
// Mode registry
// ---------------------------------------------------------------------------

const MODES = {
  debate: { fn: runDebate, desc: "Adversarial document improvement (critic/defender rounds)" },
  review: { fn: runReview, desc: "Multi-reviewer code review (bug/security/performance)" },
  brainstorm: { fn: runBrainstorm, desc: "Diverge-challenge-synthesize ideation" },
  hypothesis: { fn: runHypothesis, desc: "Hypothesis-driven research with git branching" },
};

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

function showUsage() {
  console.log("Think Tank — multi-agent collaboration plugin\n");
  console.log("Usage: node scripts/orchestrator.mjs <mode> [options]\n");
  console.log("Modes:");
  for (const [name, { desc }] of Object.entries(MODES)) {
    console.log(`  ${name.padEnd(14)} ${desc}`);
  }
  console.log("\nOptions:");
  console.log("  --help, -h     Show mode-specific help");
  console.log("  --rounds N     Number of rounds (debate mode)");
  console.log("  --cycles N     Number of cycles (hypothesis mode)");
  console.log("  --model MODEL  Model override (e.g. sonnet)");
  console.log("  --output-dir   Output directory");
  console.log("\nExamples:");
  console.log("  node scripts/orchestrator.mjs debate doc.md --rounds 3");
  console.log("  node scripts/orchestrator.mjs review src/index.js");
  console.log("  node scripts/orchestrator.mjs brainstorm --topic \"API design\"");
  console.log("  node scripts/orchestrator.mjs hypothesis --file hypothesis.md");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);

  // Extract mode (first non-flag argument)
  const modeName = argv[0];

  if (!modeName || modeName === "--help" || modeName === "-h") {
    showUsage();
    process.exit(modeName ? 0 : 1);
  }

  const mode = MODES[modeName];
  if (!mode) {
    console.error(`Unknown mode: "${modeName}"\n`);
    showUsage();
    process.exit(1);
  }

  // Parse remaining args
  const rest = argv.slice(1);
  const args = parseArgs(rest);
  args.mode = modeName;

  // Dispatch
  mode.fn(args);
}

main();
