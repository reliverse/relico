import { chain, re, rgb, setColorLevel } from "../src/mod.js";

function main() {
  setColorLevel(3);

  console.log("--- Basic Color Examples ---");
  console.log(re.bold.red.underline("Hello"));
  console.log(chain(re.bold, re.red)("world"));
  console.log(rgb(255, 0, 0).italic("hello"));
  console.log(re.rgb(255, 0, 0).bold("hi"));
  console.log(re.bgHex("#222").white(" on dark "));

  // Additional color tests
  console.log("\n--- More Color Examples ---");
  console.log(re.blue("Blue text"));
  console.log(re.green.bold("Bold green text"));
  console.log(re.yellow.underline("Yellow underlined text"));
  console.log(re.magenta.italic("Magenta italic text"));
  console.log(re.bgRed.white("White text on red background"));
  console.log(re.bgBlue.yellow("Yellow text on blue background"));
  console.log(re.rgb(255, 165, 0).bold("Custom orange (RGB)"));
  console.log(re.hex("#FF69B4").underline("Custom pink (HEX)"));
  console.log(re.hsl(120, 100, 50).bold("Custom green (HSL)"));
}

main();
