import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";

const root = process.cwd();
const entries = await readdir(root, { withFileTypes: true });
const sources = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /\.(js|css)$/i.test(name))
  .filter((name) => !/\.min\.(js|css)$/i.test(name))
  .filter((name) => name !== "optimize-assets.mjs" && name !== "deployment-check.mjs")
  .sort();

const report = [];
for (const name of sources) {
  const source = await readFile(path.join(root, name), "utf8");
  const loader = name.endsWith(".css") ? "css" : "js";
  const result = await transform(source, {
    loader,
    minify: true,
    target: loader === "js" ? "es2020" : undefined,
    legalComments: "none",
    charset: "utf8"
  });
  const outputName = name.replace(/\.(js|css)$/i, ".min.$1");
  await writeFile(path.join(root, outputName), result.code, "utf8");
  report.push({
    source: name,
    output: outputName,
    sourceBytes: Buffer.byteLength(source),
    optimizedBytes: Buffer.byteLength(result.code),
    savedBytes: Buffer.byteLength(source) - Buffer.byteLength(result.code)
  });
}

const total = report.reduce((sum, item) => ({
  sourceBytes: sum.sourceBytes + item.sourceBytes,
  optimizedBytes: sum.optimizedBytes + item.optimizedBytes,
  savedBytes: sum.savedBytes + item.savedBytes
}), { sourceBytes: 0, optimizedBytes: 0, savedBytes: 0 });

const result = {
  generatedAt: new Date().toISOString(),
  note: "Generated .min files are separate copies. Update page references only after testing the optimized module graph.",
  total,
  files: report
};
await writeFile(path.join(root, "optimization-report.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
