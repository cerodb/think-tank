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
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Resolve plugin root (two levels up from scripts/lib/)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, "..", "..");
const PROMPTS_DIR = join(PLUGIN_ROOT, "prompts");

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
  const file = join(PROMPTS_DIR, modeDir, `${name}.md`);
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
 * @returns {{ inputFile: string|null, topic: string|null, rounds: number, cycles: number, model: string|null, outputDir: string|null, file: string|null, mode: string|null }}
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
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--rounds" && argv[i + 1]) {
      result.rounds = parseInt(argv[i + 1], 10);
      i++;
    } else if (arg === "--cycles" && argv[i + 1]) {
      result.cycles = parseInt(argv[i + 1], 10);
      i++;
    } else if (arg === "--model" && argv[i + 1]) {
      result.model = argv[i + 1];
      i++;
    } else if (arg === "--output-dir" && argv[i + 1]) {
      result.outputDir = argv[i + 1];
      i++;
    } else if (arg === "--file" && argv[i + 1]) {
      result.file = argv[i + 1];
      i++;
    } else if (arg === "--mode" && argv[i + 1]) {
      result.mode = argv[i + 1];
      i++;
    } else if (arg === "--topic" && argv[i + 1]) {
      result.topic = argv[i + 1];
      i++;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (!arg.startsWith("--")) {
      // First positional arg is inputFile
      if (!result.inputFile) {
        result.inputFile = arg;
      } else if (!result.topic) {
        // Second positional could be topic
        result.topic = arg;
      }
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
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}
