/**
 * Core utilities for think-tank plugin.
 * Extracted from adversarial.mjs — shared by all modes.
 */

import { spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  openSync,
  readSync,
  closeSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Resolve plugin root (two levels up from scripts/lib/)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..", "..");
const PROMPTS_DIR = resolve(PLUGIN_ROOT, "prompts");
const MODEL_NAME_RE = /^[a-zA-Z0-9._:-]+$/;

// ---------------------------------------------------------------------------
// callClaude — spawn Claude Code subprocess
// ---------------------------------------------------------------------------

/**
 * Call Claude via `claude -p` with optional flags.
 *
 * @param {string} prompt - Full prompt text (passed via stdin)
 * @param {Object} [options]
 * @param {string} [options.model] - Model override (e.g. "sonnet")
 * @param {string} [options.systemPrompt] - System prompt (--system-prompt flag)
 * @param {string[]} [options.tools] - Allowed tools list (--allowedTools flag)
 * @param {number} [options.timeout=600000] - Timeout in ms
 * @returns {string} Claude's response text
 */
export function callClaude(prompt, options = {}) {
  const env = { ...process.env };
  delete env.CLAUDECODE; // allow spawning from within Claude Code

  const args = ["-p", "--no-session-persistence"];

  if (options.model) {
    if (!MODEL_NAME_RE.test(options.model)) {
      throw new Error(`Invalid model name: ${options.model}`);
    }
    args.push("--model", options.model);
  }

  if (options.systemPrompt) {
    args.push("--system-prompt", options.systemPrompt);
  }

  if (options.tools && options.tools.length > 0) {
    args.push("--allowedTools", options.tools.join(","));
  }

  const timeout = options.timeout || 600_000; // 10 min default

  const result = spawnSync("claude", args, {
    input: prompt,
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
    timeout,
    env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const err = result.stderr || "Unknown error";
    throw new Error(`claude exited with status ${result.status}: ${err}`);
  }

  const output = result.stdout.trim();
  if (!output) {
    console.warn("WARNING: Claude returned an empty response.");
  }
  return output;
}

// ---------------------------------------------------------------------------
// loadPrompt — load prompt template with variable substitution
// ---------------------------------------------------------------------------

/**
 * Load a prompt file from prompts/<modeDir>/<name>.md and substitute variables.
 *
 * @param {string} name - Prompt filename without extension
 * @param {string} modeDir - Mode subdirectory under prompts/
 * @param {Object} [vars] - Template variables: {KEY} in text replaced with value
 * @returns {string} Prompt text with variables substituted
 */
export function loadPrompt(name, modeDir, vars = {}) {
  const file = resolve(PROMPTS_DIR, modeDir, `${name}.md`);
  if (!file.startsWith(PROMPTS_DIR)) {
    console.error(`Path traversal blocked: ${name}/${modeDir}`);
    process.exit(1);
  }
  if (!existsSync(file)) {
    console.error(`Prompt file not found: ${file}`);
    console.error(`Expected prompts in: ${PROMPTS_DIR}/${modeDir}/`);
    process.exit(1);
  }
  let text = readFileSync(file, "utf-8").trim();

  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }

  return text;
}

// ---------------------------------------------------------------------------
// parseArgs — unified argument parser for all modes
// ---------------------------------------------------------------------------

/**
 * Parse CLI arguments into a structured object.
 *
 * @param {string[]} argv - Arguments after mode extraction
 * @returns {{
 *   inputFile: string|null,
 *   topic: string|null,
 *   rounds: number,
 *   cycles: number,
 *   model: string|null,
 *   outputDir: string|null,
 *   file: string|null,
 *   mode: string|null,
 *   help?: boolean,
 *   unknownFlags: string[],
 *   parseWarnings: string[]
 * }}
 */
export function parseArgs(argv) {
  const result = {
    inputFile: null,
    topic: null,
    rounds: 2,
    cycles: 1,
    model: null,
    outputDir: null,
    file: null,
    mode: null,
    unknownFlags: [],
    parseWarnings: [],
  };

  const positionals = [];
  const takeValue = (arg, i) => {
    const eq = arg.indexOf("=");
    if (eq !== -1) {
      return { value: arg.slice(eq + 1), next: i };
    }
    if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      return { value: argv[i + 1], next: i + 1 };
    }
    return { value: null, next: i };
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const flag = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;

    if (flag === "--rounds") {
      const { value, next } = takeValue(arg, i);
      if (value === null) {
        result.parseWarnings.push("Missing value for --rounds");
      } else {
        const parsed = parseInt(value, 10);
        if (Number.isFinite(parsed)) {
          result.rounds = parsed;
        } else {
          result.parseWarnings.push(`Invalid --rounds value: ${value}`);
        }
      }
      i = next;
    } else if (flag === "--cycles") {
      const { value, next } = takeValue(arg, i);
      if (value === null) {
        result.parseWarnings.push("Missing value for --cycles");
      } else {
        const parsed = parseInt(value, 10);
        if (Number.isFinite(parsed)) {
          result.cycles = parsed;
        } else {
          result.parseWarnings.push(`Invalid --cycles value: ${value}`);
        }
      }
      i = next;
    } else if (flag === "--model") {
      const { value, next } = takeValue(arg, i);
      if (value === null) {
        result.parseWarnings.push("Missing value for --model");
      } else {
        result.model = value;
      }
      i = next;
    } else if (flag === "--output-dir") {
      const { value, next } = takeValue(arg, i);
      if (value === null) {
        result.parseWarnings.push("Missing value for --output-dir");
      } else {
        result.outputDir = value;
      }
      i = next;
    } else if (flag === "--file") {
      const { value, next } = takeValue(arg, i);
      if (value === null) {
        result.parseWarnings.push("Missing value for --file");
      } else {
        result.file = value;
      }
      i = next;
    } else if (flag === "--mode") {
      const { value, next } = takeValue(arg, i);
      if (value === null) {
        result.parseWarnings.push("Missing value for --mode");
      } else {
        result.mode = value;
      }
      i = next;
    } else if (flag === "--topic") {
      const { value, next } = takeValue(arg, i);
      if (value === null) {
        result.parseWarnings.push("Missing value for --topic");
      } else {
        result.topic = value;
      }
      i = next;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg.startsWith("--")) {
      const { value, next } = takeValue(arg, i);
      if (value !== null && !arg.includes("=")) {
        result.unknownFlags.push(`${arg}=${value}`);
      } else {
        result.unknownFlags.push(arg);
      }
      i = next;
    } else if (!arg.startsWith("--")) {
      positionals.push(arg);
    }
  }

  if (positionals.length > 0) {
    result.inputFile = positionals[0];
  }
  if (positionals.length > 1) {
    const tail = positionals.slice(1).join(" ").trim();
    if (tail) {
      result.topic = result.topic ? `${result.topic} ${tail}` : tail;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// timestamp — collision-free timestamp
// ---------------------------------------------------------------------------

/**
 * Generate a timestamp string in YYYY-MM-DD-HHmmss format.
 * Includes time to avoid collisions on same-day runs.
 *
 * @returns {string} Timestamp like "2026-03-08-143052"
 */
export function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  const date = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("-");

  const time = [
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");

  return `${date}-${time}`;
}

// ---------------------------------------------------------------------------
// preview — truncated first-line preview
// ---------------------------------------------------------------------------

/**
 * Return the first non-empty line of text, truncated to maxLen.
 *
 * @param {string} text
 * @param {number} [maxLen=120]
 * @returns {string}
 */
export function preview(text, maxLen = 120) {
  const first = text.split("\n").find((l) => l.trim()) || "";
  return first.length > maxLen ? first.slice(0, maxLen) + "..." : first;
}

// ---------------------------------------------------------------------------
// wrapDoc — wrap content in document tags
// ---------------------------------------------------------------------------

/**
 * Wrap document content in <DOCUMENT> XML tags.
 *
 * @param {string} doc - Raw document content
 * @returns {string} Wrapped content
 */
export function wrapDoc(doc) {
  return `<DOCUMENT>\n${doc}\n</DOCUMENT>`;
}

// ---------------------------------------------------------------------------
// isBinaryFile — detect binary files by null bytes in first 1024 chars
// ---------------------------------------------------------------------------

/**
 * Check if a file appears to be binary by looking for null bytes.
 *
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if file appears to be binary
 */
export function isBinaryFile(filePath) {
  try {
    const buf = Buffer.alloc(1024);
    const fd = openSync(filePath, "r");
    const bytesRead = readSync(fd, buf, 0, 1024, 0);
    closeSync(fd);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// saveFile — write file with recursive directory creation
// ---------------------------------------------------------------------------

/**
 * Write content to a file, creating parent directories as needed.
 *
 * @param {string} content - File content to write
 * @param {string} filePath - Absolute or relative path to write to
 */
export function saveFile(content, filePath) {
  const resolved = resolve(filePath);
  const cwd = resolve(process.cwd());
  if (!resolved.startsWith(cwd + "/") && !resolved.startsWith("/tmp/") && resolved !== cwd) {
    throw new Error(`Output path escapes working directory: ${resolved}`);
  }
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, content);
}

// ---------------------------------------------------------------------------
// validateEarlyArgs — fail fast before expensive model calls
// ---------------------------------------------------------------------------

/**
 * Validate commonly used args before mode execution.
 *
 * @param {{
 *   rounds?: number,
 *   cycles?: number,
 *   model?: string|null,
 *   outputDir?: string|null
 * }} args
 */
export function validateEarlyArgs(args) {
  if (args.model && !MODEL_NAME_RE.test(args.model)) {
    throw new Error(`Invalid --model value: ${args.model}`);
  }

  if (args.outputDir) {
    const resolved = resolve(args.outputDir);
    const cwd = resolve(process.cwd());
    if (!resolved.startsWith(cwd + "/") && !resolved.startsWith("/tmp/") && resolved !== cwd) {
      throw new Error(`Invalid --output-dir (outside workspace): ${args.outputDir}`);
    }
  }

  if (args.rounds !== undefined && (!Number.isInteger(args.rounds) || args.rounds < 1)) {
    throw new Error(`Invalid --rounds value: ${args.rounds} (must be integer >= 1)`);
  }

  if (args.cycles !== undefined && (!Number.isInteger(args.cycles) || args.cycles < 1)) {
    throw new Error(`Invalid --cycles value: ${args.cycles} (must be integer >= 1)`);
  }
}

// ---------------------------------------------------------------------------
// makeTaskSummary — structured output contract
// ---------------------------------------------------------------------------

/**
 * Build normalized summary payload for task/caller integrations.
 *
 * @param {{
 *   mode: string,
 *   status: "ok"|"error",
 *   outputFiles?: string[],
 *   durationMs?: number,
 *   model?: string|null,
 *   note?: string|null
 * }} input
 */
export function makeTaskSummary(input) {
  return {
    tool: "think-tank",
    mode: input.mode,
    status: input.status,
    output_files: Array.isArray(input.outputFiles) ? input.outputFiles : [],
    duration_ms: Number.isFinite(input.durationMs) ? Math.max(0, Math.round(input.durationMs)) : null,
    model: input.model || null,
    note: input.note || null,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// writeTaskOutput — best-effort short summary for task systems (.output/env)
// ---------------------------------------------------------------------------

/**
 * Write a short run summary to task output file if configured.
 *
 * Recognized env vars (first available wins):
 * - TASK_OUTPUT_FILE
 * - CLAUDE_TASK_OUTPUT
 * - CLAUDE_OUTPUT_FILE
 * - OUTPUT_FILE
 *
 * Fallback:
 * - writes to ./.output (creates file if missing)
 *
 * @param {string|Object} summary
 * @returns {string|null} Path written, or null on failure
 */
export function writeTaskOutput(summary) {
  let text = "";
  if (typeof summary === "string") {
    text = summary.trim() + "\n";
  } else if (summary && typeof summary === "object") {
    text = JSON.stringify(summary, null, 2) + "\n";
  } else {
    text = "\n";
  }
  const cwd = resolve(process.cwd());

  const candidates = [];
  for (const name of ["TASK_OUTPUT_FILE", "CLAUDE_TASK_OUTPUT", "CLAUDE_OUTPUT_FILE", "OUTPUT_FILE"]) {
    const value = process.env[name];
    if (value) {
      candidates.push(resolve(value));
    }
  }

  if (candidates.length === 0) {
    candidates.push(resolve(cwd, ".output"));
  } else {
    candidates.push(resolve(cwd, ".output"));
  }

  const sysTmp = resolve(tmpdir());
  for (const target of candidates) {
    try {
      if (
        !target.startsWith(cwd + "/") &&
        !target.startsWith("/tmp/") &&
        !target.startsWith(sysTmp + "/") &&
        target !== cwd
      ) {
        continue;
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text, "utf-8");
      return target;
    } catch {
      // best-effort only
    }
  }

  return null;
}
