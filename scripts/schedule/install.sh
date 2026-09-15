#!/usr/bin/env bash
# Install the macOS launchd agent that refreshes the Paddock database every
# Monday and Thursday at 00:01 (local time). Safe to re-run — it replaces the
# existing agent.
#
#   npm run schedule:install
#   npm run schedule:status
#   npm run schedule:uninstall
set -euo pipefail

LABEL="com.paddock.refresh"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE="$SCRIPT_DIR/$LABEL.plist"
TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"

NPM="$(command -v npm || true)"
if [[ -z "$NPM" ]]; then
  echo "npm not found on PATH — install Node.js first" >&2
  exit 1
fi
NODE_BIN_DIR="$(dirname "$NPM")"

mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT_DIR/data/logs"

# Render the template
sed \
  -e "s|__NPM__|$NPM|g" \
  -e "s|__PROJECT_DIR__|$PROJECT_DIR|g" \
  -e "s|__NODE_BIN_DIR__|$NODE_BIN_DIR|g" \
  -e "s|__HOME__|$HOME|g" \
  "$TEMPLATE" > "$TARGET"

plutil -lint "$TARGET" > /dev/null

# (Re)load it for the current user's GUI session
DOMAIN="gui/$(id -u)"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$TARGET"

echo "Installed $TARGET"
echo "Schedule: Monday and Thursday at 00:01 (local time)"
echo "Command:  $NPM run db:refresh  (in $PROJECT_DIR)"
echo "Logs:     $PROJECT_DIR/data/logs/refresh.log, launchd.out.log, launchd.err.log"
echo
launchctl print "$DOMAIN/$LABEL" 2>/dev/null | grep -E "state|last exit|program|run interval" | sed 's/^/  /' || true
