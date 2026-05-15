import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
}

function toCloneUrl(entry: string): string {
  const trimmed = entry.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
  }
  return `https://github.com/${trimmed.replace(/^\/+|\/+$/g, "")}.git`;
}

function run(command: string, cwd: string): void {
  execSync(command, { cwd, stdio: "inherit" });
}

const reposPath = join(process.cwd(), "repositories.json");
const repos = JSON.parse(readFileSync(reposPath, "utf8")) as unknown;

if (!Array.isArray(repos) || repos.length === 0) {
  throw new Error(
    "repositories.json must be a non-empty array of repository URLs or owner/name entries",
  );
}

const selected = pickRandom(repos as string[]);
const cloneUrl = toCloneUrl(selected);
const workRoot = mkdtempSync(join(tmpdir(), "repo-agent-"));
const repoDir = join(workRoot, "repo");

console.log(`Selected repository: ${selected}`);
console.log(`Clone URL: ${cloneUrl}`);

try {
  run(`git clone --depth 1 "${cloneUrl}" "${repoDir}"`, process.cwd());
  console.log(`Successfully cloned ${selected}`);
} finally {
  rmSync(workRoot, { recursive: true, force: true });
}
