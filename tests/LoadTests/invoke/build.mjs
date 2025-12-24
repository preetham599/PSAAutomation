import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../");

build({
  entryPoints: [
    path.join(projectRoot, "tests/LoadTests/invoke/invoke.baseline.ts"),
    path.join(projectRoot, "tests/LoadTests/invoke/invoke.ramp.ts"),
  ],
  bundle: true,
  outdir: path.join(projectRoot, "tests/LoadTests/dist"),
  format: "esm",
  platform: "neutral",
  target: "es2020",
  external: ["k6", "k6/*"],
}).catch(() => process.exit(1));
