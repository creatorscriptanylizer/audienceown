import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? ".next";
const required = ["BUILD_ID", "build-manifest.json", "routes-manifest.json", "server/app-paths-manifest.json"];
for (const file of required) if (!existsSync(join(root, file))) throw new Error(`BUILD GUARD: missing ${join(root, file)}`);
const buildId = readFileSync(join(root, "BUILD_ID"), "utf8").trim();
if (!buildId) throw new Error("BUILD GUARD: empty BUILD_ID");
const staticRoot = join(root, "static");
if (!existsSync(staticRoot) || !readdirSync(staticRoot).length) throw new Error("BUILD GUARD: no emitted static assets");
const digest = createHash("sha256");
for (const file of required) digest.update(readFileSync(join(root, file)));
console.log(JSON.stringify({ buildId, manifestDigest: digest.digest("hex"), buildRoot: root }));
