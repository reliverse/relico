// Bundle size analysis for relico
import { readFileSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { config, getEnabledDirs, getFilePaths, getImportPath } from "./config";

// Get the directory where this benchmark file is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getFileSize(path: string): number {
  try {
    const stats = statSync(path);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function analyzeFile(filePath: string): { types: number; colorData: number; logic: number } {
  try {
    const sourceCode = readFileSync(filePath, "utf8");
    const lines = sourceCode.split("\n");

    let typeDefinitions = 0;
    let colorData = 0;
    let logic = 0;

    let inTypeBlock = false;
    let inColorBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Type definitions
      if (trimmed.includes("type ") || trimmed.includes("interface ") || inTypeBlock) {
        if (trimmed.includes("{") && !trimmed.includes("}")) inTypeBlock = true;
        if (trimmed.includes("}") && inTypeBlock) inTypeBlock = false;
        typeDefinitions += line.length + 1; // +1 for newline
        continue;
      }

      // Color data
      if (trimmed.includes("COLORS") || trimmed.includes("HEX") || inColorBlock) {
        if (trimmed.includes("{") && !trimmed.includes("}")) inColorBlock = true;
        if (trimmed.includes("}") && inColorBlock) inColorBlock = false;
        colorData += line.length + 1;
        continue;
      }

      // Everything else is logic
      if (trimmed.length > 0) {
        logic += line.length + 1;
      }
    }

    return { types: typeDefinitions, colorData, logic };
  } catch (error) {
    console.warn(`⚠️  Could not analyze ${filePath}:`, error);
    return { types: 0, colorData: 0, logic: 0 };
  }
}

async function analyzeAllDirectories() {
  const enabledDirs = getEnabledDirs();

  for (const dir of enabledDirs) {
    const importPath = getImportPath(dir);
    const filePaths = getFilePaths(dir);

    console.log(`\n🔍 Analyzing ${dir.toUpperCase()} directory: ${importPath}`);
    console.log("=".repeat(60));

    // Analyze JavaScript/TypeScript file
    if (filePaths.js) {
      const jsFilePath = resolve(__dirname, filePaths.js);
      console.log(`📄 JavaScript/TypeScript file: ${filePaths.js}`);
      console.log(`Resolved path: ${jsFilePath}`);

      const jsFileSize = getFileSize(jsFilePath);
      if (jsFileSize === 0) {
        console.log(`❌ File not found or empty: ${jsFilePath}`);
      } else {
        console.log(`File size: ${formatSize(jsFileSize)}`);

        const jsAnalysis = analyzeFile(jsFilePath);

        console.log(`\nBreakdown:`);
        console.log(
          `- Types: ${formatSize(jsAnalysis.types)} (${((jsAnalysis.types / jsFileSize) * 100).toFixed(1)}%)`,
        );
        console.log(
          `- Color data: ${formatSize(jsAnalysis.colorData)} (${((jsAnalysis.colorData / jsFileSize) * 100).toFixed(1)}%)`,
        );
        console.log(
          `- Logic: ${formatSize(jsAnalysis.logic)} (${((jsAnalysis.logic / jsFileSize) * 100).toFixed(1)}%)`,
        );

        if (config.bundleAnalysis.analyzeDependencies) {
          console.log(`\n📊 Additional Info:`);
          try {
            const sourceCode = readFileSync(jsFilePath, "utf8");
            const lines = sourceCode.split("\n");
            console.log(`- Total lines: ${lines.length}`);
            console.log(
              `- File type: ${filePaths.js.endsWith(".ts") ? "TypeScript" : "JavaScript"}`,
            );
          } catch (error) {
            console.log(`- Could not read file for line count: ${error}`);
          }
        }
      }
    }

    // Analyze TypeScript declaration file if it exists
    if (filePaths.dts) {
      const dtsFilePath = resolve(__dirname, filePaths.dts);
      console.log(`\n📄 TypeScript declarations: ${filePaths.dts}`);
      console.log(`Resolved path: ${dtsFilePath}`);

      const dtsFileSize = getFileSize(dtsFilePath);
      if (dtsFileSize === 0) {
        console.log(`❌ Declaration file not found: ${dtsFilePath}`);
      } else {
        console.log(`Declaration file size: ${formatSize(dtsFileSize)}`);

        if (config.bundleAnalysis.analyzeDependencies) {
          try {
            const sourceCode = readFileSync(dtsFilePath, "utf8");
            const lines = sourceCode.split("\n");
            console.log(`- Declaration lines: ${lines.length}`);
            console.log(
              `- Total bundle size: ${formatSize(dtsFileSize + (filePaths.js ? getFileSize(resolve(__dirname, filePaths.js)) : 0))}`,
            );
          } catch (error) {
            console.log(`- Could not read declaration file: ${error}`);
          }
        }
      }
    }
  }
}

// Main execution
console.log("📦 Relico Bundle Size Analysis");
console.log("=".repeat(50));

console.log("Starting analysis...");
analyzeAllDirectories()
  .then(() => {
    console.log("\n✅ All analyses completed!");
  })
  .catch((error) => {
    console.error("❌ Analysis error:", error);
    console.error("Error details:", error);
  });
