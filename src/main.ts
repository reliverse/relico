import type { Static } from "@sinclair/typebox";

import { getCurrentTerminalName } from "@reliverse/runtime";
import { env, isWindows } from "@reliverse/runtime";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/* ------------------------------------------------------------------
 * 1) TypeBox schemas for user-configurable colors
 * ------------------------------------------------------------------ */
export const ColorDefinitionSchema = Type.Tuple([
  Type.String(),
  Type.String(),
  Type.Optional(Type.String()),
]);

export const ColorMapSchema = Type.Record(Type.String(), ColorDefinitionSchema);

export const RelicoConfigSchema = Type.Object(
  {
    colorLevel: Type.Optional(
      Type.Union([
        Type.Literal(0),
        Type.Literal(1),
        Type.Literal(2),
        Type.Literal(3),
      ]),
    ),
    customColors: Type.Optional(ColorMapSchema),
  },
  { additionalProperties: false },
);

export type RelicoConfig = Static<typeof RelicoConfigSchema>;

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
  env["TERM"] !== "dumb";

const colorterm: string = (env["COLORTERM"] ?? "").toLowerCase();
const supportsTrueColor: boolean =
  colorterm === "truecolor" || colorterm === "24bit";

/** Detect the color level from environment, with explicit return. */
function detectColorLevel(): 0 | 1 | 2 | 3 {
  if (isDisabled) return 0;
  if (isForced) return 3;
  if (supportsTrueColor) return 3;
  if (isWindows) return 2;
  if (isCI) return 2;
  if (isCompatibleTerminal) {
    return 2;
  }
  return 0;
}

/* ------------------------------------------------------------------
 * 3) Internal color definitions
 * ------------------------------------------------------------------ */
type ColorArray = [string, string, string?];

const baseColors: Record<string, ColorArray> = {
  reset: ["\x1b[0m", "\x1b[0m"],

  bold: ["\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m"],
  dim: ["\x1b[2m", "\x1b[22m", "\x1b[22m\x1b[2m"],
  italic: ["\x1b[3m", "\x1b[23m"],
  underline: ["\x1b[4m", "\x1b[24m"],
  inverse: ["\x1b[7m", "\x1b[27m"],
  hidden: ["\x1b[8m", "\x1b[28m"],
  strikethrough: ["\x1b[9m", "\x1b[29m"],

  black: ["\x1b[30m", "\x1b[39m"],
  red: ["\x1b[31m", "\x1b[39m"],
  green: ["\x1b[32m", "\x1b[39m"],
  yellow: ["\x1b[33m", "\x1b[39m"],
  blue: ["\x1b[34m", "\x1b[39m"],
  magenta: ["\x1b[35m", "\x1b[39m"],
  cyan: ["\x1b[36m", "\x1b[39m"],
  white: ["\x1b[37m", "\x1b[39m"],
  gray: ["\x1b[90m", "\x1b[39m"],

  bgBlack: ["\x1b[40m", "\x1b[49m"],
  bgRed: ["\x1b[41m", "\x1b[49m"],
  bgGreen: ["\x1b[42m", "\x1b[49m"],
  bgYellow: ["\x1b[43m", "\x1b[49m"],
  bgBlue: ["\x1b[44m", "\x1b[49m"],
  bgMagenta: ["\x1b[45m", "\x1b[49m"],
  bgCyan: ["\x1b[46m", "\x1b[49m"],
  bgWhite: ["\x1b[47m", "\x1b[49m"],

  blackBright: ["\x1b[90m", "\x1b[39m"],
  redBright: ["\x1b[91m", "\x1b[39m"],
  greenBright: ["\x1b[92m", "\x1b[39m"],
  yellowBright: ["\x1b[93m", "\x1b[39m"],
  blueBright: ["\x1b[94m", "\x1b[39m"],
  magentaBright: ["\x1b[95m", "\x1b[39m"],
  cyanBright: ["\x1b[96m", "\x1b[39m"],
  whiteBright: ["\x1b[97m", "\x1b[39m"],

  bgBlackBright: ["\x1b[100m", "\x1b[49m"],
  bgRedBright: ["\x1b[101m", "\x1b[49m"],
  bgGreenBright: ["\x1b[102m", "\x1b[49m"],
  bgYellowBright: ["\x1b[103m", "\x1b[49m"],
  bgBlueBright: ["\x1b[104m", "\x1b[49m"],
  bgMagentaBright: ["\x1b[105m", "\x1b[49m"],
  bgCyanBright: ["\x1b[106m", "\x1b[49m"],
  bgWhiteBright: ["\x1b[107m", "\x1b[49m"],
};

const windowsTerminalColors: Record<string, ColorArray> = {
  ...baseColors,
  red: ["\x1b[38;2;255;85;85m", "\x1b[39m"],
  green: ["\x1b[38;2;80;250;123m", "\x1b[39m"],
  yellow: ["\x1b[38;2;241;250;140m", "\x1b[39m"],
  blue: ["\x1b[38;2;98;114;164m", "\x1b[39m"],
  magenta: ["\x1b[38;2;255;121;198m", "\x1b[39m"],
  cyan: ["\x1b[38;2;139;233;253m", "\x1b[39m"],
};

/* ------------------------------------------------------------------
 * 4) Internal state & logic
 * ------------------------------------------------------------------ */
let config: RelicoConfig = {
  colorLevel: detectColorLevel(),
};

let colorMap: Record<string, ColorArray> = {};
let colorFunctions: Record<string, (text: string | number) => string> = {};

function replaceClose(
  str: string,
  close: string,
  replace: string,
  index: number,
): string {
  let result = "";
  let cursor = 0;
  let i = index;
  while (i !== -1) {
    result += str.substring(cursor, i) + replace;
    cursor = i + close.length;
    i = str.indexOf(close, cursor);
  }
  return result + str.substring(cursor);
}

function createFormatter(
  open: string,
  close: string,
  replace: string = open,
): (input: string | number) => string {
  return (input: string | number): string => {
    const stringed = String(input);
    const idx: number = stringed.indexOf(close, open.length);
    if (idx !== -1) {
      return open + replaceClose(stringed, close, replace, idx) + close;
    }
    return open + stringed + close;
  };
}

function buildColorMap(cfg: RelicoConfig): Record<string, ColorArray> {
  const terminalName: string = getCurrentTerminalName();
  const isWinTerm: boolean = terminalName === "Windows Terminal";

  if (cfg.colorLevel === 0) {
    const map: Record<string, ColorArray> = {};
    for (const k of Object.keys(baseColors)) {
      map[k] = ["", "", ""];
    }
    return map;
  }

  let builtIn: Record<string, ColorArray>;
  if (isWinTerm && cfg.colorLevel === 3) {
    builtIn = { ...windowsTerminalColors };
  } else {
    builtIn = { ...baseColors };
  }

  if (cfg.customColors) {
    for (const [k, v] of Object.entries(cfg.customColors)) {
      builtIn[k] = v;
    }
  }

  return builtIn;
}

function initColorFunctions(): void {
  colorFunctions = {};
  if (config.colorLevel === 0) {
    for (const k of Object.keys(baseColors)) {
      colorFunctions[k] = identityColor;
    }
    return;
  }

  for (const [key, [open, close, replace]] of Object.entries(colorMap)) {
    colorFunctions[key] = createFormatter(open, close, replace ?? open);
  }
}

// biome-ignore lint/suspicious/noFunctionAssign: <explanation>
function rebuild(): void {
  colorMap = buildColorMap(config);
  initColorFunctions();
}

function identityColor(text: string | number): string {
  return String(text);
}

/* Initialize once */
rebuild();

/* ------------------------------------------------------------------
 * 5) Public API
 * ------------------------------------------------------------------ */

/**
 * Configures the library with a partial or complete `RelicoConfig`.
 * For any invalid fields, a warning is shown and they are ignored.
 */
export function configure(userInput: unknown): void {
  let newObj: RelicoConfig | null = null;
  if (typeof userInput === "object" && userInput !== null) {
    newObj = { ...config, ...(userInput as Partial<RelicoConfig>) };
  } else {
    newObj = { ...config };
  }

  try {
    const parsed: RelicoConfig = Value.Cast(RelicoConfigSchema, newObj);
    config = parsed;
  } catch (err) {
    console.warn("Invalid relico config:", err);
    return;
  }

  rebuild();
}

/** Returns a read-only copy of the current configuration. */
export function getConfig(): RelicoConfig {
  return { ...config };
}

/** Returns a color function by name (or `reset` or identity if not found). */
export function getColor(name: string): (text: string | number) => string {
  const maybeFn = colorFunctions[name];
  if (maybeFn) return maybeFn;
  const resetFn = colorFunctions["reset"];
  if (resetFn) return resetFn;
  return identityColor;
}

/** Colorize text with a color function. */
export function colorize(name: string, text: string | number): string {
  const fn = getColor(name);
  return fn(text);
}

/** Set the color level (0=none,1=basic,2=256,3=truecolor). */
export function setColorLevel(level: 0 | 1 | 2 | 3): void {
  configure({ colorLevel: level });
}

/** Returns a custom "rgb" color function if level=3, otherwise identity. */
export function rgb(
  r: number,
  g: number,
  b: number,
): (text: string | number) => string {
  if (config.colorLevel === 3) {
    const open = `\x1b[38;2;${String(r)};${String(g)};${String(b)}m`;
    const close = "\x1b[39m";
    return createFormatter(open, close);
  }
  return identityColor;
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

  // For user-defined colors: e.g. customColors: { highlight: ["\x1b[...m", ...] }
  [k: string]: (text: string | number) => string;
};

/* We'll build `re` after `colorFunctions` is built. We'll fill each property with identity
   to be safe, then override with the computed color. */
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

/**
 * Refresh typedRe after colorFunctions is built, so that direct usage
 * like `re.red(...)` is correct.
 */
function refreshTypedRe(): void {
  // Start by resetting to identityColor
  for (const colorName of Object.keys(typedRe)) {
    typedRe[colorName] = identityColor;
  }
  // Now override from colorFunctions
  for (const [k, fn] of Object.entries(colorFunctions)) {
    typedRe[k] = fn;
  }
}

/** We monkey-patch rebuild() so it also calls `refreshTypedRe()`. */
const originalRebuild: () => void = rebuild;
function newRebuild(): void {
  originalRebuild();
  refreshTypedRe();
}
(rebuild as unknown) = newRebuild;
newRebuild();

/**
 * The typed `re` object with all known color methods
 * plus user-defined ones (index signature).
 */
export const re: IRelicoColors = typedRe;

/* ------------------------------------------------------------------
 * 7) colorSupport
 * ------------------------------------------------------------------ */
export type ColorSupport = {
  isColorSupported: boolean;
  isForced: boolean;
  isDisabled: boolean;
  terminalName: string;
};

export const colorSupport: ColorSupport = {
  isColorSupported: getConfig().colorLevel !== 0,
  isForced,
  isDisabled,
  terminalName: getCurrentTerminalName(),
};
