import { getCurrentTerminalName } from "@reliverse/runtime";
import { env, isWindows } from "@reliverse/runtime";
import { loadConfig } from "c12";

/* ------------------------------------------------------------------
 * 1) Types for user-configurable colors
 * ------------------------------------------------------------------ */

/** A color definition: [primary, secondary]. */
export type ColorDefinition = [string, string];

/** A list of default color keys. */
export const defaultColorKeys = [
  "reset",
  "bold",
  "dim",
  "italic",
  "underline",
  "inverse",
  "hidden",
  "strikethrough",
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "gray",
  "bgBlack",
  "bgRed",
  "bgGreen",
  "bgYellow",
  "bgBlue",
  "bgMagenta",
  "bgCyan",
  "bgWhite",
  "blackBright",
  "redBright",
  "greenBright",
  "yellowBright",
  "blueBright",
  "magentaBright",
  "cyanBright",
  "whiteBright",
  "bgBlackBright",
  "bgRedBright",
  "bgGreenBright",
  "bgYellowBright",
  "bgBlueBright",
  "bgMagentaBright",
  "bgCyanBright",
  "bgWhiteBright",
] as const;

/** Union of all default color keys */
export type DefaultColorKeys = (typeof defaultColorKeys)[number];

/**
 * Format keys that must NOT be overridden by the user.
 * We'll exclude them from IntelliSense and also skip them at runtime.
 */
type RestrictedKeys =
  | "reset"
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "inverse"
  | "hidden"
  | "strikethrough";

/** All the keys user is allowed to override */
type OverridableColorKeys = Exclude<DefaultColorKeys, RestrictedKeys>;

/** A map of user-overridable color definitions (no format keys) */
export type OverridableColorMap = Partial<
  Record<OverridableColorKeys, ColorDefinition>
>;

/**
 * `relico.config.ts` configuration options.
 * Note: `customColors` is restricted to OverridableColorMap.
 */
export type RelicoConfig = {
  /**
   * Determines which ANSI mode is used:
   * - 0: no color
   * - 1: basic ANSI (8 colors)
   * - 2: 256 color palette
   * - 3: 24-bit truecolor (default)
   */
  colorLevel?: 0 | 1 | 2 | 3;
  /**
   * Theme to use for color definitions.
   * - "primary": primary theme (default)
   * - "secondary": secondary theme
   */
  theme?: "primary" | "secondary";
  /**
   * Custom color definitions.
   * - Theming: ["primary", "secondary"]
   */
  customColors?: OverridableColorMap;
};

/* ------------------------------------------------------------------
 * 2) Environment-based color detection
 * ------------------------------------------------------------------ */
const argv: string[] = typeof process === "undefined" ? [] : process.argv;
const isDisabled: boolean = "NO_COLOR" in env || argv.includes("--no-color");
const isForced: boolean = "FORCE_COLOR" in env || argv.includes("--color");
const isCI: boolean =
  "CI" in env &&
  ("GITHUB_ACTIONS" in env || "GITLAB_CI" in env || "CIRCLECI" in env);

const isCompatibleTerminal: boolean =
  typeof process !== "undefined" &&
  Boolean(process.stdout) &&
  Boolean(process.stdout.isTTY) &&
  env.TERM !== "dumb";

const colorterm: string = (env.COLORTERM ?? "").toLowerCase();
const supportsTrueColor: boolean =
  colorterm === "truecolor" || colorterm === "24bit";

/** Detects the color level from environment. */
function detectColorLevel(): 0 | 1 | 2 | 3 {
  if (isDisabled) return 0;
  if (isForced) return 3;
  if (supportsTrueColor) return 3;
  if (isWindows) return 2;
  if (isCI) return 2;
  if (isCompatibleTerminal) return 2;
  return 0;
}

/* ------------------------------------------------------------------
 * 3) Internal color definitions
 * ------------------------------------------------------------------ */
type ColorArray = [string, string];

/**
 * Base Color Definitions
 * - For text formatting, escape sequences are two-part: [open, close]
 * - For colors, a two-item array represents theme variants: [primary, secondary]
 */
const baseColors: Record<DefaultColorKeys, ColorArray> = {
  // Text formatting
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

  // Background colors
  bgBlack: ["#000000", "#000000"],
  bgRed: ["#ff5555", "#ff0000"],
  bgGreen: ["#00ff00", "#00ff00"],
  bgYellow: ["#ffff00", "#ffff00"],
  bgBlue: ["#0000ff", "#0000ff"],
  bgMagenta: ["#ff00ff", "#ff00ff"],
  bgCyan: ["#00ffff", "#00ffff"],
  bgWhite: ["#ffffff", "#ffffff"],

  // Bright colors.
  blackBright: ["#000000", "#000000"],
  redBright: ["#ff5555", "#ff5555"],
  greenBright: ["#50fa7b", "#50fa7b"],
  yellowBright: ["#f1fa8c", "#f1fa8c"],
  blueBright: ["#24bdff", "#24bdff"],
  magentaBright: ["#ff79c6", "#ff79c6"],
  cyanBright: ["#8be9fd", "#8be9fd"],
  whiteBright: ["#ffffff", "#ffffff"],

  // Bright background colors.
  bgBlackBright: ["#000000", "#000000"],
  bgRedBright: ["#ff5555", "#ff5555"],
  bgGreenBright: ["#50fa7b", "#50fa7b"],
  bgYellowBright: ["#f1fa8c", "#f1fa8c"],
  bgBlueBright: ["#24bdff", "#24bdff"],
  bgMagentaBright: ["#ff79c6", "#ff79c6"],
  bgCyanBright: ["#8be9fd", "#8be9fd"],
  bgWhiteBright: ["#ffffff", "#ffffff"],
};

const windowsTerminalColors: Record<DefaultColorKeys, ColorArray> = {
  ...baseColors,
  red: ["#ff5555", "#ff5555"],
  green: ["#50fa7b", "#50fa7b"],
  yellow: ["#f1fa8c", "#f1fa8c"],
  blue: ["#6272a4", "#6272a4"],
  magenta: ["#ff79c6", "#ff79c6"],
  cyan: ["#8be9fd", "#8be9fd"],
};

/* 
   We skip overriding these restricted keys at runtime, 
   and they are also excluded from the OverridableColorMap type.
*/
const restrictedKeys = new Set([
  "reset",
  "bold",
  "dim",
  "italic",
  "underline",
  "inverse",
  "hidden",
  "strikethrough",
]);

/* ------------------------------------------------------------------
 * 4) Internal state & logic
 * ------------------------------------------------------------------ */
let config: RelicoConfig = {
  colorLevel: detectColorLevel(),
  theme: "primary", // default theme; can be overridden in user config
};

let colorMap: Record<string, ColorArray> = {};
let colorFunctions: Record<string, (text: string | number) => string> = {};

/**
 * Converts a hex color string to its r, g, b components.
 * Supports both 3-digit and 6-digit formats.
 */
function hexToRGB(hex: string): { r: number; g: number; b: number } {
  if (hex.startsWith("#")) {
    hex = hex.slice(1);
  }
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

/**
 * Converts a hex color string into a 24-bit truecolor ANSI escape sequence.
 */
function hexToAnsiParts(
  hex: string,
  isBg = false,
): { open: string; close: string } {
  const { r, g, b } = hexToRGB(hex);
  const open = isBg ? `\x1b[48;2;${r};${g};${b}m` : `\x1b[38;2;${r};${g};${b}m`;
  const close = isBg ? "\x1b[49m" : "\x1b[39m";
  return { open, close };
}

/**
 * Converts a hex color string to a 256-color ANSI escape sequence.
 */
function hexToAnsi256(hex: string, isBg = false): string {
  const { r, g, b } = hexToRGB(hex);
  // Convert each channel to a 0-5 scale
  const r5 = Math.round(r / 51);
  const g5 = Math.round(g / 51);
  const b5 = Math.round(b / 51);
  const index = 16 + 36 * r5 + 6 * g5 + b5;
  return isBg ? `\x1b[48;5;${index}m` : `\x1b[38;5;${index}m`;
}

/**
 * Converts a hex color string to a basic ANSI color escape sequence.
 * Uses a simple nearest neighbor search among the 8 standard colors.
 */
const basicColors: {
  name: string;
  rgb: { r: number; g: number; b: number };
  fg: number;
  bg: number;
}[] = [
  { name: "black", rgb: { r: 0, g: 0, b: 0 }, fg: 30, bg: 40 },
  { name: "red", rgb: { r: 205, g: 0, b: 0 }, fg: 31, bg: 41 },
  { name: "green", rgb: { r: 0, g: 205, b: 0 }, fg: 32, bg: 42 },
  { name: "yellow", rgb: { r: 205, g: 205, b: 0 }, fg: 33, bg: 43 },
  { name: "blue", rgb: { r: 0, g: 0, b: 238 }, fg: 34, bg: 44 },
  { name: "magenta", rgb: { r: 205, g: 0, b: 205 }, fg: 35, bg: 45 },
  { name: "cyan", rgb: { r: 0, g: 205, b: 205 }, fg: 36, bg: 46 },
  { name: "white", rgb: { r: 229, g: 229, b: 229 }, fg: 37, bg: 47 },
];

function hexToAnsiBasic(hex: string, isBg = false): string {
  const { r, g, b } = hexToRGB(hex);
  // Find nearest basic color using Euclidean distance
  let bestMatch = basicColors[0];
  let bestDistance = Number.MAX_VALUE;
  for (const color of basicColors) {
    const dr = r - color.rgb.r;
    const dg = g - color.rgb.g;
    const db = b - color.rgb.b;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = color;
    }
  }
  const code = isBg ? bestMatch.bg : bestMatch.fg;
  return `\x1b[${code}m`;
}

/**
 * Converts a ColorDefinition (which may include hex strings) into ANSI codes.
 * The conversion used depends on the current config.colorLevel.
 */
function convertColorDefinition(key: string, def: ColorArray): ColorArray {
  const isBg = key.toLowerCase().startsWith("bg");
  const theme = config.theme ?? "primary";
  const chosen = theme === "primary" ? def[0] : def[1];

  function convert(str: string): string {
    if (!str.startsWith("#")) return str;
    if (config.colorLevel === 3) {
      return hexToAnsiParts(str, isBg).open;
    }
    if (config.colorLevel === 2) {
      return hexToAnsi256(str, isBg);
    }
    if (config.colorLevel === 1) {
      return hexToAnsiBasic(str, isBg);
    }
    return "";
  }

  const openConverted = convert(chosen);
  const close = isBg ? "\x1b[49m" : "\x1b[39m";
  return [openConverted, close];
}

/**
 * Builds a complete color map from the default colors,
 * merging any overrides from cfg.customColors.
 * If the key is restricted, skip the override.
 */
function buildColorMap(cfg: RelicoConfig): Record<string, ColorArray> {
  const terminalName: string = getCurrentTerminalName();
  const isWinTerm: boolean = terminalName === "Windows Terminal";

  if (cfg.colorLevel === 0) {
    const noColorMap: Record<string, ColorArray> = {};
    for (const k of Object.keys(baseColors)) {
      noColorMap[k] = ["", ""];
    }
    return noColorMap;
  }

  let builtIn: Record<string, ColorArray> = { ...baseColors };

  // Merge user overrides, skipping restricted keys
  if (cfg.customColors) {
    for (const [k, v] of Object.entries(cfg.customColors)) {
      if (!restrictedKeys.has(k)) {
        builtIn[k] = v;
      }
      // else we skip this override
    }
  }

  if (isWinTerm && cfg.colorLevel === 3) {
    builtIn = { ...windowsTerminalColors, ...builtIn };
  }

  for (const key of Object.keys(builtIn)) {
    builtIn[key] = convertColorDefinition(key, builtIn[key]);
  }

  return builtIn;
}

/**
 * Creates a color formatter function that wraps text with open and close ANSI codes.
 */
function createFormatter(
  open: string,
  close: string,
): (input: string | number) => string {
  return (input) => {
    return open + String(input) + close;
  };
}

/**
 * Identity function for when colors are disabled.
 */
function identityColor(text: string | number): string {
  return String(text);
}

/* ------------------------------------------------------------------
 * 6) Typed interface for `re`
 * ------------------------------------------------------------------ */
export type IRelicoColors = {
  reset(text: string | number): string;
  bold(text: string | number): string;
  dim(text: string | number): string;
  italic(text: string | number): string;
  underline(text: string | number): string;
  inverse(text: string | number): string;
  hidden(text: string | number): string;
  strikethrough(text: string | number): string;
  black(text: string | number): string;
  red(text: string | number): string;
  green(text: string | number): string;
  yellow(text: string | number): string;
  blue(text: string | number): string;
  magenta(text: string | number): string;
  cyan(text: string | number): string;
  white(text: string | number): string;
  gray(text: string | number): string;

  bgBlack(text: string | number): string;
  bgRed(text: string | number): string;
  bgGreen(text: string | number): string;
  bgYellow(text: string | number): string;
  bgBlue(text: string | number): string;
  bgMagenta(text: string | number): string;
  bgCyan(text: string | number): string;
  bgWhite(text: string | number): string;

  blackBright(text: string | number): string;
  redBright(text: string | number): string;
  greenBright(text: string | number): string;
  yellowBright(text: string | number): string;
  blueBright(text: string | number): string;
  magentaBright(text: string | number): string;
  cyanBright(text: string | number): string;
  whiteBright(text: string | number): string;

  bgBlackBright(text: string | number): string;
  bgRedBright(text: string | number): string;
  bgGreenBright(text: string | number): string;
  bgYellowBright(text: string | number): string;
  bgBlueBright(text: string | number): string;
  bgMagentaBright(text: string | number): string;
  bgCyanBright(text: string | number): string;
  bgWhiteBright(text: string | number): string;

  [k: string]: (text: string | number) => string;
};

const typedRe: IRelicoColors = {
  reset: identityColor,
  bold: identityColor,
  dim: identityColor,
  italic: identityColor,
  underline: identityColor,
  inverse: identityColor,
  hidden: identityColor,
  strikethrough: identityColor,
  black: identityColor,
  red: identityColor,
  green: identityColor,
  yellow: identityColor,
  blue: identityColor,
  magenta: identityColor,
  cyan: identityColor,
  white: identityColor,
  gray: identityColor,

  bgBlack: identityColor,
  bgRed: identityColor,
  bgGreen: identityColor,
  bgYellow: identityColor,
  bgBlue: identityColor,
  bgMagenta: identityColor,
  bgCyan: identityColor,
  bgWhite: identityColor,

  blackBright: identityColor,
  redBright: identityColor,
  greenBright: identityColor,
  yellowBright: identityColor,
  blueBright: identityColor,
  magentaBright: identityColor,
  cyanBright: identityColor,
  whiteBright: identityColor,

  bgBlackBright: identityColor,
  bgRedBright: identityColor,
  bgGreenBright: identityColor,
  bgYellowBright: identityColor,
  bgBlueBright: identityColor,
  bgMagentaBright: identityColor,
  bgCyanBright: identityColor,
  bgWhiteBright: identityColor,
};

export const re: IRelicoColors = typedRe;

/**
 * Refreshes the typed color interface to match the current color functions.
 */
function refreshTypedRe(): void {
  // Reset all color keys to identity
  for (const colorName of Object.keys(typedRe)) {
    typedRe[colorName] = identityColor;
  }
  // Then fill in any built color function
  for (const [k, fn] of Object.entries(colorFunctions)) {
    typedRe[k] = fn;
  }
}

/**
 * Initializes the colorFunctions map from the final colorMap.
 */
function initColorFunctions(): void {
  colorFunctions = {};
  if (config.colorLevel === 0) {
    // If color is disabled, all are identity
    for (const k of Object.keys(baseColors)) {
      colorFunctions[k] = identityColor;
    }
    return;
  }

  // Otherwise build from final colorMap
  for (const [key, [open, close]] of Object.entries(colorMap)) {
    colorFunctions[key] = createFormatter(open, close);
  }
}

/**
 * Rebuilds the internal state (color map and formatter functions)
 * and refreshes the typed color interface.
 */
function rebuild(): void {
  colorMap = buildColorMap(config);
  initColorFunctions();
  refreshTypedRe();
}

/* Rebuild the internal state at import time */
rebuild();

/* ------------------------------------------------------------------
 * 5) Public API
 * ------------------------------------------------------------------ */

/**
 * Configures the library with a partial or complete
 * `RelicoConfig`. Invalid fields are just ignored.
 */
export function configure(userInput: unknown): void {
  let newConfig: RelicoConfig;
  if (typeof userInput === "object" && userInput !== null) {
    newConfig = { ...config, ...(userInput as Partial<RelicoConfig>) };
  } else {
    newConfig = { ...config };
  }
  config = newConfig;
  rebuild();
}

/** Returns a color function by name (or `reset` or identity if not found). */
export function getColor(name: string): (text: string | number) => string {
  const maybeFn = colorFunctions[name];
  if (maybeFn) return maybeFn;
  const resetFn = colorFunctions.reset;
  if (resetFn) return resetFn;
  return identityColor;
}

/** Colorizes text with a color function. */
export function colorize(name: string, text: string | number): string {
  const fn = getColor(name);
  return fn(text);
}

/** Sets the color level (0=none, 1=basic, 2=256, 3=truecolor). */
export function setColorLevel(level: 0 | 1 | 2 | 3): void {
  configure({ colorLevel: level });
}

/** Returns a custom "rgb" color function if level is truecolor, otherwise identity. */
export function rgb(
  r: number,
  g: number,
  b: number,
): (text: string | number) => string {
  if (config.colorLevel === 3) {
    const open = `\x1b[38;2;${r};${g};${b}m`;
    const close = "\x1b[39m";
    return createFormatter(open, close);
  }
  return identityColor;
}

/* ------------------------------------------------------------------
 * 7) colorSupport
 * ------------------------------------------------------------------ */
export type ColorSupport = {
  isColorSupported: boolean;
  isForced: boolean;
  isDisabled: boolean;
  terminalName: string;
};

/**
 * Returns the internal config for checking colorLevel, etc.
 */
function getConfig(): RelicoConfig {
  return { ...config };
}

export const colorSupport: ColorSupport = {
  isColorSupported: getConfig().colorLevel !== 0,
  isForced,
  isDisabled,
  terminalName: getCurrentTerminalName(),
};

/* ------------------------------------------------------------------
 * 8) c12-based user configuration loader
 * ------------------------------------------------------------------ */
export async function initUserConfig(): Promise<void> {
  try {
    const { config: userConfig } = await loadConfig({ name: "relico" });
    configure(userConfig);
  } catch (err) {
    console.warn("Failed to load user config via c12:", err);
  }
}

/* ------------------------------------------------------------------
 * 9) defineConfig helper
 * ------------------------------------------------------------------ */
/**
 * Provides type safety and IntelliSense for user configuration.
 * Example usage in `relico.config.ts`:
 * ```ts
 * import { defineConfig } from "@reliverse/relico-cfg";
 * export default defineConfig({
 *   colorLevel: 3,
 *   theme: "secondary",
 *   customColors: {
 *     red: ["#f00", "#c00"],
 *     blue: ["#0af", "#08f"],
 *     green: ["#00ff00", "#00cc00"],
 *   },
 * });
 * ```
 */
export function defineConfig(cfg: RelicoConfig): RelicoConfig {
  return cfg;
}
