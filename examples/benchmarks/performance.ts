// Performance benchmarks for relico optimizations

import { dirname, resolve } from "path";
import { performance } from "perf_hooks";
import { fileURLToPath } from "url";
import { config, getEnabledDirs, getImportPath } from "./config";

// Get the directory where this benchmark file is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dynamic imports for different source directories
async function importFromDir(dir: string) {
  try {
    const resolvedPath = resolve(__dirname, dir);
    const module = await import(resolvedPath);
    return module;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  Could not import from ${dir}:`, errorMessage);
    return null;
  }
}

// Run benchmarks for a specific module
async function runBenchmarks(dir: string, module: any) {
  const { re, rgb, hex, hsl, chain } = module;
  const { iterations, warmupRuns } = config.performance;

  function benchmark(name: string, fn: () => void, iterCount = iterations) {
    // Warmup runs
    for (let i = 0; i < warmupRuns; i++) {
      fn();
    }

    const start = performance.now();
    for (let i = 0; i < iterCount; i++) {
      fn();
    }
    const end = performance.now();
    const time = end - start;
    const opsPerSec = Math.round((iterCount * 1000) / time);
    console.log(`  ${name}: ${time.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)`);
  }

  // Test basic color operations
  benchmark("Basic color access", () => {
    re.red("test");
  });

  benchmark("Chained colors", () => {
    re.bold.red.underline("test");
  });

  benchmark("RGB color creation", () => {
    rgb(255, 0, 0)("test");
  });

  benchmark("Hex color creation", () => {
    hex("#ff0000")("test");
  });

  benchmark("HSL color creation", () => {
    hsl(0, 100, 50)("test");
  });

  benchmark("Chain function", () => {
    chain(re.bold, re.red, re.underline)("test");
  });

  benchmark("Background colors", () => {
    re.bgRed.white("test");
  });

  benchmark("Bright colors", () => {
    re.redBright("test");
  });

  benchmark("Pastel colors", () => {
    re.redPastel("test");
  });

  benchmark("Multiline text (small)", () => {
    re.red("line1\nline2\nline3");
  });

  benchmark("Multiline text (large)", () => {
    const largeText = Array(50).fill("text").join("\n");
    re.red(largeText);
  });

  console.log(`\n  📊 Bundle Size Test:`);
  console.log(`  Core exports imported: ${Object.keys({ re, rgb, hex, hsl, chain }).length}`);
}

// Test all enabled directories
async function runBenchmarksForAllDirs() {
  const enabledDirs = getEnabledDirs();

  for (const dir of enabledDirs) {
    const importPath = getImportPath(dir);
    console.log(`\n🔍 Testing ${dir.toUpperCase()} directory: ${importPath}`);
    console.log("=".repeat(60));

    const module = await importFromDir(importPath);
    if (!module) continue;

    // Run benchmarks for this directory
    await runBenchmarks(dir, module);
  }
}

// Main execution
console.log("🚀 Relico Performance Benchmarks");
console.log("=".repeat(50));

runBenchmarksForAllDirs()
  .then(() => {
    console.log("\n✅ All benchmarks completed!");
  })
  .catch((error) => {
    console.error("❌ Benchmark error:", error);
  });
