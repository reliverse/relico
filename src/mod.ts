/* @reliverse/relico - Tiny, type-safe terminal color library with chainable API
   - Levels: 0 (off), 1 (ANSI 8/bright), 2 (ANSI 256), 3 (Truecolor)
   - Named palettes (std, web, grayscale), Bright & Pastel variants, bg-variants
   - Formats: hex, rgb, hsl (+ bgHex/bgRgb/bgHsl)
   - Chainable: re.bold.red.underline("text"), chain(re.bold, re.red)("text")
   - Multiline-safe: styles applied per line with reset to prevent bleed
*/

type ColorLevel = 0 | 1 | 2 | 3;

type Rgb = { r: number; g: number; b: number };

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

type BaseColorName =
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

type ColorName = BaseColorName | GrayScaleName | BrightColorName | PastelColorName | BgColorName;

type GrayScaleName =
  | "gray10"
  | "gray20"
  | "gray30"
  | "gray40"
  | "gray50"
  | "gray60"
  | "gray70"
  | "gray80"
  | "gray90";

type BrightColorName =
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

type PastelColorName =
  | "blackPastel"
  | "redPastel"
  | "greenPastel"
  | "yellowPastel"
  | "bluePastel"
  | "magentaPastel"
  | "cyanPastel"
  | "whitePastel"
  | "grayPastel"
  | "orangePastel"
  | "pinkPastel"
  | "purplePastel"
  | "tealPastel"
  | "limePastel"
  | "brownPastel"
  | "navyPastel"
  | "maroonPastel"
  | "olivePastel"
  | "silverPastel";

type BgColorName =
  | `bg${Capitalize<BaseColorName>}`
  | `bg${Capitalize<GrayScaleName>}`
  | `bg${Capitalize<BrightColorName>}`
  | `bg${Capitalize<PastelColorName>}`;

type ReStyleKey =
  | "reset"
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "inverse"
  | "hidden"
  | "strikethrough";

type ReDynamicFnKey = "rgb" | "hex" | "hsl" | "bgRgb" | "bgHex" | "bgHsl";

type ReKey = ReStyleKey | ColorName | ReDynamicFnKey;

type MkRgbFn = (r: number, g: number, b: number) => Re;
type MkHexFn = (hex: string) => Re;
type MkHslFn = (h: number, s: number, l: number) => Re;

type StyleKeys =
  | "reset"
  | "bold"
  | "dim"
  | "italic"
  | "underline"
  | "inverse"
  | "hidden"
  | "strikethrough";
type DynamicKeys = "rgb" | "hex" | "hsl" | "bgRgb" | "bgHex" | "bgHsl";

type Re = FormatCallable & {
  readonly [K in StyleKeys]: Re;
} & {
  readonly [K in ColorName]: Re;
} & {
  readonly [K in BgColorName]: Re;
} & {
  readonly rgb: MkRgbFn;
  readonly hex: MkHexFn;
  readonly hsl: MkHslFn;
  readonly bgRgb: MkRgbFn;
  readonly bgHex: MkHexFn;
  readonly bgHsl: MkHslFn;
};

const ESC = "\x1B[";
const RESET = `${ESC}0m`;
const OP_SYMBOL: unique symbol = Symbol("re.ops");

let CURRENT_LEVEL: ColorLevel = 3;

export const setColorLevel = (level: ColorLevel): void => {
  if (level !== 0 && level !== 1 && level !== 2 && level !== 3) {
    throw new Error("Invalid color level");
  }
  CURRENT_LEVEL = level;
};

const clampByte = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
};

const clampPct = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

// hex regex with pre-compiled pattern
const hexRe = /^#?([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/;

// hex parser with small allocations
const hexToRgb = (hex: string): Rgb | null => {
  const len = hex.length;
  const start = hex[0] === "#" ? 1 : 0;
  const raw = hex.slice(start);
  const rawLen = raw.length;

  if (rawLen !== 3 && rawLen !== 6) return null;

  // Validate hex characters without regex for better performance
  for (let i = 0; i < rawLen; i++) {
    const c = raw.charCodeAt(i);
    if (!((c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102))) {
      return null;
    }
  }

  if (rawLen === 3) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return { r, g, b };
  }

  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};

// Optimized HSL to RGB with fewer branches and calculations
const hslToRgb = (h: number, s: number, l: number): Rgb => {
  const H = ((h % 360) + 360) % 360;
  const S = Math.min(100, Math.max(0, s)) / 100;
  const L = Math.min(100, Math.max(0, l)) / 100;

  if (S === 0) {
    const v = Math.round(L * 255);
    return { r: v, g: v, b: v };
  }

  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;

  // index-based lookup
  const sector = Math.floor(H / 60) % 6;
  const rgbValues = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];

  return {
    r: Math.round((rgbValues[0] + m) * 255),
    g: Math.round((rgbValues[1] + m) * 255),
    b: Math.round((rgbValues[2] + m) * 255),
  };
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
    if (rgb.r < 8) return 16;
    if (rgb.r > 248) return 231;
    const step = Math.round(((rgb.r - 8) / 247) * 24);
    return 232 + step;
  }
  const r = Math.round((rgb.r / 255) * 5);
  const g = Math.round((rgb.g / 255) * 5);
  const b = Math.round((rgb.b / 255) * 5);
  return 16 + 36 * r + 6 * g + b;
};

// Color data
const CORE_COLORS: Record<string, string> = {
  black: "#000000",
  red: "#ff0000",
  green: "#00ff00",
  yellow: "#ffff00",
  blue: "#0000ff",
  magenta: "#ff00ff",
  cyan: "#00ffff",
  white: "#ffffff",
  gray: "#808080",
};

const EXTENDED_COLORS: Record<string, string> = {
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

// Lazy-loaded combined colors
let NAMED_HEX: Record<BaseColorName, string> | undefined;

// Lazy loader for named colors
const getNamedColors = (): Record<BaseColorName, string> => {
  if (NAMED_HEX) return NAMED_HEX;
  NAMED_HEX = { ...CORE_COLORS, ...EXTENDED_COLORS } as Record<BaseColorName, string>;
  return NAMED_HEX;
};

// Optimized grayscale generation - computed at runtime
let GRAYS: Record<GrayScaleName, string> | undefined;

const getGrayColors = (): Record<GrayScaleName, string> => {
  if (GRAYS) return GRAYS;
  GRAYS = {} as Record<GrayScaleName, string>;
  // Generate grays programmatically to reduce bundle size
  for (let i = 1; i <= 9; i++) {
    const value = Math.round(26 * i - 10); // 16, 42, 68, 94, 120, 146, 172, 198, 224
    const hex = value.toString(16).padStart(2, "0");
    const key = `gray${i}0` as GrayScaleName;
    GRAYS[key] = `#${hex}${hex}${hex}`;
  }
  return GRAYS;
};

const mixWithWhite = (rgb: Rgb, factor: number): Rgb => {
  const t = factor;
  return {
    r: clampByte(rgb.r * (1 - t) + 255 * t),
    g: clampByte(rgb.g * (1 - t) + 255 * t),
    b: clampByte(rgb.b * (1 - t) + 255 * t),
  };
};

const fromNamed = (name: BaseColorName): Rgb => {
  const hex = getNamedColors()[name];
  const rgb = hexToRgb(hex);
  return rgb ?? { r: 255, g: 255, b: 255 };
};

const fromGrayName = (name: GrayScaleName): Rgb => {
  const hex = getGrayColors()[name];
  const rgb = hexToRgb(hex);
  return rgb ?? { r: 128, g: 128, b: 128 };
};

const toBaseName = (compound: BrightColorName | PastelColorName): BaseColorName => {
  const base = compound.replace(/(Bright|Pastel)$/u, "");
  const key = base.charAt(0).toLowerCase() + base.slice(1);
  // @ts-expect-error - key is safe by construction
  return key;
};

const parseColorName = (name: ColorName): { rgb: Rgb; wantBright: boolean } => {
  if ((name as string).endsWith("Bright")) {
    const base = toBaseName(name as BrightColorName);
    const rgb = fromNamed(base);
    // Lighten a bit in high levels; level 1 will use bright SGR
    const rgbAdj = mixWithWhite(rgb, 0.25);
    return { rgb: rgbAdj, wantBright: true };
  }
  if ((name as string).endsWith("Pastel")) {
    const base = toBaseName(name as PastelColorName);
    const rgb = fromNamed(base);
    const rgbAdj = mixWithWhite(rgb, 0.6);
    return { rgb: rgbAdj, wantBright: false };
  }
  if ((name as string).startsWith("gray")) {
    return { rgb: fromGrayName(name as GrayScaleName), wantBright: false };
  }
  return { rgb: fromNamed(name as BaseColorName), wantBright: false };
};

const openForOp = (op: SgrOp): string => {
  if (CURRENT_LEVEL === 0) return "";
  switch (op.kind) {
    case "style":
      return sgr(op.open);
    case "fg-basic":
      return sgr([(op.bright ? 90 : 30) + op.idx]);
    case "bg-basic":
      return sgr([(op.bright ? 100 : 40) + op.idx]);
    case "fg-256":
      return `${ESC}38;5;${op.code}m`;
    case "bg-256":
      return `${ESC}48;5;${op.code}m`;
    case "fg-true":
      return `${ESC}38;2;${op.rgb.r};${op.rgb.g};${op.rgb.b}m`;
    case "bg-true":
      return `${ESC}48;2;${op.rgb.r};${op.rgb.g};${op.rgb.b}m`;
  }
};

const opsToOpen = (ops: SgrOp[]): string => {
  if (CURRENT_LEVEL === 0) return "";
  let out = "";
  for (const op of ops) out += openForOp(op);
  return out;
};

// Optimized multiline processing with fewer allocations and branches
const applyOpsToText = (ops: SgrOp[], input: ApplyInput): string => {
  const text = String(input);
  if (CURRENT_LEVEL === 0 || ops.length === 0 || text.length === 0) return text;

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
  if (CURRENT_LEVEL === 1) {
    const idx = nearestBasicIndex(rgb);
    return [{ kind: "fg-basic", idx, bright: wantBright }];
  }
  if (CURRENT_LEVEL === 2) {
    return [{ kind: "fg-256", code: rgbToAnsi256(rgb) }];
  }
  return [{ kind: "fg-true", rgb }];
};

const mkBgOpsFromRgb = (rgb: Rgb, wantBright = false): SgrOp[] => {
  if (CURRENT_LEVEL === 1) {
    const idx = nearestBasicIndex(rgb);
    return [{ kind: "bg-basic", idx, bright: wantBright }];
  }
  if (CURRENT_LEVEL === 2) {
    return [{ kind: "bg-256", code: rgbToAnsi256(rgb) }];
  }
  return [{ kind: "bg-true", rgb }];
};

// Style ops
const STYLE_TABLE: Record<ReStyleKey, SgrOp> = {
  reset: { kind: "style", open: [0] },
  bold: { kind: "style", open: [1] },
  dim: { kind: "style", open: [2] },
  italic: { kind: "style", open: [3] },
  underline: { kind: "style", open: [4] },
  inverse: { kind: "style", open: [7] },
  hidden: { kind: "style", open: [8] },
  strikethrough: { kind: "style", open: [9] },
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
const DYNAMIC_KEYS = new Set(["rgb", "hex", "hsl", "bgRgb", "bgHex", "bgHsl"]);

// Pre-computed color key maps
let COLOR_KEY_CACHE: Set<string> | undefined;
let BG_KEY_CACHE: Set<string> | undefined;

const getColorKeys = (): Set<string> => {
  if (COLOR_KEY_CACHE) return COLOR_KEY_CACHE;

  const baseColors = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "gray",
  ];
  const extendedColors = [
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
  ];
  const grayNames = Array.from({ length: 9 }, (_, i) => `gray${(i + 1) * 10}`);

  COLOR_KEY_CACHE = new Set([
    ...baseColors,
    ...extendedColors,
    ...grayNames,
    ...baseColors.map((c) => `${c}Bright`),
    ...extendedColors.map((c) => `${c}Bright`),
    ...baseColors.map((c) => `${c}Pastel`),
    ...extendedColors.map((c) => `${c}Pastel`),
    "grayPastel",
  ]);

  return COLOR_KEY_CACHE;
};

const getBgKeys = (): Set<string> => {
  if (BG_KEY_CACHE) return BG_KEY_CACHE;

  BG_KEY_CACHE = new Set();
  for (const colorKey of getColorKeys()) {
    const capitalizedKey = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
    BG_KEY_CACHE.add(`bg${capitalizedKey}`);
  }

  return BG_KEY_CACHE;
};

// Core chainable builder
const callableFromOps = (ops: SgrOp[]): FormatCallable => {
  const fn = ((input: ApplyInput) => applyOpsToText(ops, input)) as FormatCallable;
  Object.defineProperty(fn, OP_SYMBOL, {
    value: ops,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return fn;
};

const appendOps = (base: SgrOp[], extra: SgrOp[]): SgrOp[] => {
  const out: SgrOp[] = [];
  for (const op of base) out.push(op);
  for (const op of extra) out.push(op);
  return out;
};

// Dynamic creator methods (rgb/hex/hsl + bg variants)
const mkRgbMethod =
  (ops: SgrOp[], isBg: boolean): MkRgbFn =>
  (r: number, g: number, b: number) => {
    const rgb: Rgb = { r: clampByte(r), g: clampByte(g), b: clampByte(b) };
    const add = isBg ? mkBgOpsFromRgb(rgb) : mkFgOpsFromRgb(rgb);
    return callableProxy(appendOps(ops, add));
  };

const mkHexMethod =
  (ops: SgrOp[], isBg: boolean): MkHexFn =>
  (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return callableProxy(ops);
    const add = isBg ? mkBgOpsFromRgb(rgb) : mkFgOpsFromRgb(rgb);
    return callableProxy(appendOps(ops, add));
  };

const mkHslMethod =
  (ops: SgrOp[], isBg: boolean): MkHslFn =>
  (h: number, s: number, l: number) => {
    const rgb = hslToRgb(h, s, l);
    const add = isBg ? mkBgOpsFromRgb(rgb) : mkFgOpsFromRgb(rgb);
    return callableProxy(appendOps(ops, add));
  };

// Proxy with performance through pre-computed lookups
const callableProxy = (ops: SgrOp[]): Re => {
  const base = callableFromOps(ops);

  return new Proxy(base as unknown as Re, {
    apply(_target, _thisArg, argArray) {
      const [input] = argArray as [ApplyInput];
      return applyOpsToText(ops, input);
    },
    get(_target, prop) {
      const key = String(prop);

      // Ops extractor for chain()
      if (prop === OP_SYMBOL) return ops;

      // Fast path for styles using Set lookup
      if (STYLE_KEYS.has(key)) {
        const op = STYLE_TABLE[key as ReStyleKey];
        return callableProxy(appendOps(ops, [op]));
      }

      // Fast path for dynamic creators using Set lookup
      if (DYNAMIC_KEYS.has(key)) {
        const isBg = key.startsWith("bg");
        switch (key) {
          case "rgb":
            return mkRgbMethod(ops, false);
          case "hex":
            return mkHexMethod(ops, false);
          case "hsl":
            return mkHslMethod(ops, false);
          case "bgRgb":
            return mkRgbMethod(ops, true);
          case "bgHex":
            return mkHexMethod(ops, true);
          case "bgHsl":
            return mkHslMethod(ops, true);
        }
      }

      // Fast path for colors using Set lookups
      const bgKeys = getBgKeys();
      const colorKeys = getColorKeys();

      if (bgKeys.has(key)) {
        const raw = key.slice(2); // remove 'bg'
        const colorName = raw.charAt(0).toLowerCase() + raw.slice(1);
        const { rgb, wantBright } = parseColorName(colorName as ColorName);
        return callableProxy(appendOps(ops, mkBgOpsFromRgb(rgb, wantBright)));
      }

      if (colorKeys.has(key)) {
        const { rgb, wantBright } = parseColorName(key as ColorName);
        return callableProxy(appendOps(ops, mkFgOpsFromRgb(rgb, wantBright)));
      }

      // Unknown key → return self (no-op), keeps chain resilient
      return callableProxy(ops);
    },
  });
};

// Public root
export const re: Re = callableProxy([]);

// Standalone creators
export const rgb: MkRgbFn = (r, g, b) => re.rgb(r, g, b);
export const hex: MkHexFn = (h) => re.hex(h);
export const hsl: MkHslFn = (h, s, l) => re.hsl(h, s, l);
export const bgRgb: MkRgbFn = (r, g, b) => re.bgRgb(r, g, b);
export const bgHex: MkHexFn = (h) => re.bgHex(h);
export const bgHsl: MkHslFn = (h, s, l) => re.bgHsl(h, s, l);

// chain(re.bold, re.red, re.underline)("text")
export const chain = (...parts: FormatCallable[]): Re => {
  const collected: SgrOp[] = [];
  for (const p of parts) {
    const ops = (p as FormatCallable)[OP_SYMBOL] as SgrOp[] | undefined;
    if (ops && ops.length > 0) {
      for (const op of ops) collected.push(op);
    }
  }
  return callableProxy(collected);
};

// ---- Basic validation helpers you might want to export ----

export const parseRgb = (value: string): Rgb | null => {
  const v = value.trim();
  if (!v.toLowerCase().startsWith("rgb(") || !v.endsWith(")")) return null;
  const inner = v.slice(4, -1);
  const parts = inner.split(",").map((s) => s.trim());
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => Number.parseInt(p, 10));
  if (!Number.isFinite(nums[0]) || !Number.isFinite(nums[1]) || !Number.isFinite(nums[2]))
    return null;
  return { r: clampByte(nums[0]), g: clampByte(nums[1]), b: clampByte(nums[2]) };
};

export const parseHsl = (value: string): { h: number; s: number; l: number } | null => {
  const v = value.trim().toLowerCase();
  if (!v.startsWith("hsl(") || !v.endsWith(")")) return null;
  const inner = v.slice(4, -1);
  const parts = inner.split(",").map((s) => s.trim().replace(/%$/u, ""));
  if (parts.length !== 3) return null;
  const h = Number.parseFloat(parts[0]);
  const s = Number.parseFloat(parts[1]);
  const l = Number.parseFloat(parts[2]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h, s, l };
};
