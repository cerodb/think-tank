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

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseArgs,
  validateEarlyArgs,
  callClaude,
  wrapDoc,
  timestamp,
  saveFile,
  makeTaskSummary,
  writeTaskOutput,
} from "./lib/core.mjs";
import { runDebate } from "./modes/debate.mjs";
import { runReview } from "./modes/review.mjs";
import { runBrainstorm } from "./modes/brainstorm.mjs";
import { runHypothesis } from "./modes/hypothesis.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..");
const PROMPTS_DIR = join(PLUGIN_ROOT, "prompts");

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
// Custom mode runner — loads prompts from prompts/<mode>/ directory
// ---------------------------------------------------------------------------

function runCustomMode(modeName, args) {
  const startedAt = Date.now();
  const modeDir = join(PROMPTS_DIR, modeName);

  // Load all .md files except README.md, sorted alphabetically
  const promptFiles = readdirSync(modeDir)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .sort();

  if (promptFiles.length === 0) {
    console.error(`Custom mode "${modeName}" has no prompt files in ${modeDir}`);
    process.exit(1);
  }

  // Read input document
  let doc = "";
  let inputLabel = args.inputFile || args.topic || "(none)";
  const candidate = args.inputFile ? resolve(args.inputFile) : null;
  if (candidate && existsSync(candidate)) {
    doc = readFileSync(candidate, "utf-8");
    inputLabel = candidate;
  } else if (candidate) {
    const mergedTopic = args.topic ? `${args.inputFile} ${args.topic}` : args.inputFile;
    doc = mergedTopic;
    inputLabel = `"${mergedTopic}"`;
  } else if (args.topic) {
    doc = args.topic;
    inputLabel = `"${args.topic}"`;
  } else {
    console.error(`Custom mode "${modeName}" requires an input file or --topic`);
    process.exit(1);
  }

  const wrappedDoc = wrapDoc(doc);
  const ts = timestamp();
  const outputDir = args.outputDir || ".";

  console.log(`\n=== Custom Mode: ${modeName} ===`);
  console.log(`Agents: ${promptFiles.map((f) => f.replace(".md", "")).join(" → ")}`);
  console.log(`Input: ${inputLabel}\n`);

  let previousOutput = "";
  const sections = [];

  for (const file of promptFiles) {
    const agentName = file.replace(".md", "");
    console.log(`--- Agent: ${agentName} ---`);

    let promptText = readFileSync(join(modeDir, file), "utf-8").trim();

    // Substitute template variables
    promptText = promptText.replaceAll("{DOCUMENT}", wrappedDoc);
    promptText = promptText.replaceAll("{PREVIOUS}", previousOutput);

    // If prompt doesn't use {DOCUMENT}, append wrapped doc
    if (!promptText.includes("<DOCUMENT>")) {
      promptText += "\n\n" + wrappedDoc;
    }

    const response = callClaude(promptText, { model: args.model });
    previousOutput = response;

    sections.push(`## ${agentName}\n\n${response}`);
    console.log(`  ✓ ${agentName} complete (${response.length} chars)\n`);
  }

  // Save combined output
  const output = `# ${modeName} — ${ts}\n\n${sections.join("\n\n---\n\n")}`;
  const outPath = join(outputDir, `${modeName}-${ts}.md`);
  saveFile(output, outPath);
  console.log(`\nOutput saved to: ${outPath}`);
  writeTaskOutput(
    makeTaskSummary({
      mode: modeName,
      status: "ok",
      outputFiles: [outPath],
      durationMs: Date.now() - startedAt,
      model: args.model || null,
    })
  );
}

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

  // Parse remaining args
  const rest = argv.slice(1);
  const args = parseArgs(rest);
  args.mode = modeName;
  if (args.parseWarnings.length > 0) {
    for (const warning of args.parseWarnings) {
      console.warn(`Argument warning: ${warning}`);
    }
  }
  if (args.unknownFlags.length > 0) {
    console.warn(`Ignoring unknown flags: ${args.unknownFlags.join(", ")}`);
  }
  try {
    validateEarlyArgs(args);
  } catch (err) {
    console.error(`Argument error: ${err.message}`);
    process.exit(1);
  }

  // Check built-in modes first
  const mode = MODES[modeName];
  if (mode) {
    mode.fn(args);
    return;
  }

  // Check for custom mode in prompts/<mode>/ directory
  if (!/^[a-z0-9-]+$/.test(modeName)) {
    console.error(`Invalid mode name: "${modeName}" (only lowercase letters, digits, hyphens allowed)`);
    process.exit(1);
  }
  const customModeDir = join(PROMPTS_DIR, modeName);
  if (existsSync(customModeDir)) {
    runCustomMode(modeName, args);
    return;
  }

  console.error(`Unknown mode: "${modeName}"\n`);
  console.error(`No built-in mode or custom prompts directory found at: prompts/${modeName}/`);
  console.error(`To create a custom mode, add prompt files to prompts/${modeName}/\n`);
  showUsage();
  process.exit(1);
}

main();
