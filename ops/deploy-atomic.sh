#!/bin/sh
set -eu

: "${AUDIENCEOWN_RELEASE_ROOT:?Set AUDIENCEOWN_RELEASE_ROOT to the releases directory}"
: "${AUDIENCEOWN_SERVICE_RESTART:?Set AUDIENCEOWN_SERVICE_RESTART to an executable restart command}"
: "${AUDIENCEOWN_ENV_FILE:?Set AUDIENCEOWN_ENV_FILE to the external production environment file}"
: "${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF to the production Supabase project ref}"

EXPECTED_SUPABASE_PROJECT_REF=jngmxlcibqmtrvskxdcw
if [ "$SUPABASE_PROJECT_REF" != "$EXPECTED_SUPABASE_PROJECT_REF" ]; then
  echo "Deployment refused: SUPABASE_PROJECT_REF is not the required production project." >&2
  exit 1
fi
if [ ! -f "$AUDIENCEOWN_ENV_FILE" ]; then
  echo "Deployment refused: AUDIENCEOWN_ENV_FILE is not a readable file." >&2
  exit 1
fi

SOURCE_ROOT=$(pwd -P)
RELEASE_ID=${RELEASE_ID:-$(git rev-parse HEAD)-$(date -u +%Y%m%dT%H%M%SZ)}
RELEASE_DIR="$AUDIENCEOWN_RELEASE_ROOT/releases/$RELEASE_ID"
CURRENT_LINK="$AUDIENCEOWN_RELEASE_ROOT/current"
PREVIOUS_LINK="$AUDIENCEOWN_RELEASE_ROOT/previous"

test ! -e "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
git archive --format=tar HEAD | tar -xf - -C "$RELEASE_DIR"
cp "$SOURCE_ROOT/package-lock.json" "$RELEASE_DIR/package-lock.json"
ln -s "$AUDIENCEOWN_ENV_FILE" "$RELEASE_DIR/.env.local"
mkdir -p "$RELEASE_DIR/supabase/.temp"
printf '%s\n' "$SUPABASE_PROJECT_REF" > "$RELEASE_DIR/supabase/.temp/project-ref"

cd "$RELEASE_DIR"
npm ci
SUPABASE_TELEMETRY_DISABLED=1 npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --yes
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
  mv -fh "$PREVIOUS_LINK.new" "$PREVIOUS_LINK"
fi
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK.new"
mv -fh "$CURRENT_LINK.new" "$CURRENT_LINK"
"$AUDIENCEOWN_SERVICE_RESTART"

HEALTH_URL=${AUDIENCEOWN_HEALTH_URL:-https://audienceown.com/api/health}
HEALTHY=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent --show-error --max-time 10 "$HEALTH_URL" >/dev/null; then
    HEALTHY=1
    break
  fi
  sleep 2
done
if [ "$HEALTHY" != "1" ]; then
  echo "New release failed its production health check." >&2
  if [ -L "$PREVIOUS_LINK" ]; then
    PREVIOUS_TARGET=$(readlink "$PREVIOUS_LINK")
    ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK.new"
    mv -fh "$CURRENT_LINK.new" "$CURRENT_LINK"
    "$AUDIENCEOWN_SERVICE_RESTART"
    echo "Rolled back current to $PREVIOUS_TARGET." >&2
  fi
  exit 1
fi

echo "Released $RELEASE_ID. Roll back by atomically repointing $CURRENT_LINK to $(readlink "$PREVIOUS_LINK" 2>/dev/null || echo '<previous release>')."
