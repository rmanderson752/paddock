#!/usr/bin/env bash
# Show whether the Paddock launchd refresh agent is loaded, and recent log lines.
set -euo pipefail

LABEL="com.paddock.refresh"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOMAIN="gui/$(id -u)"

if launchctl print "$DOMAIN/$LABEL" > /dev/null 2>&1; then
  echo "Agent loaded: $LABEL (Monday and Thursday at 00:01 local time)"
  launchctl print "$DOMAIN/$LABEL" | grep -E "state|last exit" | sed 's/^/  /'
else
  echo "Agent NOT loaded — run: npm run schedule:install"
fi

LOG="$PROJECT_DIR/data/logs/refresh.log"
if [[ -f "$LOG" ]]; then
  echo
  echo "Last refresh log lines ($LOG):"
  tail -n 8 "$LOG" | sed 's/^/  /'
fi
