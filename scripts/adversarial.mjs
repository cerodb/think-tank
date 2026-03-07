#!/usr/bin/env node

/**
 * Adversarial Debate Tool v4.0
 *
 * Runs Claude instances in opposition to stress-test and improve documents.
 * Roles: CRITIC → DEFENDER (N rounds) → SYNTHESIZER → DIFF EVALUATOR
 *
 * Usage: node ops-scripts/adversarial.mjs <input-file> [--rounds N] [--output-dir DIR]
 *
 * Example:
 *   node ops-scripts/adversarial.mjs specs/pg10-claws-v2-distilled/architecture.md
 *   node ops-scripts/adversarial.mjs specs/pg10-claws-v2-distilled/architecture.md --rounds 3
 *
 * Prompts loaded from ops-scripts/adversarial-prompts/:
 *   critic.md, critic-followup.md, defender.md, defender-followup.md,
 *   synthesizer.md, diff-evaluator.md
 *
 * Manual recovery (if the script crashes mid-run):
 *   Debate transcript is saved incrementally after each call.
 *   Check output dir for partial debate-*.md file.
 *   To resume a single call manually:
 *     echo "<prompt>" | claude -p
 */

import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// PROMPTS — loaded from external files for easy editing and debugging
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, "..", "prompts");

function loadPrompt(name) {
  const file = join(PROMPTS_DIR, `${name}.md`);
  if (!existsSync(file)) {
    console.error(`Prompt file not found: ${file}`);
    console.error(`Expected prompts in: ${PROMPTS_DIR}/`);
    process.exit(1);
  }
  return readFileSync(file, "utf-8").trim();
}

const CRITIC = loadPrompt("critic");
const CRITIC_FOLLOWUP = loadPrompt("critic-followup");
const DEFENDER = loadPrompt("defender");
const DEFENDER_FOLLOWUP = loadPrompt("defender-followup");
const SYNTHESIZER = loadPrompt("synthesizer");
const DIFF_EVALUATOR = loadPrompt("diff-evaluator");

// ---------------------------------------------------------------------------
// CORE
// ---------------------------------------------------------------------------

function callClaude(prompt) {
  const env = { ...process.env };
  delete env.CLAUDECODE; // allow spawning from within Claude Code

  const result = spawnSync("claude", ["-p"], {
    input: prompt,
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: 600_000, // 10 min per call
    env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = result.stderr || "Unknown error";
    throw new Error(`claude exited with status ${result.status}: ${err}`);
  }
  return result.stdout.trim();
}

function preview(text, maxLen = 120) {
  const first = text.split("\n").find((l) => l.trim()) || "";
  return first.length > maxLen ? first.slice(0, maxLen) + "..." : first;
}

function wrapDoc(doc) {
  return `<DOCUMENT>\n${doc}\n</DOCUMENT>`;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  let inputFile = null;
  let rounds = 2; // v2 default: 2 rounds (diminishing returns after that)
  let outputDir = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--rounds" && args[i + 1]) {
      rounds = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === "--output-dir" && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(
        "Usage: node ops-scripts/adversarial.mjs <input-file> [--rounds N] [--output-dir DIR]"
      );
      console.log("  --rounds N      Number of debate rounds (default: 2)");
      console.log("  --output-dir    Output directory (default: <input-dir>/adversarial/)");
      process.exit(0);
    } else if (!args[i].startsWith("--")) {
      inputFile = args[i];
    }
  }

  if (!inputFile) {
    console.error(
      "Usage: node ops-scripts/adversarial.mjs <input-file> [--rounds N] [--output-dir DIR]"
    );
    process.exit(1);
  }

  inputFile = resolve(inputFile);
  if (!existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  if (!outputDir) {
    outputDir = join(dirname(inputFile), "adversarial");
  }
  mkdirSync(outputDir, { recursive: true });

  const doc = readFileSync(inputFile, "utf-8");
  const wrappedDoc = wrapDoc(doc);
  const ts = new Date().toISOString().slice(0, 10);
  const totalCalls = rounds * 2 + 2; // N*(critic+defender) + synthesizer + diff evaluator

  console.log(`\nADVERSARIAL DEBATE v4.0`);
  console.log(`  Input:  ${inputFile}`);
  console.log(`  Rounds: ${rounds}`);
  console.log(`  Calls:  ${totalCalls} (${rounds}x critic/defender + synthesizer + diff eval)`);
  console.log(`  Output: ${outputDir}/\n`);

  const debateFile = join(outputDir, `debate-${ts}.md`);
  const improvedFile = join(outputDir, `improved-${ts}.md`);
  const diffEvalFile = join(outputDir, `diff-eval-${ts}.md`);

  let debateContext = "";

  // Save debate incrementally after each call (crash recovery)
  function saveDebate() {
    let md = `# Adversarial Debate: ${basename(inputFile)}\n\n`;
    md += `- **Date**: ${ts}\n`;
    md += `- **Rounds**: ${rounds}\n`;
    md += `- **Input**: \`${inputFile}\`\n`;
    md += `- **Prompts**: \`${PROMPTS_DIR}/\`\n\n---\n`;
    md += debateContext;
    writeFileSync(debateFile, md);
  }

  // ---- DEBATE ROUNDS ----

  for (let r = 1; r <= rounds; r++) {
    // --- CRITIC ---
    console.log(`[Round ${r}/${rounds}] CRITIC...`);

    let criticPrompt;
    if (r === 1) {
      criticPrompt = `${CRITIC}\n\n---\n\n${wrappedDoc}`;
    } else {
      const followup = CRITIC_FOLLOWUP.replace("{ROUND}", String(r));
      criticPrompt = `${CRITIC}\n\n---\n\n${wrappedDoc}\n\n---\n\n# DEBATE SO FAR\n\n${debateContext}\n\n---\n\n${followup}`;
    }

    const critique = callClaude(criticPrompt);
    debateContext += `\n\n## Round ${r} — CRITIC\n\n${critique}`;
    saveDebate();
    console.log(`  Done (${critique.length} chars)`);
    console.log(`  >> ${preview(critique)}\n`);

    // --- DEFENDER ---
    console.log(`[Round ${r}/${rounds}] DEFENDER...`);

    let defenderPrompt;
    if (r === 1) {
      defenderPrompt = `${DEFENDER}\n\n---\n\n${wrappedDoc}\n\n---\n\n# DEBATE SO FAR\n\n${debateContext}\n\n---\n\nRespond to the critic's round ${r} arguments.`;
    } else {
      const followup = DEFENDER_FOLLOWUP.replace("{ROUND}", String(r));
      defenderPrompt = `${DEFENDER}\n\n---\n\n${wrappedDoc}\n\n---\n\n# DEBATE SO FAR\n\n${debateContext}\n\n---\n\n${followup}`;
    }

    const defense = callClaude(defenderPrompt);
    debateContext += `\n\n## Round ${r} — DEFENDER\n\n${defense}`;
    saveDebate();
    console.log(`  Done (${defense.length} chars)`);
    console.log(`  >> ${preview(defense)}\n`);
  }

  // ---- SYNTHESIZER ----

  console.log(`[SYNTHESIZER] Generating improved document...`);
  const synthPrompt = `${SYNTHESIZER}\n\n---\n\n${wrappedDoc}\n\n---\n\n# FULL DEBATE TRANSCRIPT\n\n${debateContext}`;

  const improved = callClaude(synthPrompt);
  writeFileSync(improvedFile, improved);
  console.log(`  Done (${improved.length} chars)\n`);

  // ---- DIFF EVALUATOR ----

  console.log(`[DIFF EVALUATOR] Checking for regressions...`);
  const diffPrompt = `${DIFF_EVALUATOR}\n\n---\n\n# ORIGINAL DOCUMENT\n\n${wrappedDoc}\n\n---\n\n# REVISED DOCUMENT\n\n<DOCUMENT>\n${improved}\n</DOCUMENT>`;

  const diffEval = callClaude(diffPrompt);
  writeFileSync(diffEvalFile, diffEval);
  console.log(`  Done (${diffEval.length} chars)`);
  console.log(`  >> ${preview(diffEval)}\n`);

  // ---- SUMMARY ----

  console.log(`Debate transcript: ${debateFile}`);
  console.log(`Improved document: ${improvedFile}`);
  console.log(`Diff evaluation:   ${diffEvalFile}`);
  console.log(`\nDone. ${totalCalls} Claude calls completed.`);
}

main();
