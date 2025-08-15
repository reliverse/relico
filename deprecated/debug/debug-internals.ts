import "../src/mod.js"; // This will trigger the rebuild() at import time

import { env, isWindows } from "@reliverse/runtime";

console.log("=== DEBUGGING INTERNAL STATE ===");

// Replicate the color detection logic
const argv: string[] = typeof process === "undefined" ? [] : process.argv;
const isDisabled: boolean = Boolean(env.NO_COLOR) || argv.includes("--no-color");
const isForced: boolean = Boolean(env.FORCE_COLOR) || argv.includes("--color");
const isCI = Boolean(env.CI && (env.GITHUB_ACTIONS || env.GITLAB_CI || env.CIRCLECI));

const isOtherCI = Boolean(
  env.CI &&
    (env.TRAVIS ||
      env.APPVEYOR ||
      env.JENKINS_URL ||
      env.BITBUCKET_BUILD_NUMBER ||
      env.TEAMCITY_VERSION),
);

const isCompatibleTerminal: boolean =
  typeof process !== "undefined" && Boolean(process.stdout?.isTTY) && env.TERM !== "dumb";

const colorterm: string = (env.COLORTERM ?? "").toLowerCase();
const term: string = (env.TERM ?? "").toLowerCase();

const supportsTrueColor: boolean =
  colorterm === "truecolor" ||
  colorterm === "24bit" ||
  term === "xterm-kitty" ||
  term === "wezterm" ||
  term === "iterm2" ||
  term.includes("256color");

function detectColorLevel(): 0 | 1 | 2 | 3 {
  if (isDisabled) return 0;
  if (isForced) return 3;
  if (supportsTrueColor) return 3;
  if (isWindows && env.TERM_PROGRAM === "vscode") return 3;
  if (isWindows && env.WT_SESSION) return 3;
  if (isWindows) return 2;
  if (isCI || isOtherCI) return 2;
  if (isCompatibleTerminal) return 2;
  return 0;
}

console.log("Color detection logic:");
console.log("- isDisabled:", isDisabled);
console.log("- isForced:", isForced);
console.log("- supportsTrueColor:", supportsTrueColor);
console.log("- isWindows:", isWindows);
console.log("- TERM_PROGRAM:", env.TERM_PROGRAM);
console.log("- WT_SESSION:", env.WT_SESSION);
console.log("- isCI:", isCI);
console.log("- isOtherCI:", isOtherCI);
console.log("- isCompatibleTerminal:", isCompatibleTerminal);
console.log("- Detected level:", detectColorLevel());

// Test hex to ANSI conversion directly
function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return { r, g, b };
}

function hexToAnsiParts(hex: string, isBg = false): { open: string; close: string } {
  const { r, g, b } = hexToRGB(hex);
  const open = isBg ? `\x1b[48;2;${r};${g};${b}m` : `\x1b[38;2;${r};${g};${b}m`;
  const close = isBg ? "\x1b[49m" : "\x1b[39m";
  return { open, close };
}

// Test direct hex conversion
console.log("\nDirect hex conversion test:");
const redHex = "#ff5555";
const redAnsi = hexToAnsiParts(redHex, false);
console.log("Red hex:", redHex);
console.log("Red ANSI:", JSON.stringify(redAnsi));

// Test creating a formatter function manually
function createFormatter(open: string, close: string) {
  return (input: string | number): string => {
    const text = String(input);
    return open + text + close;
  };
}

const redFormatter = createFormatter(redAnsi.open, redAnsi.close);
console.log("Manual red formatter result:", JSON.stringify(redFormatter("test")));

console.log("\n=== END INTERNAL DEBUG ===");
