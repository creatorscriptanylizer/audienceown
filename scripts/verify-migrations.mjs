import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const EXPECTED_PRODUCTION_PROJECT_REF = "jngmxlcibqmtrvskxdcw";

let linkedProjectRef;
try {
  linkedProjectRef = readFileSync("supabase/.temp/project-ref", "utf8").trim();
} catch (error) {
  throw new Error(`MIGRATION GUARD: unable to determine linked production project. ${error instanceof Error ? error.message : String(error)}`);
}
if (linkedProjectRef !== EXPECTED_PRODUCTION_PROJECT_REF) {
  throw new Error(`MIGRATION GUARD: linked project ref does not match the required production project (${EXPECTED_PRODUCTION_PROJECT_REF}).`);
}
if (process.env.SUPABASE_PROJECT_REF && process.env.SUPABASE_PROJECT_REF !== linkedProjectRef) {
  throw new Error("MIGRATION GUARD: SUPABASE_PROJECT_REF does not match the linked production project.");
}

const local = readdirSync("supabase/migrations")
  .map((name) => /^(\d{14})_.*\.sql$/.exec(name)?.[1])
  .filter(Boolean)
  .sort();

if (!local.length) throw new Error("MIGRATION GUARD: no local migrations found.");
if (process.env.ALLOW_UNVERIFIED_MIGRATIONS === "1") {
  console.warn("MIGRATION GUARD: bypassed explicitly; never set this in production deployment.");
  process.exit(0);
}

let output;
try {
  output = execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["supabase", "migration", "list", "--linked"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
  });
} catch (error) {
  const detail = error?.stderr?.toString().trim() || error?.message;
  throw new Error(`MIGRATION GUARD: unable to verify linked production migrations. ${detail}`);
}

const remote = new Set();
const normalizedOutput = output.trim();
if (normalizedOutput.startsWith("{")) {
  let payload;
  try {
    payload = JSON.parse(normalizedOutput);
  } catch (error) {
    throw new Error(`MIGRATION GUARD: Supabase CLI returned invalid JSON. ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Array.isArray(payload?.migrations)) throw new Error("MIGRATION GUARD: Supabase CLI JSON did not contain a migrations array.");
  for (const migration of payload.migrations) {
    if (/^\d{14}$/.test(migration?.remote ?? "")) remote.add(migration.remote);
  }
} else {
  for (const line of output.split("\n")) {
    const columns = line.split("|").map((value) => value.trim());
    if (/^\d{14}$/.test(columns[1] ?? "")) remote.add(columns[1]);
  }
}
const missing = local.filter((version) => !remote.has(version));
if (missing.length) throw new Error(`MIGRATION GUARD: production is missing ${missing.length} required migration(s): ${missing.join(", ")}`);
console.log(`Migration guard passed for project ${linkedProjectRef}: ${local.length} repository migrations exist in the linked production database.`);
