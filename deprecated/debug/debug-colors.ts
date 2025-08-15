import { colorSupport, re, rgb } from "../src/mod.js";

// Debug color support detection
console.log("=== COLOR SUPPORT DEBUG ===");
console.log("Color Support:", colorSupport);
console.log("isColorSupported:", colorSupport.isColorSupported);
console.log("colorLevel:", colorSupport.colorLevel);
console.log("isForced:", colorSupport.isForced);
console.log("isDisabled:", colorSupport.isDisabled);
console.log("terminalName:", colorSupport.terminalName);

// Test basic colors first
console.log("\n=== BASIC COLOR TESTS ===");
console.log("Raw red function output:", JSON.stringify(re.red("test")));
console.log("Red test:", re.red("This should be red"));

// Test RGB function directly
console.log("\n=== RGB FUNCTION TEST ===");
const redRgb = rgb(255, 0, 0);
console.log("RGB function output:", JSON.stringify(redRgb("RGB RED")));
console.log("RGB red test:", redRgb("This should be RGB red"));

// Test chainable
console.log("\n=== CHAINABLE TESTS ===");
console.log("Chainable red:", JSON.stringify(re.red("chainable test")));
console.log("Chainable bold.red:", JSON.stringify(re.bold.red("chainable bold red")));

// Show actual ANSI codes
console.log("\n=== RAW ANSI CODES ===");
const result = re.bold.red("test");
console.log("Result length:", result.length);
console.log(
  "Result bytes:",
  [...result].map((c) => c.charCodeAt(0)),
);

// Environment check
console.log("\n=== ENVIRONMENT ===");
console.log("NO_COLOR:", process.env.NO_COLOR);
console.log("FORCE_COLOR:", process.env.FORCE_COLOR);
console.log("TERM:", process.env.TERM);
console.log("COLORTERM:", process.env.COLORTERM);
console.log("CI:", process.env.CI);
console.log("WT_SESSION:", process.env.WT_SESSION);
