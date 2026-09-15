#!/usr/bin/env bash
# Remove the Paddock launchd refresh agent.
set -euo pipefail

LABEL="com.paddock.refresh"
TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
if [[ -f "$TARGET" ]]; then
  rm "$TARGET"
  echo "Removed $TARGET"
else
  echo "Agent was not installed"
fi
