import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";

const buildRoot = path.resolve(".next/static");
const requiredSelectors = [
  ".audience-updates .audience-update-metrics",
  ".audience-updates .audience-update-metrics article",
  ".audience-updates .audience-update-body",
  ".audience-updates .recent-updates",
  ".audience-updates .updates-operations",
];

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(target);
    return entry.isFile() && entry.name.endsWith(".css") ? [target] : [];
  }));
  return nested.flat();
}

const files = await cssFiles(buildRoot);
const bundles = await Promise.all(files.map(async (file) => ({ file, css: await readFile(file, "utf8") })));
const dashboardBundle = bundles.find(({ css }) => requiredSelectors.every((selector) => css.includes(selector)));

if (!dashboardBundle) {
  throw new Error(`No production CSS bundle contains all dashboard selectors:\n${requiredSelectors.join("\n")}`);
}

const root = postcss.parse(dashboardBundle.css, { from: dashboardBundle.file });
const declarations = new Map();
root.walkRules((rule) => {
  if (rule.parent?.type !== "root") return;
  for (const selector of rule.selectors) {
    if (!requiredSelectors.includes(selector)) continue;
    const values = declarations.get(selector) ?? new Map();
    rule.walkDecls((declaration) => values.set(declaration.prop, declaration.value));
    declarations.set(selector, values);
  }
});

const metricGrid = declarations.get(requiredSelectors[0]);
const metricCard = declarations.get(requiredSelectors[1]);
const failures = [
  [metricGrid?.get("display") === "grid", "metric container display:grid"],
  [metricGrid?.get("grid-template-columns")?.includes("repeat(4"), "metric container four-column grid"],
  [metricCard?.get("padding") === "18px", "metric card padding:18px"],
  [metricCard?.get("border")?.startsWith("1px "), "metric card 1px border"],
  [metricCard?.get("border-radius") === "16px", "metric card border-radius:16px"],
].filter(([passed]) => !passed).map(([, label]) => label);

if (failures.length) throw new Error(`Dashboard CSS bundle failed: ${failures.join(", ")}`);

console.log(`Verified dashboard CSS bundle: ${path.relative(process.cwd(), dashboardBundle.file)}`);
