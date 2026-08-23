import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const deploy = readFileSync("ops/deploy-atomic.sh", "utf8");
const verifier = readFileSync("scripts/verify-migrations.mjs", "utf8");
const restart = readFileSync("ops/restart-production-service.sh", "utf8");

describe("atomic deployment migration link", () => {
  it("requires the explicit production project ref and materializes only project-ref", () => {
    expect(deploy).toContain(": \"${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF to the production Supabase project ref}\"");
    expect(deploy).toContain("EXPECTED_SUPABASE_PROJECT_REF=jngmxlcibqmtrvskxdcw");
    expect(deploy).toContain('mkdir -p "$RELEASE_DIR/supabase/.temp"');
    expect(deploy).toContain('> "$RELEASE_DIR/supabase/.temp/project-ref"');
    expect(deploy).not.toMatch(/cp[^\n]*supabase\/\.temp/);
    expect(deploy).toContain(": \"${AUDIENCEOWN_ENV_FILE:?Set AUDIENCEOWN_ENV_FILE to the external production environment file}\"");
    expect(deploy).toContain('npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --yes');
    expect(deploy).toContain('ln -s "$AUDIENCEOWN_ENV_FILE" "$RELEASE_DIR/.env.local"');
    expect(deploy).toContain("curl --fail --silent --show-error");
    expect(deploy).toContain('ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK.new"');
    expect(deploy.match(/mv -fh/g)).toHaveLength(3);
  });

  it("fails closed unless the linked project is production", () => {
    expect(verifier).toContain('EXPECTED_PRODUCTION_PROJECT_REF = "jngmxlcibqmtrvskxdcw"');
    expect(verifier).toContain('readFileSync("supabase/.temp/project-ref"');
    expect(verifier).toContain("linkedProjectRef !== EXPECTED_PRODUCTION_PROJECT_REF");
    expect(verifier).toContain("SUPABASE_PROJECT_REF does not match");
    expect(verifier).toContain('JSON.parse(normalizedOutput)');
    expect(verifier).toContain("Supabase CLI JSON did not contain a migrations array");
  });

  it("reloads only the canonical production launchd service from current", () => {
    expect(restart).toContain("LABEL=com.audienceown.production");
    expect(restart).toContain("/Users/nana/audienceown-releases/current/ops/com.audienceown.production.plist");
    expect(restart).toContain('launchctl bootout "$DOMAIN/$LABEL"');
    expect(restart).toContain('launchctl bootstrap "$DOMAIN" "$PLIST_TARGET"');
    expect(restart).toContain('launchctl kickstart -k "$DOMAIN/$LABEL"');
    expect(restart).toContain("for attempt in 1 2 3 4 5");
  });
});
