#!/bin/bash
set -e

PLUGIN_NAME="think-tank"
INSTALL_DIR="${HOME}/.claude/plugins/${PLUGIN_NAME}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="${SCRIPT_DIR}/plugins/${PLUGIN_NAME}"

echo "Installing ${PLUGIN_NAME} plugin..."

# Check Claude Code is installed
if ! command -v claude &> /dev/null; then
  echo "Error: Claude Code is not installed. Install it first: https://code.claude.com"
  exit 1
fi

if [ ! -f "${PLUGIN_DIR}/.claude-plugin/plugin.json" ]; then
  echo "Error: plugin.json not found. Run this script from the think-tank repo root."
  exit 1
fi

# Copy plugin to ~/.claude/plugins/
if [ -d "$INSTALL_DIR" ]; then
  echo "Removing previous installation..."
  rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"
cp -r "${PLUGIN_DIR}/.claude-plugin" "$INSTALL_DIR/"
cp -r "${PLUGIN_DIR}/commands" "$INSTALL_DIR/"
cp -r "${PLUGIN_DIR}/prompts" "$INSTALL_DIR/"
cp -r "${PLUGIN_DIR}/scripts" "$INSTALL_DIR/"
cp "${PLUGIN_DIR}/hypothesis-template.md" "$INSTALL_DIR/" 2>/dev/null || true
cp "${PLUGIN_DIR}/package.json" "$INSTALL_DIR/" 2>/dev/null || true

# Install via Claude Code
claude plugin install "$INSTALL_DIR"

echo ""
echo "Done! ${PLUGIN_NAME} installed."
echo ""
echo "Or install via marketplace (recommended):"
echo "  claude plugin marketplace add cerodb/think-tank"
echo "  claude plugin install think-tank@think-tank"
echo ""
echo "Commands:"
echo "  /think-tank:debate <file>       — Adversarial document improvement"
echo "  /think-tank:review <file>       — Multi-reviewer code review"
echo "  /think-tank:brainstorm <topic>  — Diverge-challenge-synthesize ideation"
echo "  /think-tank:hypothesis          — Hypothesis-driven research"
echo "  /think-tank:help                — Show all modes"
