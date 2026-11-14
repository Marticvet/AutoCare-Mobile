#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const [locale, device] = process.argv.slice(2);
const dimensions = device === "iphone" ? [1320, 2868] : device === "ipad" ? [2064, 2752] : null;
if (!locale || !dimensions) {
  console.error("Usage: node compose-release-set.mjs <locale> <iphone|ipad>");
  process.exit(64);
}

const copy = JSON.parse(readFileSync(join(scriptDirectory, "marketing-copy.json"), "utf8"));
if (!copy[locale]) {
  console.error(`Unsupported screenshot locale: ${locale}`);
  process.exit(64);
}

const names = [
  "dashboard",
  "vehicles",
  "expenses",
  device === "ipad" ? "fuel-entry" : "vehicle-details",
  "reminders",
  "quick-add",
];
const rawDirectory = join(root, "release-v1", locale, device, "raw");
const outputDirectory = join(root, "release-v1", locale, device, "final");
mkdirSync(outputDirectory, { recursive: true });

names.forEach((name, index) => {
  const prefix = String(index + 1).padStart(2, "0");
  const input = join(rawDirectory, `${prefix}-${name}.png`);
  const output = join(outputDirectory, `${prefix}-${name}.png`);
  if (!existsSync(input)) {
    console.error(`Missing authentic ${locale} ${device} capture: ${input}`);
    process.exit(1);
  }
  const result = spawnSync("swift", [
    join(scriptDirectory, "compose.swift"), input, output,
    index === 3 && device === "ipad" ? copy.fuelEntry[locale] : copy[locale][index],
    String(dimensions[0]), String(dimensions[1]),
  ], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
});
