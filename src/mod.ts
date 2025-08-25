/* @reliverse/relico - Tiny, type-safe terminal color library with chainable API
   - Levels: 0 (off), 1 (ANSI 8/bright), 2 (ANSI 256), 3 (Truecolor)
   - Named palettes (std, web, grayscale), Bright & Pastel variants, bg-variants
   - Chainable: re.bold.red.underline("text"), chain(re.bold, re.red)("text")
   - Multiline-safe: styles applied per line with reset to prevent bleed
*/

type ColorLevel = 0 | 1 | 2 | 3;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

type SgrOp =
  | { kind: "style"; open: number[] } // closed by global reset at line end
  | { kind: "fg-basic"; idx: number; bright: boolean }
  | { kind: "bg-basic"; idx: number; bright: boolean }
  | { kind: "fg-256"; code: number }
  | { kind: "bg-256"; code: number }
  | { kind: "fg-true"; rgb: Rgb }
  | { kind: "bg-true"; rgb: Rgb };

type ApplyInput = string | number;

type FormatCallable = ((input: ApplyInput) => string) & { readonly [OP_SYMBOL]: SgrOp[] };

export type BaseColorName =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "orange"
  | "pink"
  | "purple"
  | "teal"
  | "lime"
  | "brown"
  | "navy"
  | "maroon"
  | "olive"
  | "silver";

export type ColorName = BaseColorName | BrightColorName | BgColorName;

export type BrightColorName =
  | "blackBright"
  | "redBright"
  | "greenBright"
  | "yellowBright"
  | "blueBright"
  | "magentaBright"
  | "cyanBright"
  | "whiteBright"
  | "orangeBright"
  | "pinkBright"
  | "purpleBright"
  | "tealBright"
  | "limeBright"
  | "brownBright"
  | "navyBright"
  | "maroonBright"
  | "oliveBright"
  | "silverBright";

export type BgColorName = `bg${Capitalize<BaseColorName>}` | `bg${Capitalize<BrightColorName>}`;

export type ReStyleKey =
  | "reset"
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "inverse"
  | "hidden"
  | "strikethrough";

export type Re = FormatCallable & {
  readonly [K in ReStyleKey]: Re;
} & {
  readonly [K in ColorName]: Re;
} & {
  readonly [K in BgColorName]: Re;
};

const ESC = "\x1B[";
const RESET = `${ESC}0m`;
const OP_SYMBOL: unique symbol = Symbol("re.ops");

// Color level constants
const COLOR_LEVEL_OFF = 0;
const COLOR_LEVEL_BASIC = 1;
const COLOR_LEVEL_256 = 2;
const COLOR_LEVEL_TRUECOLOR = 3;

// RGB and byte constants
const MIN_BYTE = 0;
const MAX_BYTE = 255;
const WHITE_RGB = 255;

// ANSI 256 color constants
const ANSI_256_GRAYSCALE_MIN = 8;
const ANSI_256_GRAYSCALE_MAX = 248;
const ANSI_256_BASE_OFFSET = 16;
const ANSI_256_GRAYSCALE_BASE = 232;
const ANSI_256_GRAYSCALE_RANGE = 247;
const ANSI_256_GRAYSCALE_STEPS = 24;
const ANSI_256_BRIGHT_THRESHOLD = 231;
const ANSI_256_RGB_LEVELS = 5;
const ANSI_256_RGB_RED_MULTIPLIER = 36;
const ANSI_256_RGB_GREEN_MULTIPLIER = 6;

// SGR code constants
const SGR_FG_BASE = 30;
const SGR_BG_BASE = 40;
const SGR_FG_BRIGHT_BASE = 90;
const SGR_BG_BRIGHT_BASE = 100;

// Style SGR codes
const SGR_RESET = 0;
const SGR_BOLD = 1;
const SGR_DIM = 2;
const SGR_ITALIC = 3;
const SGR_UNDERLINE = 4;
const SGR_INVERSE = 7;
const SGR_HIDDEN = 8;
const SGR_STRIKETHROUGH = 9;

// Hex parsing constants
const HEX_BYTE_LENGTH = 2;
const HEX_RED_START = 0;
const HEX_GREEN_START = 2;
const HEX_BLUE_START = 4;
const HEX_BLUE_END = 6;
const HEX_RADIX = 16;

// String processing constants
const BRIGHT_SUFFIX_LENGTH = 6;
const BG_PREFIX_LENGTH = 2;
const BG_COLOR_START = 3;

// Color mixing constants
const BRIGHT_MIX_FACTOR = 0.25;

// Regex constants
const BRIGHT_SUFFIX_REGEX = /Bright$/u;

let CURRENT_LEVEL: ColorLevel = COLOR_LEVEL_TRUECOLOR;

export const setColorLevel = (level: ColorLevel): void => {
  if (
    level !== COLOR_LEVEL_OFF &&
    level !== COLOR_LEVEL_BASIC &&
    level !== COLOR_LEVEL_256 &&
    level !== COLOR_LEVEL_TRUECOLOR
  ) {
    throw new Error("Invalid color level");
  }
  CURRENT_LEVEL = level;
};

const clampByte = (n: number): number => {
  if (!Number.isFinite(n)) {
    return MIN_BYTE;
  }
  if (n < MIN_BYTE) {
    return MIN_BYTE;
  }
  if (n > MAX_BYTE) {
    return MAX_BYTE;
  }
  return Math.round(n);
};

// Base 8-color RGB anchors (non-bright)
const BASIC8: Rgb[] = [
  { r: 0, g: 0, b: 0 }, // black
  { r: 205, g: 0, b: 0 }, // red
  { r: 0, g: 205, b: 0 }, // green
  { r: 205, g: 205, b: 0 }, // yellow
  { r: 0, g: 0, b: 238 }, // blue
  { r: 205, g: 0, b: 205 }, // magenta
  { r: 0, g: 205, b: 205 }, // cyan
  { r: 229, g: 229, b: 229 }, // white (light gray)
];

// SGR code builders
const sgr = (codes: number[]): string => `${ESC}${codes.join(";")}m`;

// RGB → closest of BASIC8 index (0..7)
const nearestBasicIndex = (rgb: Rgb): number => {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < BASIC8.length; i++) {
    const c = BASIC8[i];
    const dr = c.r - rgb.r;
    const dg = c.g - rgb.g;
    const db = c.b - rgb.b;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
};

// RGB → ANSI 256 index
const rgbToAnsi256 = (rgb: Rgb): number => {
  // Try grayscale if r≈g≈b
  if (rgb.r === rgb.g && rgb.g === rgb.b) {
    if (rgb.r < ANSI_256_GRAYSCALE_MIN) {
      return ANSI_256_BASE_OFFSET;
    }
    if (rgb.r > ANSI_256_GRAYSCALE_MAX) {
      return ANSI_256_BRIGHT_THRESHOLD;
    }
    const step = Math.round(
      ((rgb.r - ANSI_256_GRAYSCALE_MIN) / ANSI_256_GRAYSCALE_RANGE) * ANSI_256_GRAYSCALE_STEPS,
    );
    return ANSI_256_GRAYSCALE_BASE + step;
  }
  const r = Math.round((rgb.r / MAX_BYTE) * ANSI_256_RGB_LEVELS);
  const g = Math.round((rgb.g / MAX_BYTE) * ANSI_256_RGB_LEVELS);
  const b = Math.round((rgb.b / MAX_BYTE) * ANSI_256_RGB_LEVELS);
  return (
    ANSI_256_BASE_OFFSET + ANSI_256_RGB_RED_MULTIPLIER * r + ANSI_256_RGB_GREEN_MULTIPLIER * g + b
  );
};

// Color data
const NAMED_COLORS: Record<BaseColorName, string> = {
  black: "#000000",
  red: "#ff0000",
  green: "#00ff00",
  yellow: "#ffff00",
  blue: "#0000ff",
  magenta: "#ff00ff",
  cyan: "#00ffff",
  white: "#ffffff",
  gray: "#808080",
  orange: "#ffa500",
  pink: "#ffc0cb",
  purple: "#800080",
  teal: "#008080",
  lime: "#00ff00",
  brown: "#a52a2a",
  navy: "#000080",
  maroon: "#800000",
  olive: "#808000",
  silver: "#c0c0c0",
};

const mixWithWhite = (rgb: Rgb, factor: number): Rgb => {
  const t = factor;
  return {
    r: clampByte(rgb.r * (1 - t) + WHITE_RGB * t),
    g: clampByte(rgb.g * (1 - t) + WHITE_RGB * t),
    b: clampByte(rgb.b * (1 - t) + WHITE_RGB * t),
  };
};

const fromNamed = (name: BaseColorName): Rgb => {
  const hex = NAMED_COLORS[name];
  if (!hex || typeof hex !== "string") {
    // Return black as fallback for invalid color names
    return { r: 0, g: 0, b: 0 };
  }
  // Simple hex to RGB conversion for named colors only
  const clean = hex.startsWith("#") ? hex.slice(1) : hex;
  if (clean.length !== HEX_BLUE_END && clean.length !== 3) {
    // Return black as fallback for invalid hex format
    return { r: 0, g: 0, b: 0 };
  }

  let rHex: string, gHex: string, bHex: string;
  if (clean.length === 3) {
    // Expand short hex format (e.g., "abc" -> "aabbcc")
    rHex = clean[0].repeat(2);
    gHex = clean[1].repeat(2);
    bHex = clean[2].repeat(2);
  } else {
    rHex = clean.slice(HEX_RED_START, HEX_BYTE_LENGTH);
    gHex = clean.slice(HEX_GREEN_START, HEX_BLUE_START);
    bHex = clean.slice(HEX_BLUE_START, HEX_BLUE_END);
  }

  const r = Number.parseInt(rHex, HEX_RADIX);
  const g = Number.parseInt(gHex, HEX_RADIX);
  const b = Number.parseInt(bHex, HEX_RADIX);

  // Validate parsed RGB values
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return { r: 0, g: 0, b: 0 };
  }

  return { r, g, b };
};

const toBaseName = (compound: BrightColorName): BaseColorName => {
  if (!compound || typeof compound !== "string") {
    return "black"; // fallback for invalid input
  }
  const base = compound.replace(BRIGHT_SUFFIX_REGEX, "");
  if (!base) {
    return "black"; // fallback for empty result
  }
  const key = base.charAt(0).toLowerCase() + base.slice(1);
  return key as BaseColorName;
};

const parseColorName = (name: ColorName): { rgb: Rgb; wantBright: boolean } => {
  if (!name || typeof name !== "string") {
    // Return black as fallback for invalid input
    return { rgb: { r: 0, g: 0, b: 0 }, wantBright: false };
  }

  if (name.endsWith("Bright")) {
    const base = toBaseName(name as BrightColorName);
    const rgb = fromNamed(base);
    // Lighten a bit in high levels; level 1 will use bright SGR
    const rgbAdj = mixWithWhite(rgb, BRIGHT_MIX_FACTOR);
    return { rgb: rgbAdj, wantBright: true };
  }
  return { rgb: fromNamed(name as BaseColorName), wantBright: false };
};

const openForOp = (op: SgrOp): string => {
  if (CURRENT_LEVEL === COLOR_LEVEL_OFF) {
    return "";
  }
  switch (op.kind) {
    case "style":
      return sgr(op.open);
    case "fg-basic":
      return sgr([(op.bright ? SGR_FG_BRIGHT_BASE : SGR_FG_BASE) + op.idx]);
    case "bg-basic":
      return sgr([(op.bright ? SGR_BG_BRIGHT_BASE : SGR_BG_BASE) + op.idx]);
    case "fg-256":
      return `${ESC}38;5;${op.code}m`;
    case "bg-256":
      return `${ESC}48;5;${op.code}m`;
    case "fg-true":
      return `${ESC}38;2;${op.rgb.r};${op.rgb.g};${op.rgb.b}m`;
    case "bg-true":
      return `${ESC}48;2;${op.rgb.r};${op.rgb.g};${op.rgb.b}m`;
    default:
      return "";
  }
};

const opsToOpen = (ops: SgrOp[]): string => {
  if (CURRENT_LEVEL === COLOR_LEVEL_OFF) {
    return "";
  }
  let out = "";
  for (const op of ops) {
    out += openForOp(op);
  }
  return out;
};

// Optimized multiline processing with fewer allocations and branches
const applyOpsToText = (ops: SgrOp[], input: ApplyInput): string => {
  const text = String(input);
  if (CURRENT_LEVEL === COLOR_LEVEL_OFF || ops.length === 0 || text.length === 0) {
    return text;
  }

  const open = opsToOpen(ops);

  // Fast path for single-line text (most common case)
  if (!text.includes("\n")) {
    return `${open}${text}${RESET}`;
  }

  // Optimized multiline handling with pre-calculated string lengths
  const lines = text.split("\n");
  const result = new Array(lines.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.endsWith("\r")) {
      result[i] = `${open}${line.slice(0, -1)}\r${RESET}`;
    } else {
      result[i] = `${open}${line}${RESET}`;
    }
  }

  return result.join("\n");
};

// Build operations for a color request according to CURRENT_LEVEL
const mkFgOpsFromRgb = (rgb: Rgb, wantBright = false): SgrOp[] => {
  if (CURRENT_LEVEL === COLOR_LEVEL_BASIC) {
    const idx = nearestBasicIndex(rgb);
    return [{ kind: "fg-basic", idx, bright: wantBright }];
  }
  if (CURRENT_LEVEL === COLOR_LEVEL_256) {
    return [{ kind: "fg-256", code: rgbToAnsi256(rgb) }];
  }
  return [{ kind: "fg-true", rgb }];
};

const mkBgOpsFromRgb = (rgb: Rgb, wantBright = false): SgrOp[] => {
  if (CURRENT_LEVEL === COLOR_LEVEL_BASIC) {
    const idx = nearestBasicIndex(rgb);
    return [{ kind: "bg-basic", idx, bright: wantBright }];
  }
  if (CURRENT_LEVEL === COLOR_LEVEL_256) {
    return [{ kind: "bg-256", code: rgbToAnsi256(rgb) }];
  }
  return [{ kind: "bg-true", rgb }];
};

// Style ops
const STYLE_TABLE: Record<ReStyleKey, SgrOp> = {
  reset: { kind: "style", open: [SGR_RESET] },
  bold: { kind: "style", open: [SGR_BOLD] },
  dim: { kind: "style", open: [SGR_DIM] },
  italic: { kind: "style", open: [SGR_ITALIC] },
  underline: { kind: "style", open: [SGR_UNDERLINE] },
  inverse: { kind: "style", open: [SGR_INVERSE] },
  hidden: { kind: "style", open: [SGR_HIDDEN] },
  strikethrough: { kind: "style", open: [SGR_STRIKETHROUGH] },
};

// Lookup maps
const STYLE_KEYS = new Set([
  "reset",
  "bold",
  "dim",
  "italic",
  "underline",
  "inverse",
  "hidden",
  "strikethrough",
]);

// Direct color/bg key checks
const isColorKey = (key: string): boolean => {
  if (!key || typeof key !== "string") {
    return false;
  }
  // Base colors and extended colors
  if (key in NAMED_COLORS) {
    return true;
  }
  // Bright variants
  if (key.endsWith("Bright") && key.length > BRIGHT_SUFFIX_LENGTH) {
    const baseName = key.slice(0, -BRIGHT_SUFFIX_LENGTH);
    return baseName in NAMED_COLORS;
  }
  return false;
};

const isBgKey = (key: string): boolean => {
  if (!key || typeof key !== "string" || !key.startsWith("bg") || key.length <= BG_PREFIX_LENGTH) {
    return false;
  }
  const colorPart = key.charAt(BG_PREFIX_LENGTH).toLowerCase() + key.slice(BG_COLOR_START);
  return isColorKey(colorPart);
};

// Proxy with performance through pre-computed lookups
const callableProxy = (ops: SgrOp[]): Re => {
  const base = ((input: ApplyInput) => applyOpsToText(ops, input)) as FormatCallable;
  Object.defineProperty(base, OP_SYMBOL, {
    value: ops,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return new Proxy(base as unknown as Re, {
    apply(_target, _thisArg, argArray) {
      const [input] = argArray as [ApplyInput];
      return applyOpsToText(ops, input);
    },
    get(_target, prop) {
      const key = String(prop);

      // Ops extractor for chain()
      if (prop === OP_SYMBOL) {
        return ops;
      }

      // Fast path for styles using Set lookup
      if (STYLE_KEYS.has(key)) {
        const op = STYLE_TABLE[key as ReStyleKey];
        return callableProxy([...ops, op]);
      }

      // Fast path for colors
      if (isBgKey(key)) {
        const raw = key.slice(BG_PREFIX_LENGTH); // remove 'bg'
        if (!raw) {
          return callableProxy(ops); // no-op for empty color name
        }
        const colorName = raw.charAt(0).toLowerCase() + raw.slice(1);
        const { rgb, wantBright } = parseColorName(colorName as ColorName);
        return callableProxy([...ops, ...mkBgOpsFromRgb(rgb, wantBright)]);
      }

      if (isColorKey(key)) {
        const { rgb, wantBright } = parseColorName(key as ColorName);
        return callableProxy([...ops, ...mkFgOpsFromRgb(rgb, wantBright)]);
      }

      // Unknown key → return self (no-op), keeps chain resilient
      return callableProxy(ops);
    },
  });
};

// Public root
export const re: Re = callableProxy([]);

// chain(re.bold, re.red, re.underline)("text")
export const chain = (...parts: FormatCallable[]): Re => {
  const collected: SgrOp[] = [];
  for (const p of parts) {
    const ops = (p as FormatCallable)[OP_SYMBOL] as SgrOp[] | undefined;
    if (ops && ops.length > 0) {
      for (const op of ops) {
        collected.push(op);
      }
    }
  }
  return callableProxy(collected);
};
