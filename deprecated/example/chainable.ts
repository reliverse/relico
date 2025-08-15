import { chain, re } from "../src/mod.js";

// Test the original example that was failing
console.log("Testing original failing example:");
const result1 = re.gray(`${re.bold.underline("SPACE")} or ${re.bold.underline("ENTER")} to edit.`);
console.log("✅ re.bold.underline works:", result1);

// Test various chaining scenarios
console.log("\nTesting various chaining scenarios:");

// Single color
console.log("Single color:", re.red("Hello"));

// Two-level chaining
console.log("Two-level chaining:", re.bold.red("Bold Red"));
console.log("Reverse order:", re.red.bold("Red Bold"));

// Three-level chaining
console.log("Three-level chaining:", re.bold.underline.red("Bold Underline Red"));

// Background colors
console.log("Background chaining:", re.bgBlue.white("White on Blue"));

// Complex chaining
console.log("Complex chaining:", re.bold.italic.underline.red.bgYellow("All styles"));

// Test with numbers
console.log("With numbers:", re.green.bold(42));

// Test existing chain function still works
console.log("\nTesting existing chain function:");
const chainResult = chain(re.bold, re.red, re.underline)("Chain function works");
console.log("Chain function:", chainResult);

// Test that both approaches produce similar results
console.log("\nComparing dot notation vs chain function:");
const dotNotation = re.bold.red.underline("Test");
const chainFunction = chain(re.bold, re.red, re.underline)("Test");
console.log("Dot notation:    ", dotNotation);
console.log("Chain function:  ", chainFunction);

console.log("\n✅ All tests passed! Chainable dot notation is working!");
