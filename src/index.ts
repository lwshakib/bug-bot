import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function pickRandom<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
}

function toCloneUrl(entry: string, token?: string): string {
  const trimmed = entry.trim();
  let url: string;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    url = trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
  } else {
    url = `https://github.com/${trimmed.replace(/^\/+|\/+$/g, "")}.git`;
  }

  if (token && url.startsWith("https://github.com/")) {
    return url.replace(
      "https://github.com/",
      `https://x-access-token:${token}@github.com/`,
    );
  }

  return url;
}

function run(command: string, cwd: string, env?: Record<string, string>): void {
  execSync(command, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...env, GIT_TERMINAL_PROMPT: "0" },
  });
}

const reposPath = join(process.cwd(), "repositories.json");
const repos = JSON.parse(readFileSync(reposPath, "utf8")) as unknown;

if (!Array.isArray(repos) || repos.length === 0) {
  throw new Error(
    "repositories.json must be a non-empty array of repository URLs or owner/name entries",
  );
}

const selected = pickRandom(repos as string[]);
const token = process.env["GITHUB_TOKEN"];
const cloneUrl = toCloneUrl(selected, token);
const workRoot = mkdtempSync(join(tmpdir(), "repo-agent-"));
const repoDir = join(workRoot, "repo");

console.log(`Selected repository: ${selected}`);
console.log(
  `Clone URL: ${cloneUrl.replace(/https:\/\/.*@github\.com/, "https://***@github.com")}`,
);

try {
  run(`git clone --depth 1 "${cloneUrl}" "${repoDir}"`, process.cwd());
  console.log(`Successfully cloned ${selected}`);
} catch (error) {
  if (error instanceof Error) {
    error.message = error.message.replace(
      /https:\/\/.*@github\.com/,
      "https://***@github.com",
    );
  }
  throw error;
} finally {
  rmSync(workRoot, { recursive: true, force: true });
}
