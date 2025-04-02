import { defineConfig } from "./src/main.js";

/**
 * RELICO CONFIGURATION FILE
 * - Hover over a field to see the information
 * - Use intellisense to see available options
 * @see https://github.com/reliverse/relico
 */
export default defineConfig({
  colorLevel: 3,
  theme: "secondary",
  customColors: {
    blue: ["#5f87ff", "#5f87ff"],
    red: ["#ff5555", "#ff0000"],
    green: ["#00ff00", "#00cc00"],
  },
});
