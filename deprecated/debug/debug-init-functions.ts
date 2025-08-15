type ColorArray = [string, string];

// Simulate the correct color map from other debug files
const colorMap: Record<string, ColorArray> = {
  reset: ["\x1b[0m", "\x1b[0m"],
  bold: ["\x1b[1m", "\x1b[22m"],
  dim: ["\x1b[2m", "\x1b[22m"],
  italic: ["\x1b[3m", "\x1b[23m"],
  underline: ["\x1b[4m", "\x1b[24m"],
  inverse: ["\x1b[7m", "\x1b[27m"],
  hidden: ["\x1b[8m", "\x1b[28m"],
  strikethrough: ["\x1b[9m", "\x1b[29m"],
  black: ["\x1b[38;2;0;0;0m", "\x1b[39m"],
  red: ["\x1b[38;2;255;85;85m", "\x1b[39m"],
  green: ["\x1b[38;2;0;255;0m", "\x1b[39m"],
  yellow: ["\x1b[38;2;255;255;0m", "\x1b[39m"],
  blue: ["\x1b[38;2;0;0;255m", "\x1b[39m"],
  magenta: ["\x1b[38;2;255;0;255m", "\x1b[39m"],
  cyan: ["\x1b[38;2;0;255;255m", "\x1b[39m"],
  white: ["\x1b[38;2;255;255;255m", "\x1b[39m"],
  gray: ["\x1b[38;2;128;128;128m", "\x1b[39m"],
};

console.log("=== DEBUG initColorFunctions ===");
console.log("Color map entries:", Object.keys(colorMap));

// Recreate the createFormatter function
function createFormatter(open: string, close: string): (input: string | number) => string {
  if (!open && !close) {
    return (text) => String(text);
  }

  if (open === "" || close === "") {
    return (text) => String(text);
  }

  return (input) => {
    const text = String(input);
    if (!text) return text;

    if (text.includes("\n")) {
      return text
        .split("\n")
        .map((line) => (line ? open + line + close : line))
        .join("\n");
    }

    return open + text + close;
  };
}

// Recreate initColorFunctions logic
const colorFunctions: Record<string, (text: string | number) => string> = {};
const formatterCache = new Map<string, (text: string | number) => string>();

console.log("\nProcessing color map entries:");

for (const [key, [open, close]] of Object.entries(colorMap)) {
  console.log(`\nProcessing ${key}:`);
  console.log(`  open: ${JSON.stringify(open)}`);
  console.log(`  close: ${JSON.stringify(close)}`);

  const cacheKey = `formatter:${open}:${close}`;
  console.log(`  cache key: ${cacheKey}`);

  let formatter: (text: string | number) => string;

  if (formatterCache.has(cacheKey)) {
    formatter = formatterCache.get(cacheKey)!;
    console.log(`  -> Using cached formatter`);
  } else {
    formatter = createFormatter(open, close);
    formatterCache.set(cacheKey, formatter);
    console.log(`  -> Created new formatter`);
  }

  colorFunctions[key] = formatter;

  // Test the formatter immediately
  const testResult = formatter("test");
  console.log(`  -> Test result: ${JSON.stringify(testResult)}`);
}

console.log("\n=== TESTING FINAL FUNCTIONS ===");
console.log("colorFunctions keys:", Object.keys(colorFunctions));

// Test specific functions
const testKeys = ["red", "green", "blue", "bold", "reset"];
for (const key of testKeys) {
  if (colorFunctions[key]) {
    const result = colorFunctions[key]("test");
    console.log(`${key}("test"): ${JSON.stringify(result)}`);
  } else {
    console.log(`${key}: NOT FOUND`);
  }
}

console.log("\n=== END DEBUG ===");
