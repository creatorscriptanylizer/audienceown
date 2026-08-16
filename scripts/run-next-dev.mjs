import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cssContract } from "./frontend-cache-contract.mjs";

const clean = process.argv.includes("--clean");
const webpack = process.argv.includes("--webpack");
const devOutput = path.resolve(".next/dev");

if (clean) {
  await rm(devOutput, { recursive: true, force: true });
  console.log("[frontend-cache] removed generated development output: .next/dev");
}

const hash = createHash("sha256");
for (const file of [...cssContract.sourceFiles, "next.config.ts", "postcss.config.mjs"]) {
  hash.update(file);
  hash.update(await readFile(file));
}
console.log(`[frontend-cache] development source marker: ${hash.digest("hex").slice(0, 12)}`);
console.log(`[frontend-cache] bundler: ${webpack ? "webpack (diagnostic)" : "turbopack (default)"}`);

const nextBin = path.resolve("node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev", ...(webpack ? ["--webpack"] : [])], {
  stdio: "inherit",
  env: process.env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`[frontend-cache] failed to start Next.js: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
