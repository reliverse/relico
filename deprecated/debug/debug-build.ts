import { env, isWindows } from "@reliverse/runtime";

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

const config = {
  colorLevel: detectColorLevel(),
  theme: "primary" as const,
  autoDetect: true,
};

console.log("=== DEBUG BUILD PROCESS ===");
console.log("Config:", config);

// Recreate the base colors and styles
type ColorArray = [string, string];

const baseStyles: Record<string, ColorArray> = {
  reset: ["\x1b[0m", "\x1b[0m"],
  bold: ["\x1b[1m", "\x1b[22m"],
  dim: ["\x1b[2m", "\x1b[22m"],
  italic: ["\x1b[3m", "\x1b[23m"],
  underline: ["\x1b[4m", "\x1b[24m"],
  inverse: ["\x1b[7m", "\x1b[27m"],
  hidden: ["\x1b[8m", "\x1b[28m"],
  strikethrough: ["\x1b[9m", "\x1b[29m"],
};

const baseColors = {
  // Text formatting - THESE SHOULD NOT BE HERE! This might be the issue
  reset: ["\x1b[0m", "\x1b[0m"],
  bold: ["\x1b[1m", "\x1b[22m"],
  dim: ["\x1b[2m", "\x1b[22m"],
  italic: ["\x1b[3m", "\x1b[23m"],
  underline: ["\x1b[4m", "\x1b[24m"],
  inverse: ["\x1b[7m", "\x1b[27m"],
  hidden: ["\x1b[8m", "\x1b[28m"],
  strikethrough: ["\x1b[9m", "\x1b[29m"],

  // Foreground colors
  black: ["#000000", "#000000"],
  red: ["#ff5555", "#ff0000"],
  green: ["#00ff00", "#00ff00"],
  yellow: ["#ffff00", "#ffff00"],
  blue: ["#0000ff", "#0000ff"],
  magenta: ["#ff00ff", "#ff00ff"],
  cyan: ["#00ffff", "#00ffff"],
  white: ["#ffffff", "#ffffff"],
  gray: ["#808080", "#808080"],
} as const;

console.log("\n=== CHECKING OVERLAPS ===");
console.log("Keys in baseStyles:", Object.keys(baseStyles));
console.log("Keys in baseColors:", Object.keys(baseColors));

// Check for overlaps
const styleKeys = Object.keys(baseStyles);
const colorKeys = Object.keys(baseColors);
const overlaps = colorKeys.filter((key) => styleKeys.includes(key));
console.log("Overlapping keys:", overlaps);

// This is the issue! The buildColorMap function does:
// if (key in baseStyles) continue;
// So it skips ALL the overlapping keys!

console.log("\n=== SIMULATING buildColorMap LOGIC ===");

const result: Record<string, ColorArray> = {};

console.log("Adding base styles...");
for (const [key, value] of Object.entries(baseStyles)) {
  result[key] = value;
  console.log(`  ${key}: ${JSON.stringify(value)}`);
}

console.log("\nProcessing baseColors...");
for (const [key, value] of Object.entries(baseColors)) {
  if (key in baseStyles) {
    console.log(`  SKIPPED ${key} (exists in baseStyles)`);
    continue;
  }

  console.log(`  Processing ${key}: ${JSON.stringify(value)}`);
  // Simulate convertColorDefinition
  const theme = config.theme ?? "primary";
  const chosen = theme === "primary" ? value[0] : value[1];

  if (chosen.startsWith("\x1b[")) {
    console.log(`    -> ANSI sequence detected: ${JSON.stringify([chosen, "\x1b[39m"])}`);
    result[key] = [chosen, "\x1b[39m"];
  } else {
    console.log(`    -> Hex color detected: ${chosen}, converting...`);
    // This would normally convert the hex to ANSI
    const r = parseInt(chosen.substring(1, 3), 16);
    const g = parseInt(chosen.substring(3, 5), 16);
    const b = parseInt(chosen.substring(5, 7), 16);
    const open = `\x1b[38;2;${r};${g};${b}m`;
    const close = "\x1b[39m";
    result[key] = [open, close];
    console.log(`    -> Converted to: ${JSON.stringify([open, close])}`);
  }
}

console.log("\n=== FINAL RESULT ===");
console.log("Color map keys:", Object.keys(result));
console.log("red mapping:", JSON.stringify(result.red));
console.log("green mapping:", JSON.stringify(result.green));
console.log("bold mapping:", JSON.stringify(result.bold));

console.log("\n=== END DEBUG ===");
