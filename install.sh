#!/bin/bash
set -e

PLUGIN_NAME="think-tank"
INSTALL_DIR="${HOME}/.claude/plugins/${PLUGIN_NAME}"

echo "Installing ${PLUGIN_NAME} plugin..."

# Check Claude Code is installed
if ! command -v claude &> /dev/null; then
  echo "Error: Claude Code is not installed. Install it first: https://code.claude.com"
  exit 1
fi

# Determine source: script directory (if run from cloned/unzipped repo)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "${SCRIPT_DIR}/.claude-plugin/plugin.json" ]; then
  echo "Error: plugin.json not found. Run this script from the think-tank directory."
  exit 1
fi

# Copy plugin to ~/.claude/plugins/
if [ -d "$INSTALL_DIR" ]; then
  echo "Removing previous installation..."
  rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"
cp -r "${SCRIPT_DIR}/.claude-plugin" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/commands" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/prompts" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/scripts" "$INSTALL_DIR/"
cp "${SCRIPT_DIR}/hypothesis-template.md" "$INSTALL_DIR/" 2>/dev/null || true
cp "${SCRIPT_DIR}/package.json" "$INSTALL_DIR/" 2>/dev/null || true

# Install via Claude Code
claude plugin install "$INSTALL_DIR"

echo ""
echo "✓ ${PLUGIN_NAME} installed successfully!"
echo ""
echo "Available commands:"
echo "  /think-tank:debate <file>       — Adversarial document improvement"
echo "  /think-tank:review <file>       — Multi-reviewer code review"
echo "  /think-tank:brainstorm <topic>  — Diverge-challenge-synthesize ideation"
echo "  /think-tank:hypothesis          — Hypothesis-driven research"
echo "  /think-tank:help                — Show all modes"
