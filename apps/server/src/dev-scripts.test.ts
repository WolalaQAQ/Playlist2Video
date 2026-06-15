import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageJsonPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../package.json",
);

describe("root development scripts", () => {
  it("labels parallel dev output while preserving terminal colors", async () => {
    const packageJson = JSON.parse(
      await fs.readFile(packageJsonPath, "utf8"),
    ) as {
      scripts: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.scripts.dev).toBe(
      "cross-env FORCE_COLOR=1 npm-run-all --print-label --parallel dev:server dev:web",
    );
    expect(packageJson.devDependencies).toHaveProperty("cross-env");
  });
});
