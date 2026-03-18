#!/usr/bin/env node

/**
 * Smoke test for think-tank plugin.
 * Validates structure, exports, and correctness WITHOUT calling Claude.
 * Exit 0 = all pass, exit 1 = failure.
 */

import { existsSync, readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..");

let failures = 0;
let passes = 0;

function pass(msg) {
  passes++;
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  failures++;
  console.error(`  ✗ ${msg}`);
}

function check(condition, msg) {
  if (condition) pass(msg);
  else fail(msg);
}

function fileExists(rel, description) {
  const full = join(PLUGIN_ROOT, rel);
  check(existsSync(full), description || `File exists: ${rel}`);
  return existsSync(full);
}

// =========================================================================
// 1. Prompt files exist in correct directories
// =========================================================================
console.log("\n[1] Prompt files");

const expectedPrompts = {
  debate: [
    "critic.md",
    "critic-followup.md",
    "defender.md",
    "defender-followup.md",
    "synthesizer.md",
    "diff-evaluator.md",
  ],
  review: [
    "bug-hunter.md",
    "security-auditor.md",
    "performance-analyst.md",
    "synthesizer.md",
  ],
  brainstorm: ["diverger.md", "challenger.md", "synthesizer.md"],
  hypothesis: ["researcher.md", "verifier.md", "report.md"],
  "cross-agent": ["arbiter.md"],
  "example-custom": ["agent-a.md", "agent-b.md", "README.md"],
};

for (const [mode, files] of Object.entries(expectedPrompts)) {
  for (const f of files) {
    fileExists(`prompts/${mode}/${f}`, `prompts/${mode}/${f} exists`);
  }
}

// =========================================================================
// 2. Mode modules export expected functions
// =========================================================================
console.log("\n[2] Mode module exports");

const modeExports = {
  debate: "runDebate",
  review: "runReview",
  brainstorm: "runBrainstorm",
  hypothesis: "runHypothesis",
  "cross-agent": "runCrossAgent",
};

for (const [mode, fnName] of Object.entries(modeExports)) {
  try {
    const mod = await import(`./modes/${mode}.mjs`);
    check(
      typeof mod[fnName] === "function",
      `modes/${mode}.mjs exports ${fnName}()`
    );
  } catch (err) {
    fail(`modes/${mode}.mjs failed to import: ${err.message}`);
  }
}

// =========================================================================
// 3. Core exports
// =========================================================================
console.log("\n[3] Core module exports");

const expectedCoreExports = [
  "callClaude",
  "callCodex",
  "loadPrompt",
  "parseArgs",
  "validateEarlyArgs",
  "timestamp",
  "preview",
  "wrapDoc",
  "saveFile",
  "isBinaryFile",
  "makeTaskSummary",
  "writeTaskOutput",
];

try {
  const core = await import("./lib/core.mjs");
  for (const name of expectedCoreExports) {
    check(
      typeof core[name] === "function",
      `core.mjs exports ${name}()`
    );
  }
} catch (err) {
  fail(`core.mjs failed to import: ${err.message}`);
}

// =========================================================================
// 4. parseArgs() handles flag combinations
// =========================================================================
console.log("\n[4] parseArgs() flag combinations");

const { parseArgs } = await import("./lib/core.mjs");

// Basic positional
{
  const r = parseArgs(["test.md"]);
  check(r.inputFile === "test.md", "parseArgs: positional inputFile");
}

// --rounds
{
  const r = parseArgs(["file.md", "--rounds", "5"]);
  check(r.rounds === 5, "parseArgs: --rounds 5");
}

// --cycles
{
  const r = parseArgs(["--cycles", "3"]);
  check(r.cycles === 3, "parseArgs: --cycles 3");
}

// --model
{
  const r = parseArgs(["file.md", "--model", "sonnet"]);
  check(r.model === "sonnet", "parseArgs: --model sonnet");
}

// --model=value
{
  const r = parseArgs(["file.md", "--model=opus"]);
  check(r.model === "opus", "parseArgs: --model=opus");
}

// --output-dir
{
  const r = parseArgs(["file.md", "--output-dir", "/tmp/out"]);
  check(r.outputDir === "/tmp/out", "parseArgs: --output-dir");
}

// --file
{
  const r = parseArgs(["--file", "hypothesis.md"]);
  check(r.file === "hypothesis.md", "parseArgs: --file hypothesis.md");
}

// --mode
{
  const r = parseArgs(["--mode", "custom-mode"]);
  check(r.mode === "custom-mode", "parseArgs: --mode custom-mode");
}

// --topic
{
  const r = parseArgs(["--topic", "AI safety"]);
  check(r.topic === "AI safety", "parseArgs: --topic");
}

// --help
{
  const r = parseArgs(["--help"]);
  check(r.help === true, "parseArgs: --help flag");
}

// --target
{
  const r = parseArgs(["--target", "both"]);
  check(r.target === "both", "parseArgs: --target both");
}

// --arbiter
{
  const r = parseArgs(["--arbiter"]);
  check(r.arbiter === true, "parseArgs: --arbiter flag");
}

// --arbiter-target
{
  const r = parseArgs(["--arbiter-target", "claude"]);
  check(r.arbiterTarget === "claude", "parseArgs: --arbiter-target claude");
}

// --max-budget-usd
{
  const r = parseArgs(["--max-budget-usd", "0.75"]);
  check(r.maxBudgetUsd === "0.75", "parseArgs: --max-budget-usd 0.75");
}

// multi-word positional topic tail is preserved
{
  const r = parseArgs(["brainstorm", "topic", "without", "quotes"]);
  check(
    r.inputFile === "brainstorm" && r.topic === "topic without quotes",
    "parseArgs: preserves multi-word positional tail"
  );
}

// unknown flags are surfaced and consume an attached value
{
  const r = parseArgs(["doc.md", "--foo", "bar"]);
  check(
    r.unknownFlags.length === 1 && r.unknownFlags[0] === "--foo=bar",
    "parseArgs: captures unknown flag + value"
  );
}

// missing value is surfaced as a parse warning
{
  const r = parseArgs(["doc.md", "--rounds"]);
  check(
    r.parseWarnings.includes("Missing value for --rounds"),
    "parseArgs: warns on missing value"
  );
}

// defaults
{
  const r = parseArgs([]);
  check(r.rounds === 2, "parseArgs: default rounds=2");
  check(r.cycles === 1, "parseArgs: default cycles=1");
  check(r.model === null, "parseArgs: default model=null");
  check(r.outputDir === null, "parseArgs: default outputDir=null");
  check(r.inputFile === null, "parseArgs: default inputFile=null");
}

// combined
{
  const r = parseArgs([
    "doc.md",
    "--rounds",
    "3",
    "--model",
    "opus",
    "--output-dir",
    "/tmp/x",
  ]);
  check(
    r.inputFile === "doc.md" &&
      r.rounds === 3 &&
      r.model === "opus" &&
      r.outputDir === "/tmp/x",
    "parseArgs: combined flags"
  );
}

// =========================================================================
// 5. Early validation + task output contract
// =========================================================================
console.log("\n[5] validateEarlyArgs() + writeTaskOutput()");

const { validateEarlyArgs, makeTaskSummary, writeTaskOutput } = await import("./lib/core.mjs");

{
  let failed = false;
  try {
    validateEarlyArgs({ model: "sonnet", outputDir: "/tmp/think-tank-smoke", rounds: 2, cycles: 1 });
  } catch {
    failed = true;
  }
  check(!failed, "validateEarlyArgs accepts valid model/output-dir/rounds/cycles");
}

{
  let failed = false;
  try {
    validateEarlyArgs({ model: "bad model with spaces" });
  } catch {
    failed = true;
  }
  check(failed, "validateEarlyArgs rejects invalid model names");
}

{
  const dir = mkdtempSync(join(tmpdir(), "think-tank-smoke-"));
  const out = join(dir, "output.json");
  const prevOutput = process.env.OUTPUT_FILE;
  process.env.OUTPUT_FILE = out;
  const payload = makeTaskSummary({
    mode: "review",
    status: "ok",
    outputFiles: ["/tmp/a.md", "/tmp/b.md"],
    durationMs: 1234,
    model: "sonnet",
  });
  const written = writeTaskOutput(payload);
  const raw = readFileSync(out, "utf-8");
  const parsed = JSON.parse(raw);
  check(written === out, "writeTaskOutput writes to OUTPUT_FILE when configured");
  check(parsed.mode === "review" && parsed.status === "ok", "writeTaskOutput persists structured summary JSON");
  check(Array.isArray(parsed.output_files) && parsed.output_files.length === 2, "task summary includes output_files");
  if (prevOutput === undefined) delete process.env.OUTPUT_FILE;
  else process.env.OUTPUT_FILE = prevOutput;
}

// =========================================================================
// 6. timestamp() format
// =========================================================================
console.log("\n[6] timestamp() format");

const { timestamp } = await import("./lib/core.mjs");
const ts = timestamp();
check(
  /^\d{4}-\d{2}-\d{2}-\d{6}$/.test(ts),
  `timestamp() returns YYYY-MM-DD-HHmmss format: ${ts}`
);

// =========================================================================
// 7. loadPrompt() loads and substitutes variables
// =========================================================================
console.log("\n[7] loadPrompt() variable substitution");

const { loadPrompt } = await import("./lib/core.mjs");

// Load a real prompt
{
  const prompt = loadPrompt("critic", "debate");
  check(
    prompt.length > 50,
    "loadPrompt('critic', 'debate') loads non-trivial content"
  );
}

// Variable substitution — use a prompt that has {ROUND} placeholder
{
  const prompt = loadPrompt("critic-followup", "debate", {
    ROUND: "42",
  });
  check(
    prompt.includes("42") && !prompt.includes("{ROUND}"),
    "loadPrompt substitutes {ROUND} variable"
  );
}

// Variable substitution with {DOCUMENT}
{
  const prompt = loadPrompt("agent-a", "example-custom", {
    DOCUMENT: "TEST_SUB_VALUE",
  });
  check(
    prompt.includes("TEST_SUB_VALUE") && !prompt.includes("{DOCUMENT}"),
    "loadPrompt substitutes {DOCUMENT} variable"
  );
}

// =========================================================================
// 8. plugin.json correctness
// =========================================================================
console.log("\n[8] plugin.json");

{
  const pjPath = join(PLUGIN_ROOT, ".claude-plugin", "plugin.json");
  if (fileExists(".claude-plugin/plugin.json", "plugin.json exists")) {
    const pj = JSON.parse(readFileSync(pjPath, "utf-8"));
    check(pj.name === "think-tank", "plugin.json name is 'think-tank'");
    check(pj.version === "5.0.0", "plugin.json version is '5.0.0'");
    check(
      pj.description && pj.description.length > 10,
      "plugin.json has description"
    );
  }
}

// =========================================================================
// 9. Command files exist and reference orchestrator.mjs
// =========================================================================
console.log("\n[9] Command files");

const expectedCommands = ["debate", "review", "brainstorm", "hypothesis", "cross-agent", "help"];

for (const cmd of expectedCommands) {
  const rel = `commands/${cmd}.md`;
  if (fileExists(rel, `commands/${cmd}.md exists`)) {
    const content = readFileSync(join(PLUGIN_ROOT, rel), "utf-8");
    // help.md doesn't need to reference orchestrator
    if (cmd !== "help") {
      check(
        content.includes("orchestrator.mjs"),
        `commands/${cmd}.md references orchestrator.mjs`
      );
    }
  }
}

// debate-help.md should NOT exist (was deleted in 1.9)
check(
  !existsSync(join(PLUGIN_ROOT, "commands", "debate-help.md")),
  "commands/debate-help.md does not exist (deleted)"
);

// =========================================================================
// 10. All callClaude invocations use --no-session-persistence
// =========================================================================
console.log("\n[10] callClaude uses --no-session-persistence");

{
  // The key check: callClaude in core.mjs always includes --no-session-persistence
  const coreSrc = readFileSync(
    join(PLUGIN_ROOT, "scripts", "lib", "core.mjs"),
    "utf-8"
  );

  check(
    coreSrc.includes('"--no-session-persistence"') ||
      coreSrc.includes("'--no-session-persistence'"),
    "core.mjs callClaude() includes --no-session-persistence in args"
  );

  // Verify no mode file calls claude directly (bypassing callClaude)
  const modeFiles = readdirSync(join(PLUGIN_ROOT, "scripts", "modes")).filter(
    (f) => f.endsWith(".mjs")
  );

  for (const mf of modeFiles) {
    const src = readFileSync(
      join(PLUGIN_ROOT, "scripts", "modes", mf),
      "utf-8"
    );
    check(
      !src.includes("spawnSync") || src.includes("spawnSync(\"git"),
      `modes/${mf} does not bypass callClaude with raw spawnSync (except git)`
    );
  }

  // Check orchestrator too
  const orchSrc = readFileSync(
    join(PLUGIN_ROOT, "scripts", "orchestrator.mjs"),
    "utf-8"
  );
  check(
    !orchSrc.includes('spawnSync("claude"'),
    "orchestrator.mjs does not bypass callClaude with raw spawnSync"
  );
}

// =========================================================================
// 11. Orchestrator file structure
// =========================================================================
console.log("\n[11] Orchestrator structure");

{
  const orchPath = join(PLUGIN_ROOT, "scripts", "orchestrator.mjs");
  if (fileExists("scripts/orchestrator.mjs", "orchestrator.mjs exists")) {
    const src = readFileSync(orchPath, "utf-8");
    // Verify it imports all 4 modes
    for (const mode of ["debate", "review", "brainstorm", "hypothesis"]) {
      check(
        src.includes(mode),
        `orchestrator.mjs references ${mode} mode`
      );
    }
    // Verify it imports from core
    check(
      src.includes("./lib/core.mjs") || src.includes("../lib/core.mjs"),
      "orchestrator.mjs imports from core.mjs"
    );
    // Syntax check via node --check (doesn't execute)
    const { spawnSync } = await import("node:child_process");
    const chk = spawnSync("node", ["--check", orchPath], {
      encoding: "utf-8",
    });
    check(chk.status === 0, "orchestrator.mjs passes syntax check");
  }
}

// =========================================================================
// Summary
// =========================================================================
console.log(`\n${"=".repeat(60)}`);
console.log(`Results: ${passes} passed, ${failures} failed`);
console.log("=".repeat(60));

if (failures > 0) {
  console.error("\nSMOKE TEST FAILED");
  process.exit(1);
} else {
  console.log("\nSMOKE TEST PASSED");
  process.exit(0);
}
