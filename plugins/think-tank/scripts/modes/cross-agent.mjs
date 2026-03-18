/**
 * Cross-agent mode — Claude/Codex consultation with optional arbiter.
 */

import { join } from "node:path";
import {
  callClaude,
  callCodex,
  loadPrompt,
  timestamp,
  saveFile,
  makeTaskSummary,
  writeTaskOutput,
} from "../lib/core.mjs";

function loadCrossAgentPrompt(name, vars = {}) {
  return loadPrompt(name, "cross-agent", vars);
}

function buildArbiterPrompt(claudeResponse, codexResponse) {
  return loadCrossAgentPrompt("arbiter", {
    CLAUDE_RESPONSE: claudeResponse,
    CODEX_RESPONSE: codexResponse,
  });
}

function section(title, body) {
  return `## ${title}\n\n${body && body.trim() ? body : "_No response_"}\n`;
}

/**
 * Run a cross-agent consultation.
 *
 * @param {Object} args - Parsed args from parseArgs()
 */
export function runCrossAgent(args) {
  const startedAt = Date.now();

  if (args.help) {
    console.log("Usage: node scripts/orchestrator.mjs cross-agent --topic \"question\" [options]");
    console.log("  --target claude|codex|both    Agent target (default: codex)");
    console.log("  --arbiter                     Run synthesis after both responses");
    console.log("  --arbiter-target claude|codex Arbiter backend (default: codex)");
    console.log("  --max-budget-usd N            Claude max budget per call (default: 0.50)");
    console.log("  --model MODEL                 Model override (applies to called backend)");
    console.log("  --output-dir DIR              Output directory");
    return;
  }

  if (process.env.CROSS_AGENT_HOP === "1") {
    console.error("Recursive cross-agent call blocked (max 1 hop).");
    process.exit(1);
  }

  const topic = args.topic || args.inputFile;
  if (!topic || !topic.trim()) {
    console.error("Error: --topic is required for cross-agent mode.");
    process.exit(1);
  }

  let target = args.target || "codex";
  const arbiterEnabled = Boolean(args.arbiter);
  const arbiterTarget = args.arbiterTarget || "codex";
  if (arbiterEnabled) {
    target = "both";
  }

  const ts = timestamp();
  const outputDir = args.outputDir || join(process.cwd(), "cross-agent");
  const outputFile = join(outputDir, `cross-agent-${ts}.md`);
  const model = args.model || null;
  const maxBudgetUsd = args.maxBudgetUsd || "0.50";

  const baseEnv = { ...process.env, CROSS_AGENT_HOP: "1" };
  const claudeOptions = { model, maxBudgetUsd };
  const codexOptions = { model, sandbox: "read-only" };

  console.log("\nCROSS-AGENT MODE");
  console.log(`  Target: ${target}`);
  console.log(`  Arbiter: ${arbiterEnabled ? `yes (${arbiterTarget})` : "no"}`);
  console.log(`  Claude budget: $${maxBudgetUsd}`);
  console.log("  Codex sandbox: read-only");

  const parts = [
    "# Cross-Agent Consultation",
    "",
    `- **Date**: ${ts}`,
    `- **Target**: ${target}`,
    `- **Arbiter**: ${arbiterEnabled ? arbiterTarget : "none"}`,
    `- **Topic**: "${topic}"`,
    "",
    "---",
    "",
  ];

  let claudeResponse = "";
  let codexResponse = "";
  let arbiterResponse = "";

  try {
    if (target === "claude" || target === "both") {
      console.log("[CLAUDE] Running...");
      claudeResponse = callClaude(topic, { ...claudeOptions, env: baseEnv });
      parts.push(section("Claude Response", claudeResponse));
    }

    if (target === "codex" || target === "both") {
      console.log("[CODEX] Running...");
      codexResponse = callCodex(topic, { ...codexOptions, env: baseEnv });
      parts.push(section("Codex Response", codexResponse));
    }
  } catch (err) {
    parts.push(section("Execution Error", String(err?.message || err)));
    saveFile(parts.join("\n"), outputFile);
    console.error(`Error during cross-agent run: ${err.message}`);
    console.error(`Partial output saved to: ${outputFile}`);
    process.exit(1);
  }

  if (arbiterEnabled) {
    try {
      console.log(`[ARBITER:${arbiterTarget.toUpperCase()}] Running...`);
      const arbiterPrompt = buildArbiterPrompt(claudeResponse, codexResponse);
      if (arbiterTarget === "claude") {
        arbiterResponse = callClaude(arbiterPrompt, { ...claudeOptions, env: baseEnv });
      } else {
        arbiterResponse = callCodex(arbiterPrompt, { ...codexOptions, env: baseEnv });
      }
      parts.push(section("Arbiter Synthesis", arbiterResponse));
    } catch (err) {
      parts.push(section("Arbiter Error", String(err?.message || err)));
    }
  }

  saveFile(parts.join("\n"), outputFile);
  console.log(`Output saved to: ${outputFile}`);

  writeTaskOutput(
    makeTaskSummary({
      mode: "cross-agent",
      status: "ok",
      outputFiles: [outputFile],
      durationMs: Date.now() - startedAt,
      model,
      note: arbiterEnabled ? `arbiter=${arbiterTarget}` : null,
    })
  );
}
