import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist", "build", "test", "tests"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("simulation boundary", () => {
  it("contains no Strike order-submission path", () => {
    const root = process.cwd();
    const files = [
      ...walk(path.join(root, "packages")),
      ...walk(path.join(root, "apps", "web", "app")),
      ...walk(path.join(root, "scripts")),
    ];
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return (
        source.includes("/v2/order") ||
        source.includes("X-API-Wallet") ||
        source.includes("X-Builder-Fee-Bps")
      );
    });

    expect(offenders).toEqual([]);
  });
});
