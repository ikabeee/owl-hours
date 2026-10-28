import { defineConfig } from "astro/config";

// Static output: the landing is informational only (no forms, no login).
export default defineConfig({
  output: "static",
});
