import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Detect which package manager the repo uses based on lockfiles.
 */
function detectPackageManager(repoDir: string): string {
  if (existsSync(join(repoDir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(repoDir, "yarn.lock"))) return "yarn";
  if (existsSync(join(repoDir, "bun.lockb")) || existsSync(join(repoDir, "bun.lock"))) return "bun";
  return "npm";
}

/**
 * Read the raw content of all GitHub Actions workflow files.
 */
function readWorkflowFiles(repoDir: string): Record<string, string> {
  const workflowDir = join(repoDir, ".github", "workflows");
  if (!existsSync(workflowDir)) return {};

  const result: Record<string, string> = {};
  try {
    const files = readdirSync(workflowDir).filter(f => f.endsWith(".yml") || f.endsWith(".yaml"));
    for (const file of files) {
      try {
        result[file] = readFileSync(join(workflowDir, file), "utf8");
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    return {};
  }
  return result;
}

/**
 * Read the scripts section from package.json.
 */
function readPackageScripts(repoDir: string): Record<string, string> | null {
  const pkgPath = join(repoDir, "package.json");
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return pkg.scripts || null;
  } catch {
    return null;
  }
}

/**
 * Inspect the repository's CI configuration and return raw content for the AI
 * to analyze. The AI decides which commands are validation commands.
 * 
 * Returns a structured summary that includes:
 * - Detected package manager
 * - package.json scripts (raw)
 * - GitHub Actions workflow file contents (raw)
 */
export function inspectCIConfiguration(repoDir: string): {
  packageManager: string;
  packageScripts: Record<string, string> | null;
  workflowFiles: Record<string, string>;
  summary: string;
} {
  const packageManager = detectPackageManager(repoDir);
  const packageScripts = readPackageScripts(repoDir);
  const workflowFiles = readWorkflowFiles(repoDir);

  const parts: string[] = [];

  parts.push(`Detected package manager: ${packageManager}`);

  if (packageScripts) {
    const scriptEntries = Object.entries(packageScripts)
      .map(([name, cmd]) => `  - ${name}: ${cmd}`)
      .join("\n");
    parts.push(`package.json scripts:\n${scriptEntries}`);
  } else {
    parts.push("No package.json scripts found.");
  }

  if (Object.keys(workflowFiles).length > 0) {
    for (const [file, content] of Object.entries(workflowFiles)) {
      parts.push(`--- .github/workflows/${file} ---\n${content}`);
    }
  } else {
    parts.push("No .github/workflows/ files found.");
  }

  const summary = parts.join("\n\n");
  console.log(`[CI INSPECT] Package manager: ${packageManager}, Scripts: ${packageScripts ? Object.keys(packageScripts).length : 0}, Workflow files: ${Object.keys(workflowFiles).length}`);

  return { packageManager, packageScripts, workflowFiles, summary };
}
