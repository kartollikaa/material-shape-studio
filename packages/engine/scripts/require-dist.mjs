import { existsSync } from "node:fs";

if (!existsSync(new URL("../dist/engine.mjs", import.meta.url))) {
  console.error("The engine is not built. Run ./gradlew build first.");
  process.exit(1);
}
