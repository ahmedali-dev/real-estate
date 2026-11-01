import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Keep the existing non-compiler React patterns during the framework migration.
  { rules: { "react-hooks/set-state-in-effect": "off", "react-hooks/refs": "off" } },
  globalIgnores([".next-backup-*/**", ".next/**", "node_modules/**", "services/openwa/**", "public/**"]),
]);
