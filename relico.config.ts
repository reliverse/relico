import { defineConfig } from "./src/main.js";

export default defineConfig({
  // Set the color level: 3 for truecolor
  colorLevel: 3,
  // Choose the theme: "primary" or "secondary"
  theme: "secondary",
  // Override specific colors
  // - Use Intellisense to see the available colors
  // - Theming: ["primary", "secondary"]
  customColors: {
    blue: ["#5f87ff", "#5f87ff"],
    red: ["#ff5555", "#ff0000"],
    green: ["#00ff00", "#00cc00"],
    // Note: The following text formatting
    // colors can be defined only via ANSI:
    // reset: ["\x1b[0m", "\x1b[0m"],
    // bold: ["\x1b[1m", "\x1b[22m", "\x1b[22m\x1b[1m"],
    // dim: ["\x1b[2m", "\x1b[22m", "\x1b[22m\x1b[2m"],
    // italic: ["\x1b[3m", "\x1b[23m"],
    // underline: ["\x1b[4m", "\x1b[24m"],
    // inverse: ["\x1b[7m", "\x1b[27m"],
    // hidden: ["\x1b[8m", "\x1b[28m"],
    // strikethrough: ["\x1b[9m", "\x1b[29m"],
  },
});
