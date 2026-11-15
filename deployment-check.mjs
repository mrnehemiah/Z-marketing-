import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const entries = await readdir(root, { withFileTypes: true });
const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
const htmlFiles = files.filter((name) => name.endsWith(".html"));
const jsFiles = files.filter((name) => name.endsWith(".js"));
const errors = [];
const warnings = [];

for (const name of jsFiles) {
  const check = spawnSync(process.execPath, ["--check", path.join(root, name)], { encoding: "utf8" });
  if (check.status !== 0) errors.push(name + ": " + (check.stderr || check.stdout).trim());
}

const referencePattern = /(?:src|href)\s*=\s*["']\.\/([^"'?#]+)(?:[?#][^"']*)?["']/gi;
for (const name of htmlFiles) {
  const html = await readFile(path.join(root, name), "utf8");
  for (const match of html.matchAll(referencePattern)) {
    const target = match[1];
    if (target === "favicon.ico") {
      warnings.push(name + ": optional favicon.ico is not present; browser fallback will be used.");
      continue;
    }
    try {
      await access(path.join(root, target));
    } catch {
      errors.push(name + ": missing local asset " + target);
    }
  }
}

for (const name of jsFiles) {
  const source = await readFile(path.join(root, name), "utf8");
  const importPattern = /\b(?:from\s*|import\s*\(\s*)["']\.\/([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const target = match[1].split(/[?#]/, 1)[0];
    if (!target.endsWith(".js")) continue;
    try {
      await access(path.join(root, target));
    } catch {
      errors.push(name + ": missing module " + target);
    }
  }
  if (/service_role|secret[_-]?key\s*[:=]\s*["'][^"']{12,}/i.test(source)) {
    errors.push(name + ": possible privileged secret in frontend source");
  }
}

if (!files.includes("index.html")) errors.push("index.html is missing from repository root.");
if (!files.includes("supabase.js")) warnings.push("supabase.js was not found at repository root; confirm the backend module location.");
if (errors.length) {
  console.error("ZUNE deployment checks FAILED");
  for (const error of errors) console.error(" - " + error);
  process.exitCode = 1;
} else {
  console.log("ZUNE deployment checks passed.");
}
for (const warning of warnings) console.warn("WARNING: " + warning);
console.log("Checked " + jsFiles.length + " JavaScript files and " + htmlFiles.length + " HTML pages.");
