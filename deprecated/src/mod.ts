import { env, getCurrentTerminalName, isWindows } from "@reliverse/runtime";
import { type LoadConfigOptions, loadConfig } from "c12";

import { shouldNeverHappen } from "./utils.js";

/* ------------------------------------------------------------------
 * Types for user-configurable colors
 * ------------------------------------------------------------------ */

/** A color definition: [primary, secondary]. */
export type ColorDefinition = [string, string];

/** A list of default color keys. */
export const defaultColorKeys = [
  // Text formatting
  "reset",
  "bold",
  "dim",
  "italic",
  "underline",
  "inverse",
  "hidden",
  "strikethrough",

  // Standard colors
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "gray",

  // Background colors
  "bgBlack",
  "bgRed",
  "bgGreen",
  "bgYellow",
  "bgBlue",
  "bgMagenta",
  "bgCyan",
  "bgWhite",

  // Bright colors
  "blackBright",
  "redBright",
  "greenBright",
  "yellowBright",
  "blueBright",
  "magentaBright",
  "cyanBright",
  "whiteBright",

  // Bright background colors
  "bgBlackBright",
  "bgRedBright",
  "bgGreenBright",
  "bgYellowBright",
  "bgBlueBright",
  "bgMagentaBright",
  "bgCyanBright",
  "bgWhiteBright",

  // Extended color palette - pastel variants
  "redPastel",
  "greenPastel",
  "yellowPastel",
  "bluePastel",
  "magentaPastel",
  "cyanPastel",

  // Extended background pastels
  "bgRedPastel",
  "bgGreenPastel",
  "bgYellowPastel",
  "bgBluePastel",
  "bgMagentaPastel",
  "bgCyanPastel",

  // Web colors
  "orange",
  "pink",
  "purple",
  "teal",
  "lime",
  "brown",
  "navy",
  "maroon",
  "olive",
  "silver",

  // Background web colors
  "bgOrange",
  "bgPink",
  "bgPurple",
  "bgTeal",
  "bgLime",
  "bgBrown",
  "bgNavy",
  "bgMaroon",
  "bgOlive",
  "bgSilver",

  // Grayscale variants
  "gray10",
  "gray20",
  "gray30",
  "gray40",
  "gray50",
  "gray60",
  "gray70",
  "gray80",
  "gray90",
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
export type OverridableColorMap = Partial<Record<OverridableColorKeys, ColorDefinition>>;

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
  /**
   * Enable auto-detection of terminal color support
   * Default: true
   */
  autoDetect?: boolean;
};

/* ------------------------------------------------------------------
 * Environment-based color detection
 * ------------------------------------------------------------------ */
const argv: string[] = typeof process === "undefined" ? [] : process.argv;
const isDisabled: boolean = Boolean(env.NO_COLOR) || argv.includes("--no-color");
const isForced: boolean = Boolean(env.FORCE_COLOR) || argv.includes("--color");
const isCI = Boolean(env.CI && (env.GITHUB_ACTIONS || env.GITLAB_CI || env.CIRCLECI));

// Also detect additional CI systems
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

// Enhanced terminal detection for modern terminals
const supportsTrueColor: boolean =
  colorterm === "truecolor" ||
  colorterm === "24bit" ||
  term === "xterm-kitty" ||
  term === "wezterm" ||
  term === "iterm2" ||
  term.includes("256color");

/** Detects the color level from environment. */
function detectColorLevel(): 0 | 1 | 2 | 3 {
  if (isDisabled) return 0;
  if (isForced) return 3;
  if (supportsTrueColor) return 3;
  if (isWindows && env.TERM_PROGRAM === "vscode") return 3; // VS Code terminal supports TrueColor
  if (isWindows && env.WT_SESSION) return 3; // Windows Terminal supports TrueColor
  if (isWindows) return 2;
  if (isCI || isOtherCI) return 2;
  if (isCompatibleTerminal) return 2;
  return 0;
}

/* ------------------------------------------------------------------
 * Internal color definitions
 * ------------------------------------------------------------------ */
type ColorArray = [string, string];
type RGB = { r: number; g: number; b: number };

/**
 * Named web colors for easy reference
 */
const namedColors: Record<string, string> = {
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  blanchedalmond: "#ffebcd",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  crimson: "#dc143c",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  greenyellow: "#adff2f",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  linen: "#faf0e6",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  oldlace: "#fdf5e6",
  olivedrab: "#6b8e23",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  whitesmoke: "#f5f5f5",
  yellowgreen: "#9acd32",
};

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

  // Bright colors
  blackBright: ["#000000", "#000000"],
  redBright: ["#ff5555", "#ff5555"],
  greenBright: ["#50fa7b", "#50fa7b"],
  yellowBright: ["#f1fa8c", "#f1fa8c"],
  blueBright: ["#24bdff", "#24bdff"],
  magentaBright: ["#ff79c6", "#ff79c6"],
  cyanBright: ["#8be9fd", "#8be9fd"],
  whiteBright: ["#ffffff", "#ffffff"],

  // Bright background colors
  bgBlackBright: ["#000000", "#000000"],
  bgRedBright: ["#ff5555", "#ff5555"],
  bgGreenBright: ["#50fa7b", "#50fa7b"],
  bgYellowBright: ["#f1fa8c", "#f1fa8c"],
  bgBlueBright: ["#24bdff", "#24bdff"],
  bgMagentaBright: ["#ff79c6", "#ff79c6"],
  bgCyanBright: ["#8be9fd", "#8be9fd"],
  bgWhiteBright: ["#ffffff", "#ffffff"],

  // Extended color palette - pastel variants
  redPastel: ["#ff9999", "#ffb3b3"],
  greenPastel: ["#99ff99", "#b3ffb3"],
  yellowPastel: ["#ffff99", "#ffffb3"],
  bluePastel: ["#9999ff", "#b3b3ff"],
  magentaPastel: ["#ff99ff", "#ffb3ff"],
  cyanPastel: ["#99ffff", "#b3ffff"],

  // Extended background pastels
  bgRedPastel: ["#ff9999", "#ffb3b3"],
  bgGreenPastel: ["#99ff99", "#b3ffb3"],
  bgYellowPastel: ["#ffff99", "#ffffb3"],
  bgBluePastel: ["#9999ff", "#b3b3ff"],
  bgMagentaPastel: ["#ff99ff", "#ffb3ff"],
  bgCyanPastel: ["#99ffff", "#b3ffff"],

  // Web colors
  orange: ["#ffa500", "#ff8c00"],
  pink: ["#ffc0cb", "#ffb6c1"],
  purple: ["#800080", "#9370db"],
  teal: ["#008080", "#20b2aa"],
  lime: ["#00ff00", "#32cd32"],
  brown: ["#a52a2a", "#8b4513"],
  navy: ["#000080", "#191970"],
  maroon: ["#800000", "#8b0000"],
  olive: ["#808000", "#6b8e23"],
  silver: ["#c0c0c0", "#a9a9a9"],

  // Background web colors
  bgOrange: ["#ffa500", "#ff8c00"],
  bgPink: ["#ffc0cb", "#ffb6c1"],
  bgPurple: ["#800080", "#9370db"],
  bgTeal: ["#008080", "#20b2aa"],
  bgLime: ["#00ff00", "#32cd32"],
  bgBrown: ["#a52a2a", "#8b4513"],
  bgNavy: ["#000080", "#191970"],
  bgMaroon: ["#800000", "#8b0000"],
  bgOlive: ["#808000", "#6b8e23"],
  bgSilver: ["#c0c0c0", "#a9a9a9"],

  // Grayscale variants
  gray10: ["#1a1a1a", "#1a1a1a"],
  gray20: ["#333333", "#333333"],
  gray30: ["#4d4d4d", "#4d4d4d"],
  gray40: ["#666666", "#666666"],
  gray50: ["#808080", "#808080"],
  gray60: ["#999999", "#999999"],
  gray70: ["#b3b3b3", "#b3b3b3"],
  gray80: ["#cccccc", "#cccccc"],
  gray90: ["#e6e6e6", "#e6e6e6"],
};

// Set of restricted keys for faster lookup
const restrictedKeys = new Set<string>([
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
 * Internal state & logic
 * ------------------------------------------------------------------ */
let config: RelicoConfig = {
  colorLevel: detectColorLevel(),
  theme: "primary", // default theme; can be overridden in user config
  autoDetect: true,
};

let colorMap: Record<string, ColorArray> = {};
let colorFunctions: Record<string, (text: string | number) => string> = {};

// Cache for color conversions to improve performance
const colorConversionCache = new Map<string, { open: string; close: string }>();
const rgbCache = new Map<string, RGB>();
const formatterCache = new Map<string, (text: string | number) => string>();
const hexCache = new Map<string, string>();

/**
 * Normalizes any color value to a standard hex format
 * Handles named colors, shorthand hex, and adds # prefix
 */
function normalizeColor(color: string): string {
  if (!color || typeof color !== "string") return "#000000";

  // Use cache if available
  const cacheKey = color.toLowerCase();
  const cached = hexCache.get(cacheKey);
  if (cached) return cached;

  let result: string;

  // Check for named color
  if (cacheKey in namedColors) {
    result = namedColors[cacheKey];
  } else {
    // For shorthand hex without # prefix
    if (!color.startsWith("#") && /^[0-9a-f]{3,6}$/i.test(color)) {
      result = `#${color}`;
    } else {
      result = color;
    }

    // Strict hex validation
    if (!/^#[0-9a-f]{3,8}$/i.test(result)) {
      // Silent fallback to black without warning
      result = "#000000";
    }

    // Expand shorthand hex (#abc -> #aabbcc)
    if (result.length === 4) {
      result = `#${result[1]}${result[1]}${result[2]}${result[2]}${result[3]}${result[3]}`;
    }
  }

  hexCache.set(cacheKey, result);
  return result;
}

/**
 * Converts a hex color string to its r, g, b components.
 * Supports both 3-digit and 6-digit formats.
 */
function hexToRGB(hex: string): RGB {
  const normalizedHex = normalizeColor(hex);

  // Check cache first
  const cacheKey = normalizedHex;
  const cached = rgbCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Parse hex values
    const r = Number.parseInt(normalizedHex.substring(1, 3), 16);
    const g = Number.parseInt(normalizedHex.substring(3, 5), 16);
    const b = Number.parseInt(normalizedHex.substring(5, 7), 16);

    // Handle invalid values silently
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
      return { r: 0, g: 0, b: 0 };
    }

    const rgb = { r, g, b };
    rgbCache.set(cacheKey, rgb);
    return rgb;
  } catch (_error) {
    // Silent fallback to black
    return { r: 0, g: 0, b: 0 };
  }
}

/**
 * Converts a hex color string into a 24-bit truecolor ANSI escape sequence.
 */
function hexToAnsiParts(hex: string, isBg = false): { open: string; close: string } {
  // Check cache first
  const cacheKey = `${hex}:${isBg}:truecolor`;
  const cached = colorConversionCache.get(cacheKey);
  if (cached) return cached;

  const { r, g, b } = hexToRGB(hex);
  const open = isBg ? `\x1b[48;2;${r};${g};${b}m` : `\x1b[38;2;${r};${g};${b}m`;
  const close = isBg ? "\x1b[49m" : "\x1b[39m";

  const result = { open, close };
  colorConversionCache.set(cacheKey, result);
  return result;
}

/**
 * Converts a hex color string to a 256-color ANSI escape sequence.
 */
function hexToAnsi256(hex: string, isBg = false): string {
  // Check cache first
  const cacheKey = `${hex}:${isBg}:256`;
  const cached = colorConversionCache.get(cacheKey);
  if (cached) return cached.open;

  const { r, g, b } = hexToRGB(hex);

  // Fast path for grayscale - we have 24 different grays in the 256-color palette
  if (r === g && g === b) {
    let index: number;
    if (r < 8) {
      index = 16; // Black (0,0,0)
    } else if (r > 238) {
      index = 231; // White (255,255,255)
    } else {
      // The grayscale ramp starts at index 232 and goes up to 255
      // Each step is (r - 8) / 10 for r in range [8, 238]
      index = Math.round(((r - 8) / 247) * 24) + 232;
    }

    const open = isBg ? `\x1b[48;5;${index}m` : `\x1b[38;5;${index}m`;
    const close = isBg ? "\x1b[49m" : "\x1b[39m";

    colorConversionCache.set(cacheKey, { open, close });
    return open;
  }

  // Regular color cube mapping
  // Convert each channel to a 0-5 scale
  const r5 = Math.round(r / 51);
  const g5 = Math.round(g / 51);
  const b5 = Math.round(b / 51);
  const index = 16 + 36 * r5 + 6 * g5 + b5;

  const open = isBg ? `\x1b[48;5;${index}m` : `\x1b[38;5;${index}m`;
  const close = isBg ? "\x1b[49m" : "\x1b[39m";

  colorConversionCache.set(cacheKey, { open, close });
  return open;
}

/**
 * Basic color definitions for nearest neighbor search
 */
const basicColors: {
  name: string;
  rgb: RGB;
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

// Precomputed squared distances for faster color matching
const colorDistances = new Map<string, number[]>();

/**
 * Finds the nearest basic color using optimized distance calculation
 */
function hexToAnsiBasic(hex: string, isBg = false): string {
  // Check cache first
  const cacheKey = `${hex}:${isBg}:basic`;
  const cached = colorConversionCache.get(cacheKey);
  if (cached) return cached.open;

  const { r, g, b } = hexToRGB(hex);
  const distanceKey = `${r},${g},${b}`;

  let distances: number[];

  // Use cached distances if available
  if (colorDistances.has(distanceKey)) {
    distances =
      colorDistances.get(distanceKey) ??
      shouldNeverHappen("Relico expected to use a color cache, but it's missing.");
  } else {
    // Calculate distances for all basic colors
    distances = basicColors.map((color) => {
      const dr = r - color.rgb.r;
      const dg = g - color.rgb.g;
      const db = b - color.rgb.b;
      return dr * dr + dg * dg + db * db;
    });
    colorDistances.set(distanceKey, distances);
  }

  // Find index of minimum distance
  let bestMatchIndex = 0;
  let bestDistance = distances[0];

  for (let i = 1; i < distances.length; i++) {
    if (distances[i] < bestDistance) {
      bestDistance = distances[i];
      bestMatchIndex = i;
    }
  }

  const bestMatch = basicColors[bestMatchIndex];
  const code = isBg ? bestMatch.bg : bestMatch.fg;
  const open = `\x1b[${code}m`;
  const close = isBg ? "\x1b[49m" : "\x1b[39m";

  colorConversionCache.set(cacheKey, { open, close });
  return open;
}

/**
 * Converts a ColorDefinition (which may include hex strings) into ANSI codes.
 * The conversion used depends on the current config.colorLevel.
 */
function convertColorDefinition(key: string, def: ColorArray): ColorArray {
  const isBg = key.toLowerCase().startsWith("bg");
  const theme = config.theme ?? "primary";
  const chosen = theme === "primary" ? def[0] : def[1];

  // Skip conversion if color support is disabled
  if (config.colorLevel === 0) {
    return ["", ""];
  }

  // Fast path for ANSI escape sequences
  if (chosen.startsWith("\x1b[")) {
    return [chosen, isBg ? "\x1b[49m" : "\x1b[39m"];
  }

  // For other colors, proceed with normal color handling
  const normalizedColor = normalizeColor(chosen);
  let open: string;
  const close = isBg ? "\x1b[49m" : "\x1b[39m";

  // Use appropriate color conversion based on level
  switch (config.colorLevel) {
    case 3:
      open = hexToAnsiParts(normalizedColor, isBg).open;
      break;
    case 2:
      open = hexToAnsi256(normalizedColor, isBg);
      break;
    case 1:
      open = hexToAnsiBasic(normalizedColor, isBg);
      break;
    default:
      open = "";
  }

  return [open, close];
}

/**
 * Builds a complete color map from the default colors,
 * merging any overrides from cfg.customColors.
 * If the key is restricted, skip the override.
 */
function buildColorMap(cfg: RelicoConfig): Record<string, ColorArray> {
  if (cfg.colorLevel === 0) {
    // Fast path for no colors
    const noColorMap: Record<string, ColorArray> = {};
    for (const k of Object.keys(baseColors)) {
      noColorMap[k] = ["", ""];
    }
    return noColorMap;
  }

  // Create the result object
  const result: Record<string, ColorArray> = {};

  // Add all style directives directly (without conversion)
  for (const [key, value] of Object.entries(baseStyles)) {
    result[key] = value;
  }

  // Apply color conversions
  for (const [key, value] of Object.entries(baseColors)) {
    // Skip formatting keys that we've already handled
    if (key in baseStyles) continue;

    result[key] = convertColorDefinition(key, value);
  }

  // Apply user overrides, skipping restricted keys
  if (cfg.customColors) {
    for (const [k, v] of Object.entries(cfg.customColors)) {
      if (!restrictedKeys.has(k)) {
        result[k] = convertColorDefinition(k, v);
      }
    }
  }

  return result;
}

/**
 * Creates a color formatter function that wraps text with open and close ANSI codes.
 */
function createFormatter(open: string, close: string): (input: string | number) => string {
  if (!open && !close) {
    return identityColor;
  }

  // Use an optimized version for common case
  if (open === "" || close === "") {
    return identityColor;
  }

  // Ensure proper handling of style sequences
  return (input) => {
    const text = String(input);

    // Handle empty text
    if (!text) return text;

    // Handle multiline text to prevent style leakage
    if (text.includes("\n")) {
      return text
        .split("\n")
        .map((line) => (line ? open + line + close : line))
        .join("\n");
    }

    return open + text + close;
  };
}

/**
 * Identity function for when colors are disabled.
 */
function identityColor(text: string | number): string {
  return String(text);
}

/**
 * Cache for chainable color functions to avoid recreation
 */
const chainableFunctionCache = new Map<string, ChainableColorFunction>();

/**
 * Creates a chainable color function that supports dot notation
 * @param formatters Array of formatters to apply (empty array means identity)
 * @returns A function that can be called or chained with dot notation
 */
function createChainableColorFunction(
  formatters: ((text: string | number) => string)[],
): ChainableColorFunction {
  // Create cache key from formatters
  const cacheKey =
    formatters.length === 0
      ? "identity"
      : formatters.map((f, i) => `${i}:${f.name || "anon"}`).join("|");

  // Return cached function if available
  if (chainableFunctionCache.has(cacheKey)) {
    return chainableFunctionCache.get(cacheKey)!;
  }

  // Create the main function - either identity or chained formatters
  const mainFunction =
    formatters.length === 0
      ? identityColor
      : (text: string | number): string => {
          return formatters.reduce((result, formatter) => {
            return formatter(result);
          }, String(text));
        };

  // Create chainable object with all color methods
  const chainableFunction = Object.assign(mainFunction, {} as IRelicoColors);

  // Add all color methods as properties that return new chained functions
  for (const colorKey of defaultColorKeys) {
    Object.defineProperty(chainableFunction, colorKey, {
      get: () => {
        // Get the base formatter for this color dynamically
        const baseFormatter = colorFunctions[colorKey] || identityColor;
        // Create a new chained function with this formatter added
        return createChainableColorFunction([...formatters, baseFormatter]);
      },
      enumerable: true,
      configurable: true,
    });
  }

  // Cache and return the function
  chainableFunctionCache.set(cacheKey, chainableFunction as ChainableColorFunction);
  return chainableFunction as ChainableColorFunction;
}

/* ------------------------------------------------------------------
 * Typed interface for `re` - Chainable Color Functions
 * ------------------------------------------------------------------ */

/** Base color function interface */
type ColorFunction = (text: string | number) => string;

/** Chainable color function that supports dot notation */
type ChainableColorFunction = ColorFunction & IRelicoColors;

/** Interface for all color methods */
export type IRelicoColors = {
  reset: ChainableColorFunction;
  bold: ChainableColorFunction;
  dim: ChainableColorFunction;
  italic: ChainableColorFunction;
  underline: ChainableColorFunction;
  inverse: ChainableColorFunction;
  hidden: ChainableColorFunction;
  strikethrough: ChainableColorFunction;
  black: ChainableColorFunction;
  red: ChainableColorFunction;
  green: ChainableColorFunction;
  yellow: ChainableColorFunction;
  blue: ChainableColorFunction;
  magenta: ChainableColorFunction;
  cyan: ChainableColorFunction;
  white: ChainableColorFunction;
  gray: ChainableColorFunction;

  bgBlack: ChainableColorFunction;
  bgRed: ChainableColorFunction;
  bgGreen: ChainableColorFunction;
  bgYellow: ChainableColorFunction;
  bgBlue: ChainableColorFunction;
  bgMagenta: ChainableColorFunction;
  bgCyan: ChainableColorFunction;
  bgWhite: ChainableColorFunction;

  blackBright: ChainableColorFunction;
  redBright: ChainableColorFunction;
  greenBright: ChainableColorFunction;
  yellowBright: ChainableColorFunction;
  blueBright: ChainableColorFunction;
  magentaBright: ChainableColorFunction;
  cyanBright: ChainableColorFunction;
  whiteBright: ChainableColorFunction;

  bgBlackBright: ChainableColorFunction;
  bgRedBright: ChainableColorFunction;
  bgGreenBright: ChainableColorFunction;
  bgYellowBright: ChainableColorFunction;
  bgBlueBright: ChainableColorFunction;
  bgMagentaBright: ChainableColorFunction;
  bgCyanBright: ChainableColorFunction;
  bgWhiteBright: ChainableColorFunction;

  // Extended color palette - pastel variants
  redPastel: ChainableColorFunction;
  greenPastel: ChainableColorFunction;
  yellowPastel: ChainableColorFunction;
  bluePastel: ChainableColorFunction;
  magentaPastel: ChainableColorFunction;
  cyanPastel: ChainableColorFunction;

  // Extended background pastels
  bgRedPastel: ChainableColorFunction;
  bgGreenPastel: ChainableColorFunction;
  bgYellowPastel: ChainableColorFunction;
  bgBluePastel: ChainableColorFunction;
  bgMagentaPastel: ChainableColorFunction;
  bgCyanPastel: ChainableColorFunction;

  // Web colors
  orange: ChainableColorFunction;
  pink: ChainableColorFunction;
  purple: ChainableColorFunction;
  teal: ChainableColorFunction;
  lime: ChainableColorFunction;
  brown: ChainableColorFunction;
  navy: ChainableColorFunction;
  maroon: ChainableColorFunction;
  olive: ChainableColorFunction;
  silver: ChainableColorFunction;

  // Background web colors
  bgOrange: ChainableColorFunction;
  bgPink: ChainableColorFunction;
  bgPurple: ChainableColorFunction;
  bgTeal: ChainableColorFunction;
  bgLime: ChainableColorFunction;
  bgBrown: ChainableColorFunction;
  bgNavy: ChainableColorFunction;
  bgMaroon: ChainableColorFunction;
  bgOlive: ChainableColorFunction;
  bgSilver: ChainableColorFunction;

  // Grayscale variants
  gray10: ChainableColorFunction;
  gray20: ChainableColorFunction;
  gray30: ChainableColorFunction;
  gray40: ChainableColorFunction;
  gray50: ChainableColorFunction;
  gray60: ChainableColorFunction;
  gray70: ChainableColorFunction;
  gray80: ChainableColorFunction;
  gray90: ChainableColorFunction;
};

// Create a base identity object for all colors to avoid repetition
const identityObject = Object.fromEntries(
  defaultColorKeys.map((key) => [key, createChainableColorFunction([])]),
) as Record<string, ChainableColorFunction>;

export const re: IRelicoColors = identityObject as IRelicoColors;

/**
 * Refreshes the typed color interface to match the current color functions.
 * Creates chainable functions for each color method.
 */
function refreshTypedRe(): void {
  // Clear the chainable function cache when rebuilding
  chainableFunctionCache.clear();

  // Create chainable functions for each color key
  for (const key of defaultColorKeys) {
    const baseFormatter = colorFunctions[key] || identityColor;
    (re as any)[key] = createChainableColorFunction([baseFormatter]);
  }
}

/**
 * Initializes the colorFunctions map from the final colorMap.
 * Uses memoization for better performance.
 */
function initColorFunctions(): void {
  colorFunctions = {};

  if (config.colorLevel === 0) {
    // Fast path for disabled colors - use identity for all
    for (const k of Object.keys(baseColors)) {
      colorFunctions[k] = identityColor;
    }
    return;
  }

  // Create formatters from the color map
  for (const [key, [open, close]] of Object.entries(colorMap)) {
    // Reuse cached formatter if possible
    const cacheKey = `formatter:${open}:${close}`;
    if (formatterCache.has(cacheKey)) {
      colorFunctions[key] =
        formatterCache.get(cacheKey) ??
        shouldNeverHappen("Relico expected to use a formatter cache, but it's missing.");
    } else {
      const formatter = createFormatter(open, close);
      formatterCache.set(cacheKey, formatter);
      colorFunctions[key] = formatter;
    }
  }
}

/**
 * Rebuilds the internal state (color map and formatter functions)
 * and refreshes the typed color interface.
 */
function rebuild(): void {
  // Only clear the color conversion caches, preserve formatter caches
  colorConversionCache.clear();

  // Build the new color map and initialize functions
  colorMap = buildColorMap(config);
  initColorFunctions();
  refreshTypedRe();
}

/* Rebuild the internal state at import time */
rebuild();

/* ------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Configures the library with a partial or complete
 * `RelicoConfig`. Invalid fields are ignored.
 */
export function configure(userInput: unknown): void {
  if (typeof userInput !== "object" || userInput === null) {
    return;
  }

  // Type guard for configuration
  const input = userInput as Partial<RelicoConfig>;

  // Only update fields that are present and valid
  const newConfig: RelicoConfig = { ...config };

  if (typeof input.colorLevel === "number" && [0, 1, 2, 3].includes(input.colorLevel)) {
    newConfig.colorLevel = input.colorLevel;
  } else if (input.autoDetect === true) {
    // Re-detect color level if auto-detection is enabled
    newConfig.colorLevel = detectColorLevel();
  }

  if (input.theme === "primary" || input.theme === "secondary") {
    newConfig.theme = input.theme;
  }

  if (input.customColors && typeof input.customColors === "object") {
    newConfig.customColors = { ...input.customColors };
  }

  // Set the autoDetect flag
  if (typeof input.autoDetect === "boolean") {
    newConfig.autoDetect = input.autoDetect;
  }

  // Only rebuild if the config actually changed
  if (
    config.colorLevel !== newConfig.colorLevel ||
    config.theme !== newConfig.theme ||
    JSON.stringify(config.customColors) !== JSON.stringify(newConfig.customColors)
  ) {
    config = newConfig;
    rebuild();
  } else {
    config = newConfig;
  }
}

/**
 * Returns a color function by name (or `reset` or identity if not found).
 * Uses cached functions for better performance.
 */
// export function getColor(name: string): (text: string | number) => string {
// 	return colorFunctions[name] || colorFunctions.reset || identityColor;
// }

/**
 * Colorizes text with a color function.
 */
// export function colorize(name: string, text: string | number): string {
//   return getColor(name)(text);
// }

/**
 * Sets the color level (0=none, 1=basic, 2=256, 3=truecolor).
 */
export function setColorLevel(level: 0 | 1 | 2 | 3): void {
  if (config.colorLevel !== level) {
    configure({ colorLevel: level });
  }
}

/**
 * Returns a custom "rgb" color function if level is truecolor, otherwise identity.
 * Uses caching for better performance.
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 */
export function rgb(r: number, g: number, b: number): (text: string | number) => string {
  // Normalize and clamp RGB values
  const nr = Math.max(0, Math.min(255, Math.round(r)));
  const ng = Math.max(0, Math.min(255, Math.round(g)));
  const nb = Math.max(0, Math.min(255, Math.round(b)));

  const key = `rgb:${nr},${ng},${nb}`;

  // If color is disabled, return identity
  if (config.colorLevel === 0) {
    return identityColor;
  }

  // Check cache first
  if (formatterCache.has(key)) {
    return formatterCache.get(key);
  }

  // Create a new formatter based on color level
  let open: string;
  const close = "\x1b[39m";

  switch (config.colorLevel) {
    case 3:
      open = `\x1b[38;2;${nr};${ng};${nb}m`;
      break;
    case 2: {
      // Use 256-color approximation
      const hexColor = `#${nr.toString(16).padStart(2, "0")}${ng
        .toString(16)
        .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
      open = hexToAnsi256(hexColor, false);
      break;
    }
    case 1: {
      // Use basic color approximation
      const basicHexColor = `#${nr.toString(16).padStart(2, "0")}${ng
        .toString(16)
        .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
      open = hexToAnsiBasic(basicHexColor, false);
      break;
    }
    default:
      return identityColor;
  }

  const formatter = createFormatter(open, close);

  // Cache it for future use
  formatterCache.set(key, formatter);
  return formatter;
}

/**
 * Returns a custom background "bgRgb" color function.
 * Uses caching for better performance.
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 */
export function bgRgb(r: number, g: number, b: number): (text: string | number) => string {
  // Normalize and clamp RGB values
  const nr = Math.max(0, Math.min(255, Math.round(r)));
  const ng = Math.max(0, Math.min(255, Math.round(g)));
  const nb = Math.max(0, Math.min(255, Math.round(b)));

  const key = `bgRgb:${nr},${ng},${nb}`;

  // If color is disabled, return identity
  if (config.colorLevel === 0) {
    return identityColor;
  }

  // Check cache first
  if (formatterCache.has(key)) {
    return formatterCache.get(key);
  }

  // Create a new formatter based on color level
  let open: string;
  const close = "\x1b[49m";

  switch (config.colorLevel) {
    case 3:
      open = `\x1b[48;2;${nr};${ng};${nb}m`;
      break;
    case 2: {
      // Use 256-color approximation
      const hexColor = `#${nr.toString(16).padStart(2, "0")}${ng
        .toString(16)
        .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
      open = hexToAnsi256(hexColor, true);
      break;
    }
    case 1: {
      // Use basic color approximation
      const basicHexColor = `#${nr.toString(16).padStart(2, "0")}${ng
        .toString(16)
        .padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
      open = hexToAnsiBasic(basicHexColor, true);
      break;
    }
    default:
      return identityColor;
  }

  const formatter = createFormatter(open, close);

  // Cache it for future use
  formatterCache.set(key, formatter);
  return formatter;
}

/**
 * Creates a color function from a hex string or color name
 * @param color Hex string (e.g., "#ff0000") or color name (e.g., "red")
 */
export function hex(color: string): (text: string | number) => string {
  if (config.colorLevel === 0) {
    return identityColor;
  }

  const normalizedColor = normalizeColor(color);
  const cacheKey = `hex:${normalizedColor}`;

  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey);
  }

  const { r, g, b } = hexToRGB(normalizedColor);

  // Use rgb function which handles color level appropriately
  const formatter = rgb(r, g, b);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/**
 * Creates a background color function from a hex string or color name
 * @param color Hex string (e.g., "#ff0000") or color name (e.g., "red")
 */
export function bgHex(color: string): (text: string | number) => string {
  if (config.colorLevel === 0) {
    return identityColor;
  }

  const normalizedColor = normalizeColor(color);
  const cacheKey = `bgHex:${normalizedColor}`;

  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey);
  }

  const { r, g, b } = hexToRGB(normalizedColor);

  // Use bgRgb function which handles color level appropriately
  const formatter = bgRgb(r, g, b);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/**
 * HSL to RGB conversion with optimized algorithm
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 */
function hslToRgb(h: number, s: number, l: number): RGB {
  // Normalize parameters
  h = ((h % 360) + 360) % 360; // Ensure hue is 0-359
  s = Math.max(0, Math.min(100, s)) / 100; // Normalize to 0-1
  l = Math.max(0, Math.min(100, l)) / 100; // Normalize to 0-1

  // Handle grayscale case
  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const cacheKey = `hsl:${h.toFixed(1)},${s.toFixed(3)},${l.toFixed(3)}`;
  if (rgbCache.has(cacheKey)) {
    return rgbCache.get(cacheKey);
  }

  // Calculate intermediate values
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  // Calculate RGB based on hue segment
  let r: number;
  let g: number;
  let b: number;

  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  // Adjust for lightness
  const rgb = {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };

  rgbCache.set(cacheKey, rgb);
  return rgb;
}

/**
 * Creates an HSL color from hue, saturation, and lightness values
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 */
export function hsl(h: number, s: number, l: number): (text: string | number) => string {
  // Check for disabled colors
  if (config.colorLevel === 0) {
    return identityColor;
  }

  const cacheKey = `hsl:${h},${s},${l}`;
  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey);
  }

  const { r, g, b } = hslToRgb(h, s, l);
  const formatter = rgb(r, g, b);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/**
 * Creates a background HSL color
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 */
export function bgHsl(h: number, s: number, l: number): (text: string | number) => string {
  // Check for disabled colors
  if (config.colorLevel === 0) {
    return identityColor;
  }

  const cacheKey = `bghsl:${h},${s},${l}`;
  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey);
  }

  const { r, g, b } = hslToRgb(h, s, l);
  const formatter = bgRgb(r, g, b);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/**
 * Chain multiple color formatters together
 * @param formatters Array of color formatters to apply in sequence
 */
export function chain(
  ...formatters: ((text: string | number) => string)[]
): (text: string | number) => string {
  // Optimize for no formatters or single formatter
  if (formatters.length === 0) return identityColor;
  if (formatters.length === 1) return formatters[0];

  // Check if colors are disabled
  if (config.colorLevel === 0) return identityColor;

  // Create a unique cache key based on formatters
  const cacheKey = `chain:${formatters
    .map((f) => f.name || formatterCache.entries().next().value?.[0] || "custom")
    .join(",")}`;

  // Check cache first
  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey);
  }

  // Optimized chaining function
  const chainedFormatter = (text: string | number): string => {
    const str = String(text);

    // Handle empty text
    if (!str) return str;

    // Special handling for multiline text to prevent style leakage
    if (str.includes("\n")) {
      const lines = str.split("\n");
      return lines
        .map((line) => {
          if (!line) return line;
          return formatters.reduce((result, formatter) => {
            return formatter(result);
          }, line);
        })
        .join("\n");
    }

    // Regular processing for single-line text
    return formatters.reduce((result, formatter) => {
      return formatter(result);
    }, str);
  };

  formatterCache.set(cacheKey, chainedFormatter);
  return chainedFormatter;
}

/**
 * Creates a rainbow text effect
 * @param text The text to colorize
 * @param saturation Saturation (0-100)
 * @param lightness Lightness (0-100)
 * @param options Additional options
 * @returns The rainbow-colorized text
 */
export function rainbow(
  text: string,
  saturation = 100,
  lightness = 50,
  options?: { startHue?: number; endHue?: number },
): string {
  if (config.colorLevel === 0) {
    return String(text);
  }

  const chars = String(text).split("");
  if (chars.length === 0) return "";

  // Use provided start/end hues or default to full rainbow
  const startHue = options?.startHue ?? 0;
  const endHue = options?.endHue ?? 360;
  const hueRange = (((endHue - startHue) % 360) + 360) % 360;

  let result = "";
  const hueStep = chars.length > 1 ? hueRange / (chars.length - 1) : 0;

  // Precompute color formatters
  const colorFormatters: ((text: string | number) => string)[] = [];
  for (let i = 0; i < chars.length; i++) {
    const hue = (startHue + i * hueStep) % 360;
    colorFormatters.push(hsl(hue, saturation, lightness));
  }

  // Apply formatters to characters
  for (let i = 0; i < chars.length; i++) {
    result += colorFormatters[i](chars[i]);
  }

  return result;
}

/**
 * Creates a gradient text effect between multiple colors
 * @param text The text to colorize
 * @param colors Array of colors (hex, rgb, hsl, or named colors)
 * @param options Additional options (smoothing, distribution)
 * @returns The gradient-colorized text
 */
export function multiGradient(
  text: string,
  colors: string[],
  options?: { smoothing?: number; distribution?: "even" | "weighted" },
): string {
  if (config.colorLevel === 0 || colors.length === 0) {
    return String(text);
  }

  // Handle single color case
  if (colors.length === 1) {
    return hex(colors[0])(text);
  }

  const chars = String(text).split("");
  if (chars.length === 0) return "";

  // Apply smoothing factor (default to 1 = no extra smoothing)
  const smoothing = options?.smoothing ?? 1;
  const distribution = options?.distribution ?? "even";

  // Convert all colors to normalized RGB objects
  const rgbColors: RGB[] = colors.map((color) => hexToRGB(normalizeColor(color)));

  let result = "";

  // For each character, find the appropriate color by interpolation
  for (let i = 0; i < chars.length; i++) {
    // Calculate position in the gradient
    let gradientPos: number;

    if (distribution === "weighted") {
      // Weighted distribution - more emphasis on colors at the ends
      gradientPos = (chars.length > 1 ? i / (chars.length - 1) : 0) ** smoothing;
    } else {
      // Even distribution - linear gradient
      gradientPos = chars.length > 1 ? i / (chars.length - 1) : 0;
    }

    // Find which segment of the gradient we're in
    const segmentCount = rgbColors.length - 1;
    const segmentPos = gradientPos * segmentCount;
    const segmentIndex = Math.min(Math.floor(segmentPos), segmentCount - 1);
    const segmentOffset = segmentPos - segmentIndex;

    // Get the colors at the segment boundaries
    const startColor = rgbColors[segmentIndex];
    const endColor = rgbColors[segmentIndex + 1];

    // Interpolate between the colors
    const r = Math.round(startColor.r + segmentOffset * (endColor.r - startColor.r));
    const g = Math.round(startColor.g + segmentOffset * (endColor.g - startColor.g));
    const b = Math.round(startColor.b + segmentOffset * (endColor.b - startColor.b));

    // Apply color to character
    const colorFn = rgb(r, g, b);
    result += colorFn(chars[i]);
  }

  return result;
}

/**
 * Creates a gradient text effect between two colors
 * @param text The text to colorize
 * @param startColor Starting color (hex, rgb, hsl, or named color)
 * @param endColor Ending color (hex, rgb, hsl, or named color)
 * @param options Additional options (smoothing)
 * @returns The gradient-colorized text
 */
export function gradient(
  text: string,
  startColor: string,
  endColor: string,
  options?: { smoothing?: number },
): string {
  return multiGradient(text, [startColor, endColor], options);
}

/**
 * Blend two colors together with a given ratio
 * @param color1 First color
 * @param color2 Second color
 * @param ratio Blend ratio (0-1, 0 = color1, 1 = color2)
 * @returns A formatter function with the blended color
 */
export function blend(
  color1: string,
  color2: string,
  ratio = 0.5,
): (text: string | number) => string {
  // Check for disabled colors
  if (config.colorLevel === 0) return identityColor;

  // Normalize ratio
  ratio = Math.max(0, Math.min(1, ratio));

  // Early return for ratio extremes
  if (ratio === 0) return hex(color1);
  if (ratio === 1) return hex(color2);

  const cacheKey = `blend:${normalizeColor(color1)}:${normalizeColor(color2)}:${ratio.toFixed(3)}`;
  if (formatterCache.has(cacheKey)) {
    return formatterCache.get(cacheKey);
  }

  // Get RGB values
  const rgb1 = hexToRGB(normalizeColor(color1));
  const rgb2 = hexToRGB(normalizeColor(color2));

  // Blend the colors
  const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
  const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
  const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

  // Return the blended color formatter
  const formatter = rgb(r, g, b);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

/**
 * Calculates the relative luminance of an RGB color for contrast calculations
 */
function getLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Calculate RGB values for luminance using sRGB formula
  const R = rsRGB <= 0.03928 ? rsRGB / 12.92 : ((rsRGB + 0.055) / 1.055) ** 2.4;
  const G = gsRGB <= 0.03928 ? gsRGB / 12.92 : ((gsRGB + 0.055) / 1.055) ** 2.4;
  const B = bsRGB <= 0.03928 ? bsRGB / 12.92 : ((bsRGB + 0.055) / 1.055) ** 2.4;

  // Calculate luminance using WCAG formula
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Checks if a color meets WCAG contrast guidelines against another color
 * @param foreground Foreground color
 * @param background Background color (defaults to white)
 * @returns Object with contrast ratio and pass/fail for AA and AAA levels
 */
export function checkContrast(
  foreground: string,
  background = "#ffffff",
): {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
} {
  // Normalize colors
  const normalizedFg = normalizeColor(foreground);
  const normalizedBg = normalizeColor(background);

  // Get RGB values
  const fgRGB = hexToRGB(normalizedFg);
  const { r: bgR, g: bgG, b: bgB } = hexToRGB(normalizedBg);

  const fgLuminance = getLuminance(fgRGB.r, fgRGB.g, fgRGB.b);
  const bgLuminance = getLuminance(bgR, bgG, bgB);

  // Calculate contrast ratio
  const ratio =
    (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);

  // Round to 2 decimal places
  const roundedRatio = Math.round(ratio * 100) / 100;

  return {
    ratio: roundedRatio,
    passesAA: roundedRatio >= 4.5,
    passesAAA: roundedRatio >= 7,
    passesAALarge: roundedRatio >= 3,
    passesAAALarge: roundedRatio >= 4.5,
  };
}

/**
 * Find an accessible color by adjusting lightness until it meets contrast requirements
 * @param color Base color to adjust
 * @param background Background color to check contrast against
 * @param targetRatio Minimum contrast ratio to achieve (4.5 = AA, 7 = AAA)
 * @returns A color with sufficient contrast
 */
export function getAccessibleColor(
  color: string,
  background = "#ffffff",
  targetRatio = 4.5,
): string {
  // Normalize colors
  const normalizedColor = normalizeColor(color);
  const normalizedBg = normalizeColor(background);

  // Check initial contrast
  const { ratio } = checkContrast(normalizedColor, normalizedBg);

  // If already meeting target, return original
  if (ratio >= targetRatio) {
    return normalizedColor;
  }

  // Convert to HSL for easier adjustment
  const { r, g, b } = hexToRGB(normalizedColor);

  // Helper to convert RGB to HSL
  function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  }

  const [h, s, l] = rgbToHsl(r, g, b);
  const { r: bgR, g: bgG, b: bgB } = hexToRGB(normalizedBg);
  const bgLuminance = getLuminance(bgR, bgG, bgB);

  // Determine if we need to darken or lighten
  const needsDarkening = bgLuminance > 0.5;

  // Using binary search for more efficient adjustment
  let low = needsDarkening ? 0 : l;
  let high = needsDarkening ? l : 100;
  let newL = l;
  const currentRatio = ratio;
  let bestL = newL;
  let bestRatio = currentRatio;

  // Perform a maximum of 8 iterations (plenty for this purpose)
  for (let i = 0; i < 8; i++) {
    newL = (low + high) / 2;

    const { r: newR, g: newG, b: newB } = hslToRgb(h, s, newL);
    const newHex = `#${newR.toString(16).padStart(2, "0")}${newG
      .toString(16)
      .padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
    const { ratio: newRatio } = checkContrast(newHex, normalizedBg);

    // Keep track of best ratio so far
    if (newRatio > bestRatio) {
      bestRatio = newRatio;
      bestL = newL;
    }

    if (Math.abs(newRatio - targetRatio) < 0.1 || Math.abs(high - low) < 0.5) {
      // We're close enough or can't narrow down further
      break;
    }

    if (newRatio < targetRatio) {
      // Need more contrast
      if (needsDarkening) {
        high = newL;
      } else {
        low = newL;
      }
    } else {
      // Exceeded target, try to get closer
      if (needsDarkening) {
        low = newL;
      } else {
        high = newL;
      }
    }
  }

  // Use the best lightness we found
  const { r: finalR, g: finalG, b: finalB } = hslToRgb(h, s, bestL);
  return `#${finalR.toString(16).padStart(2, "0")}${finalG
    .toString(16)
    .padStart(2, "0")}${finalB.toString(16).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------
 * colorSupport
 * ------------------------------------------------------------------ */
export type ColorSupport = {
  isColorSupported: boolean;
  isForced: boolean;
  isDisabled: boolean;
  terminalName: string;
  colorLevel: 0 | 1 | 2 | 3;
};

/**
 * Returns the internal config for checking colorLevel, etc.
 */
function getConfig(): RelicoConfig {
  return { ...config };
}

export const colorSupport: ColorSupport = {
  get isColorSupported() {
    return getConfig().colorLevel !== 0;
  },
  get colorLevel() {
    return getConfig().colorLevel;
  },
  isForced,
  isDisabled,
  terminalName: getCurrentTerminalName(),
};

/* ------------------------------------------------------------------
 * Experimental color wrapping
 * ------------------------------------------------------------------ */

/**
 * Creates a safe background color wrapping that prevents spillover to new lines
 * @param text The text to colorize
 * @param bgColorFn Background color formatter function
 * @param textColorFn Optional text color formatter function
 * @returns Safely wrapped colored text
 */
export function colorWrap(
  text: string,
  bgColorFn: (text: string | number) => string,
  textColorFn?: (text: string | number) => string,
): string {
  if (config.colorLevel === 0) {
    return String(text);
  }

  const str = String(text);
  if (!str) return str;

  const lines = str.split("\n");
  return lines
    .map((line) => {
      if (!line) return line; // Handle empty lines without applying color
      return textColorFn ? bgColorFn(textColorFn(line)) : bgColorFn(line);
    })
    .join("\n");
}

/**
 * Smart background color function that prevents background color overflow
 * Apply background color to text while ensuring it doesn't spill over to new lines
 * @param color Background color (hex, named, etc.)
 * @param text Optional text to colorize immediately
 */
export function safeBg(
  color: string,
  text?: string | number,
): ((text: string | number) => string) | string {
  const colorFn = bgHex(normalizeColor(color));

  // If text is provided, apply color immediately with safe wrapping
  if (text !== undefined) {
    return colorWrap(String(text), colorFn);
  }

  // Otherwise return a wrapped function
  return (innerText: string | number) => {
    return colorWrap(String(innerText), colorFn);
  };
}

/**
 * Apply background and foreground colors while preventing spillover
 * @param bgColor Background color
 * @param fgColor Foreground color
 * @param text Optional text to colorize immediately
 */
export function safeColor(
  bgColor: string,
  fgColor: string,
  text?: string | number,
): ((text: string | number) => string) | string {
  // Normalize both colors
  const normalizedBgColor = normalizeColor(bgColor);
  const normalizedFgColor = normalizeColor(fgColor);

  const bgColorFn = bgHex(normalizedBgColor);
  const fgColorFn = hex(normalizedFgColor);

  // If text is provided, apply colors immediately
  if (text !== undefined) {
    return colorWrap(String(text), bgColorFn, fgColorFn);
  }

  // Otherwise return a wrapped function
  return (innerText: string | number) => {
    return colorWrap(String(innerText), bgColorFn, fgColorFn);
  };
}

/* ------------------------------------------------------------------
 * New enhanced utilities
 * ------------------------------------------------------------------ */

/**
 * Creates a color function that automatically ensures good contrast
 * @param color Base color to use
 * @param background Background color to check contrast against
 * @param targetRatio Minimum contrast ratio to achieve (4.5 = AA, 7 = AAA)
 */
export function autoContrast(
  color: string,
  background = "#ffffff",
  targetRatio = 4.5,
): (text: string | number) => string {
  if (config.colorLevel === 0) {
    return identityColor;
  }

  const accessibleColor = getAccessibleColor(color, background, targetRatio);
  return hex(accessibleColor);
}

/**
 * Creates a color scheme from a base color
 * @param baseColor The main color to generate a scheme from
 * @returns Object with various related colors
 */
export function createColorScheme(baseColor: string): {
  base: (text: string | number) => string;
  light: (text: string | number) => string;
  dark: (text: string | number) => string;
  bright: (text: string | number) => string;
  pastel: (text: string | number) => string;
  bg: (text: string | number) => string;
  bgLight: (text: string | number) => string;
  accent: (text: string | number) => string;
} {
  const color = normalizeColor(baseColor);
  const { r, g, b } = hexToRGB(color);

  // Convert to HSL for easier manipulation
  function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }

      h /= 6;
    }

    return [h * 360, s * 100, l * 100];
  }

  const [h, s, l] = rgbToHsl(r, g, b);

  return {
    base: hex(color),
    light: hsl(h, Math.max(0, s - 10), Math.min(100, l + 15)),
    dark: hsl(h, Math.min(100, s + 10), Math.max(0, l - 15)),
    bright: hsl(h, Math.min(100, s + 20), Math.min(95, l + 5)),
    pastel: hsl(h, Math.max(0, s - 30), Math.min(100, l + 20)),
    bg: bgHsl(h, Math.max(0, s - 10), Math.min(100, l + 30)),
    bgLight: bgHsl(h, Math.max(0, s - 30), Math.min(100, l + 40)),
    accent: hsl((h + 180) % 360, s, l), // Complementary color
  };
}

/**
 * Creates a highlighted text with colored background and contrasting text
 * @param text Text to highlight
 * @param bgColor Background color
 * @param options Additional options
 */
export function highlight(
  text: string,
  bgColor: string,
  options?: { padding?: number; border?: boolean; borderColor?: string },
): string {
  if (config.colorLevel === 0) {
    return String(text);
  }

  const normalizedBg = normalizeColor(bgColor);
  const { r, g, b } = hexToRGB(normalizedBg);
  const bgLuminance = getLuminance(r, g, b);

  // Choose contrasting text color
  const textColor = bgLuminance > 0.5 ? "#000000" : "#ffffff";

  // Add padding if requested
  const padding = options?.padding ?? 0;
  const paddingStr = padding > 0 ? " ".repeat(padding) : "";

  // Explicitly cast the result to string or use type assertion
  const coloredText = safeColor(
    normalizedBg,
    textColor,
    `${paddingStr}${text}${paddingStr}`,
  ) as string;

  // Add border if requested
  if (options?.border) {
    const borderColor = options?.borderColor ?? normalizedBg;
    const width = String(text).length + padding * 2;
    const borderLine = bgHex(borderColor)(" ".repeat(width));
    return `${borderLine}\n${coloredText}\n${borderLine}`;
  }

  return coloredText;
}

/**
 * Creates an ANSI link (works in supported terminals)
 * @param text Link text to display
 * @param url The URL to link to
 * @param color Optional color for the link text
 */
export function link(text: string, url: string, color?: string): string {
  const colorFn = color ? hex(color) : re.blue;
  const escapedUrl = url.replace(/\)/g, "%29");
  return `\x1b]8;;${escapedUrl}\x1b\\${colorFn(text)}\x1b]8;;\x1b\\`;
}

/**
 * Colorize a JSON object with syntax highlighting
 * @param obj Object to stringify and colorize
 * @param options Options for JSON stringification
 */
export function colorizeJson(
  obj: unknown,
  options?: { indent?: number; compact?: boolean },
): string {
  if (config.colorLevel === 0) {
    return JSON.stringify(obj, null, options?.indent ?? 2);
  }

  const indent = options?.indent ?? 2;
  const json = JSON.stringify(obj, null, options?.compact ? 0 : indent);

  // Simple regex-based JSON syntax highlighting
  return json
    .replace(/"(\\.|[^"\\])*"(?=\s*:)/g, (match) => re.cyan(match))
    .replace(/:\s*"(\\.|[^"\\])*"/g, (match) => `: ${re.green(match.slice(match.indexOf('"')))}`)
    .replace(
      /:\s*\b(true|false|null)\b/g,
      (match) => `: ${re.yellow(match.slice(match.indexOf(":") + 1))}`,
    )
    .replace(
      /:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g,
      (match) => `: ${re.magenta(match.slice(match.indexOf(":") + 1))}`,
    );
}

/* ------------------------------------------------------------------
 * c12-based user configuration loader
 * ------------------------------------------------------------------ */
/**
 * Initialize user configuration with optional programmatic overrides
 * @param programmaticConfig Optional configuration to override settings
 * @param userSettingsPrecedence If true, user file settings take precedence over programmatic
 */
export async function initUserConfig(
  programmaticConfig?: Partial<RelicoConfig>,
  userSettingsPrecedence = false,
): Promise<void> {
  try {
    // Determine how to use the programmatic config based on precedence setting
    const options: LoadConfigOptions<Partial<RelicoConfig>> = {
      name: "relico",
      // If user settings take precedence, programmaticConfig becomes defaults
      // Otherwise, it becomes overrides (higher priority)
      ...(userSettingsPrecedence
        ? { defaults: programmaticConfig || {} }
        : { overrides: programmaticConfig || {} }),
      // Set sensible defaults if no user settings are present
      defaultConfig: {
        colorLevel: detectColorLevel(),
        theme: "primary",
        autoDetect: true,
      },
    };

    // Load config using c12's built-in merging logic
    const { config: mergedConfig } = await loadConfig(options);

    // Apply the configuration
    if (mergedConfig && Object.keys(mergedConfig).length > 0) {
      configure(mergedConfig);
    }
  } catch (err) {
    console.warn("Failed to load user config via c12:", err);

    // Even if config loading fails, apply programmatic config if provided
    if (programmaticConfig) {
      configure(programmaticConfig);
    }
  }
}

/* ------------------------------------------------------------------
 * defineConfig helpe
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
