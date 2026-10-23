import { chromium } from "playwright-core";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const port = 3100;
const dbFile = path.join(os.tmpdir(), `strikeel-e2e-${Date.now()}.sqlite`);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "/usr/bin/google-chrome");

const server = spawn(
  pnpm,
  ["--filter", "@strikeel/web", "exec", "next", "start", "-p", String(port)],
  {
    cwd: root,
    shell: true,
    stdio: "ignore",
    env: { ...process.env, STRIKEEL_DB_PATH: dbFile },
  }
);

async function waitFor(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`server not ready: ${url}`);
}

let browser;
try {
  await waitFor(`http://127.0.0.1:${port}`);
  browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle", timeout: 60_000 });

  const banner = "Preview only - no order submitted";
  await page.waitForSelector(`text=${banner}`, { timeout: 30_000 });
  await page.getByRole("button", { name: /Analyze portfolio/i }).click();
  await page.waitForSelector("text=Portfolio value", { timeout: 120_000 });
  await page.waitForSelector("text=Hedge preview", { timeout: 30_000 });

  const text = await page.locator("body").innerText();
  for (const expected of [banner, "SIMULATE", "No orders submitted", "orders submitted: false"]) {
    if (!text.includes(expected)) throw new Error(`missing expected text: ${expected}`);
  }

  await page.getByRole("button", { name: /Create hedge strategy/i }).click();
  await page.waitForSelector("text=mandate inactive", { timeout: 30_000 });
  await page.getByRole("button", { name: /Activate mandate/i }).click();
  await page.waitForSelector("text=mandate active", { timeout: 30_000 });
  await page.getByRole("button", { name: /Simulate hedge/i }).click();
  await page.waitForSelector("text=SIMULATED FILLED", { timeout: 120_000 });
  await page.waitForTimeout(800);

  const evidence = path.join(root, "docs", "evidence");
  fs.mkdirSync(evidence, { recursive: true });
  await page.screenshot({ path: path.join(evidence, "slice-002-e2e.png"), fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Analyze portfolio/i }).click();
  await page.waitForSelector("text=Portfolio value", { timeout: 120_000 });
  await page.waitForSelector("text=FILLED", { timeout: 30_000 });
  await page.waitForSelector("text=mandate active", { timeout: 30_000 });
  await page.waitForSelector("text=SIMULATED FILL", { timeout: 30_000 });

  console.log("E2E PASS: create -> activate -> simulate -> FILLED -> reload persisted");
} finally {
  if (browser) await browser.close();
  if (server.pid) {
    try {
      execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    } catch {
      server.kill();
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  try {
    fs.rmSync(dbFile, { force: true });
  } catch {
    // Windows may keep the SQLite handle briefly; temp file cleanup is best-effort.
  }
}

