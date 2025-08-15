import { re } from "../src/mod.js";

console.log("=== DEBUGGING COLOR MAPPING ===");

// Test what the actual functions are doing
console.log("Testing re.red function directly:");
const redFunc = re.red;
console.log("typeof re.red:", typeof redFunc);
console.log("re.red.name:", redFunc.name);

// Test calling it
const redResult = redFunc("test");
console.log("re.red('test') result:", JSON.stringify(redResult));
console.log("re.red('test') length:", redResult.length);

// Check if it has chainable properties
console.log("re.red.bold:", typeof re.red.bold);
console.log("re.red.underline:", typeof re.red.underline);

// Test chainable call
const chainableResult = re.red.bold("test");
console.log("re.red.bold('test'):", JSON.stringify(chainableResult));

// Test different colors
console.log("\nTesting different colors:");
console.log("re.green('test'):", JSON.stringify(re.green("test")));
console.log("re.blue('test'):", JSON.stringify(re.blue("test")));
console.log("re.yellow('test'):", JSON.stringify(re.yellow("test")));

// Test styles
console.log("\nTesting styles:");
console.log("re.bold('test'):", JSON.stringify(re.bold("test")));
console.log("re.italic('test'):", JSON.stringify(re.italic("test")));
console.log("re.underline('test'):", JSON.stringify(re.underline("test")));

// Test what the original identity function would produce
console.log("\nTesting to see what identity would produce:");
const identity = (text: string) => String(text);
console.log("identity('test'):", JSON.stringify(identity("test")));

console.log("\n=== END DEBUG ===");
