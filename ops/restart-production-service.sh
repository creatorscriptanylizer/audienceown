#!/bin/sh
set -eu

LABEL=com.audienceown.production
DOMAIN="gui/$(id -u)"
PLIST_SOURCE=/Users/nana/audienceown-releases/current/ops/com.audienceown.production.plist
PLIST_TARGET=/Users/nana/Library/LaunchAgents/com.audienceown.production.plist

test -f "$PLIST_SOURCE"
cp "$PLIST_SOURCE" "$PLIST_TARGET"
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
for attempt in 1 2 3 4 5; do
  if launchctl bootstrap "$DOMAIN" "$PLIST_TARGET"; then
    launchctl kickstart -k "$DOMAIN/$LABEL"
    exit 0
  fi
  sleep 1
done
echo "Failed to bootstrap $LABEL after 5 attempts." >&2
exit 1
