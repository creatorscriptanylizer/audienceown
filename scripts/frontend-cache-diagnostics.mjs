import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { authoritativeCssImports, cssContract } from "./frontend-cache-contract.mjs";

const strict = process.argv.includes("--strict");
const failures = [];
const projectRoot = process.cwd();

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function filesBelow(directory, predicate) {
  if (!(await exists(directory))) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(target, predicate) : predicate(target) ? [target] : [];
  }));
  return nested.flat();
}

function relative(file) { return path.relative(projectRoot, file); }
function compact(value) { return value.replace(/\s+/g, ""); }
function check(label, passed) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
  if (!passed) failures.push(label);
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
console.log(`Next.js: ${packageJson.dependencies.next}`);
console.log("Default dev bundler: Turbopack (Next.js 16 default; package script is `next dev`)");
console.log("Optional diagnostic bundler: Webpack (`npm run dev:webpack` -> `next dev --webpack`)");
console.log("Output isolation: development=.next/dev, production=.next/static");

const sourceContents = await Promise.all(cssContract.sourceFiles.map((file) => readFile(file, "utf8")));
const sourceCss = sourceContents.join("\n");
const marker = createHash("sha256");
for (let index = 0; index < cssContract.sourceFiles.length; index += 1) {
  marker.update(cssContract.sourceFiles[index]);
  marker.update(sourceContents[index]);
}
console.log(`Development source marker: ${marker.digest("hex").slice(0, 12)}`);

for (const item of cssContract.required) check(`source contains ${item}`, compact(sourceCss).includes(compact(item)));
for (const item of cssContract.obsolete) check(`source excludes obsolete ${item}`, !sourceCss.includes(item));

const sourceRoots = ["app", "components", "lib"];
const codeFiles = (await Promise.all(sourceRoots.map((root) => filesBelow(path.resolve(root), (file) => /\.(?:css|js|jsx|mjs|ts|tsx)$/.test(file))))).flat();
const code = await Promise.all(codeFiles.map(async (file) => ({ file, text: await readFile(file, "utf8") })));
for (const { source, importer } of authoritativeCssImports) {
  const basename = path.basename(source);
  const matches = code.filter(({ text }) => new RegExp(`(?:import|@import)[^\\n;]*["'](?:[^"']*/)?${basename.replace(".", "\\.")}["']`).test(text));
  check(`${source} imported once by ${importer}`, matches.length === 1 && relative(matches[0].file) === importer);
}

const serviceWorkerSource = "public/service-worker.js";
const swExists = await exists(serviceWorkerSource);
const swText = swExists ? await readFile(serviceWorkerSource, "utf8") : "";
console.log(`Service worker source: ${swExists ? serviceWorkerSource : "none"}`);
check("service worker has no fetch/cache handler for app assets", !/addEventListener\s*\(\s*["']fetch["']|\bcaches\s*\./.test(swText));
const registrations = code.filter(({ text }) => /serviceWorker\.register\s*\(/.test(text)).map(({ file }) => relative(file));
console.log(`Service worker registration source: ${registrations.join(", ") || "none"}`);

for (const root of [".next/dev", ".next/static"]) {
  const cssFiles = await filesBelow(path.resolve(root), (file) => file.endsWith(".css"));
  console.log(`${root} CSS files (${cssFiles.length}):${cssFiles.length ? `\n${cssFiles.map((file) => `  ${relative(file)}`).join("\n")}` : " none"}`);
  if (!cssFiles.length) continue;
  if (root === ".next/static" && !strict) {
    console.log("INFO production CSS is listed but not compared during a development diagnostic; run `npm run verify:frontend-css` after `npm run build`.");
    continue;
  }
  const compiledCss = (await Promise.all(cssFiles.map((file) => readFile(file, "utf8")))).join("\n");
  for (const item of cssContract.required) check(`${root} compiled CSS contains ${item}`, compact(compiledCss).includes(compact(item)));
  for (const item of cssContract.obsolete) check(`${root} compiled CSS excludes obsolete ${item}`, !compiledCss.includes(item));
}

const diagnosticUrl = process.env.FRONTEND_CACHE_URL ?? "http://localhost:3000";
try {
  const html = await fetch(diagnosticUrl, { redirect: "manual", signal: AbortSignal.timeout(2500) });
  console.log(`HTTP ${html.status} ${diagnosticUrl}`);
  console.log(`  HTML cache-control: ${html.headers.get("cache-control") ?? "not set"}`);
  const body = await html.text();
  const assets = [...body.matchAll(/(?:src|href)=["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']/g)].map((match) => new URL(match[1], diagnosticUrl).href).slice(0, 2);
  for (const asset of assets) {
    const response = await fetch(asset, { signal: AbortSignal.timeout(2500) });
    console.log(`  ${new URL(asset).pathname} cache-control: ${response.headers.get("cache-control") ?? "not set"}`);
  }
} catch {
  console.log(`HTTP headers: not tested (no reachable server at ${diagnosticUrl})`);
}

if (failures.length) {
  console.error(`Frontend cache diagnostics found ${failures.length} failure(s).`);
  process.exitCode = 1;
} else {
  console.log("Frontend cache diagnostics passed.");
}

if (strict) {
  const compiledDev = await filesBelow(path.resolve(".next/dev"), (file) => file.endsWith(".css"));
  if (!compiledDev.length) {
    console.error("Strict verification requires generated development CSS under .next/dev; run dev and open the dashboard first.");
    process.exitCode = 1;
  }
}
