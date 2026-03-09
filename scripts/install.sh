#!/usr/bin/env bash
set -euo pipefail

# Think Tank — Install Script
# Copies plugin to Claude Code cache and registers it

CLAUDE_DIR="${HOME}/.claude"
PLUGINS_FILE="${CLAUDE_DIR}/plugins/installed_plugins.json"
SETTINGS_FILE="${CLAUDE_DIR}/settings.json"

# Find plugin root (where .claude-plugin/ lives)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ ! -d "${PLUGIN_ROOT}/.claude-plugin" ]; then
  echo "Error: .claude-plugin/ not found in ${PLUGIN_ROOT}"
  echo "Run this script from inside the plugin repo."
  exit 1
fi

# Read name and version from plugin.json
PLUGIN_JSON="${PLUGIN_ROOT}/.claude-plugin/plugin.json"
PLUGIN_NAME=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(d.name)" "${PLUGIN_JSON}")
VERSION=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(d.version)" "${PLUGIN_JSON}")
PLUGIN_KEY="${PLUGIN_NAME}@local"
CACHE_DIR="${CLAUDE_DIR}/plugins/cache/local/${PLUGIN_NAME}/${VERSION}"

echo "Installing ${PLUGIN_NAME} v${VERSION}..."

# 1. Copy to cache (exclude .git and node_modules)
echo "  Copying to ${CACHE_DIR}..."
mkdir -p "${CACHE_DIR}"
if command -v rsync &>/dev/null; then
  rsync -a --delete --exclude='.git' --exclude='node_modules' "${PLUGIN_ROOT}/" "${CACHE_DIR}/"
else
  rm -rf "${CACHE_DIR:?}/"*
  cd "${PLUGIN_ROOT}"
  find . -not -path './.git/*' -not -path './.git' -not -path './node_modules/*' -not -path './node_modules' | while read -r f; do
    if [ -d "$f" ]; then
      mkdir -p "${CACHE_DIR}/$f"
    else
      cp "$f" "${CACHE_DIR}/$f"
    fi
  done
fi

# Install npm dependencies if needed
if [ -f "${CACHE_DIR}/package.json" ] && grep -q '"dependencies"' "${CACHE_DIR}/package.json" 2>/dev/null; then
  echo "  Installing dependencies..."
  (cd "${CACHE_DIR}" && npm install --production --silent)
fi

# 2. Register in installed_plugins.json
echo "  Registering plugin..."
if [ ! -f "${PLUGINS_FILE}" ]; then
  mkdir -p "$(dirname "${PLUGINS_FILE}")"
  echo '{"version":2,"plugins":{}}' > "${PLUGINS_FILE}"
fi

INSTALL_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

node -e "
const fs = require('fs');
const [file, key, path, ver, date] = process.argv.slice(1);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.plugins = data.plugins || {};
data.plugins[key] = [{
  scope: 'user',
  installPath: path,
  version: ver,
  installedAt: date,
  lastUpdated: date
}];
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
" "${PLUGINS_FILE}" "${PLUGIN_KEY}" "${CACHE_DIR}" "${VERSION}" "${INSTALL_DATE}"

# 3. Enable in settings.json
echo "  Enabling plugin..."
if [ ! -f "${SETTINGS_FILE}" ]; then
  echo '{}' > "${SETTINGS_FILE}"
fi

node -e "
const fs = require('fs');
const [file, key] = process.argv.slice(1);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.enabledPlugins = data.enabledPlugins || {};
data.enabledPlugins[key] = true;
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
" "${SETTINGS_FILE}" "${PLUGIN_KEY}"

echo ""
echo "Done! Restart Claude Code and try:"
echo "  /${PLUGIN_NAME}:help"
echo "  /${PLUGIN_NAME}:debate <file>"
echo "  /${PLUGIN_NAME}:review <file>"
echo "  /${PLUGIN_NAME}:brainstorm \"topic\""
echo "  /${PLUGIN_NAME}:hypothesis --file hypothesis.md"
