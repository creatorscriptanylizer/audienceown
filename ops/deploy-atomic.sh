#!/bin/sh
set -eu

: "${AUDIENCEOWN_RELEASE_ROOT:?Set AUDIENCEOWN_RELEASE_ROOT to the releases directory}"
: "${AUDIENCEOWN_SERVICE_RESTART:?Set AUDIENCEOWN_SERVICE_RESTART to an executable restart command}"

SOURCE_ROOT=$(pwd -P)
RELEASE_ID=${RELEASE_ID:-$(git rev-parse HEAD)-$(date -u +%Y%m%dT%H%M%SZ)}
RELEASE_DIR="$AUDIENCEOWN_RELEASE_ROOT/releases/$RELEASE_ID"
CURRENT_LINK="$AUDIENCEOWN_RELEASE_ROOT/current"
PREVIOUS_LINK="$AUDIENCEOWN_RELEASE_ROOT/previous"

test ! -e "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
git archive --format=tar HEAD | tar -xf - -C "$RELEASE_DIR"
cp "$SOURCE_ROOT/package-lock.json" "$RELEASE_DIR/package-lock.json"

cd "$RELEASE_DIR"
npm ci
npm run verify:migrations
DEPLOYMENT_VERSION="$RELEASE_ID" npm run build
npm run verify:production-build

if [ "${SKIP_VISUAL_GATE:-0}" != "1" ]; then
  PORT=${VISUAL_GATE_PORT:-3100} PLAYWRIGHT_BASE_URL="http://127.0.0.1:${VISUAL_GATE_PORT:-3100}" npm run start:production &
  CANDIDATE_PID=$!
  trap 'kill "$CANDIDATE_PID" 2>/dev/null || true' EXIT INT TERM
  PLAYWRIGHT_EXTERNAL_SERVER=1 PLAYWRIGHT_BASE_URL="http://127.0.0.1:${VISUAL_GATE_PORT:-3100}" npm run test:visual
  kill "$CANDIDATE_PID"
  wait "$CANDIDATE_PID" 2>/dev/null || true
  trap - EXIT INT TERM
fi

if [ -L "$CURRENT_LINK" ]; then
  OLD_TARGET=$(readlink "$CURRENT_LINK")
  ln -sfn "$OLD_TARGET" "$PREVIOUS_LINK.new"
  mv -f "$PREVIOUS_LINK.new" "$PREVIOUS_LINK"
fi
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK.new"
mv -f "$CURRENT_LINK.new" "$CURRENT_LINK"
"$AUDIENCEOWN_SERVICE_RESTART"

echo "Released $RELEASE_ID. Roll back by atomically repointing $CURRENT_LINK to $(readlink "$PREVIOUS_LINK" 2>/dev/null || echo '<previous release>')."
