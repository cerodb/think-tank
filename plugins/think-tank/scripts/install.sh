#!/usr/bin/env bash
set -euo pipefail

# Think Tank — Install Script
# Registers the repo as a Claude Code marketplace and installs the plugin

CLAUDE_DIR="${HOME}/.claude"
PLUGINS_DIR="${CLAUDE_DIR}/plugins"
MARKETPLACES_FILE="${PLUGINS_DIR}/known_marketplaces.json"
PLUGINS_FILE="${PLUGINS_DIR}/installed_plugins.json"
SETTINGS_FILE="${CLAUDE_DIR}/settings.json"

MARKETPLACE_NAME="think-tank"
GITHUB_REPO="cerodb/think-tank"

# Find repo root (two levels up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Verify structure
PLUGIN_DIR="${REPO_ROOT}/plugins/think-tank"
if [ ! -d "${PLUGIN_DIR}/.claude-plugin" ]; then
  echo "Error: Expected plugins/think-tank/.claude-plugin/ in ${REPO_ROOT}"
  exit 1
fi

# Read version from plugin.json
PLUGIN_JSON="${PLUGIN_DIR}/.claude-plugin/plugin.json"
PLUGIN_NAME=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(d.name)" "${PLUGIN_JSON}")
VERSION=$(node -e "const d=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));console.log(d.version)" "${PLUGIN_JSON}")
PLUGIN_KEY="${PLUGIN_NAME}@${MARKETPLACE_NAME}"
CACHE_DIR="${PLUGINS_DIR}/cache/${MARKETPLACE_NAME}/${PLUGIN_NAME}/${VERSION}"

echo "Installing ${PLUGIN_NAME} v${VERSION} (marketplace: ${MARKETPLACE_NAME})..."

# 1. Register marketplace
echo "  Registering marketplace..."
if [ ! -f "${MARKETPLACES_FILE}" ]; then
  mkdir -p "${PLUGINS_DIR}"
  echo '{}' > "${MARKETPLACES_FILE}"
fi

MARKETPLACE_DIR="${PLUGINS_DIR}/marketplaces/${MARKETPLACE_NAME}"
mkdir -p "${MARKETPLACE_DIR}"

# Copy marketplace structure (plugins/ directory)
if command -v rsync &>/dev/null; then
  rsync -a --exclude='.git' --exclude='node_modules' "${REPO_ROOT}/plugins/" "${MARKETPLACE_DIR}/plugins/"
else
  cp -r "${REPO_ROOT}/plugins/" "${MARKETPLACE_DIR}/plugins/"
fi

INSTALL_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

node -e "
const fs = require('fs');
const [file, name, repo, dir, date] = process.argv.slice(1);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data[name] = {
  source: { source: 'github', repo: repo },
  installLocation: dir,
  lastUpdated: date
};
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
" "${MARKETPLACES_FILE}" "${MARKETPLACE_NAME}" "${GITHUB_REPO}" "${MARKETPLACE_DIR}" "${INSTALL_DATE}"

# 2. Copy to cache
echo "  Copying to cache..."
mkdir -p "${CACHE_DIR}"
if command -v rsync &>/dev/null; then
  rsync -a --delete --exclude='.git' --exclude='node_modules' "${PLUGIN_DIR}/" "${CACHE_DIR}/"
else
  rm -rf "${CACHE_DIR:?}/"*
  cp -r "${PLUGIN_DIR}/"* "${PLUGIN_DIR}/".[!.]* "${CACHE_DIR}/" 2>/dev/null || true
fi

# Install npm dependencies if needed
if [ -f "${CACHE_DIR}/package.json" ] && grep -q '"dependencies"' "${CACHE_DIR}/package.json" 2>/dev/null; then
  echo "  Installing dependencies..."
  (cd "${CACHE_DIR}" && npm install --production --silent)
fi

# 3. Register in installed_plugins.json
echo "  Registering plugin..."
if [ ! -f "${PLUGINS_FILE}" ]; then
  echo '{"version":2,"plugins":{}}' > "${PLUGINS_FILE}"
fi

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

# 4. Enable in settings.json
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
